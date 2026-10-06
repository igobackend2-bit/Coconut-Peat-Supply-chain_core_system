import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, lt, ne, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../db/drizzle.provider';
import {
  aiAgents,
  aiFindings,
  aiRuns,
  approvals,
  auditEvents,
  breakdowns,
  dispatches,
  expenses,
  maintenancePlans,
  productionBatches,
  products,
  purchaseOrders,
  salesOrders,
  spareParts,
  stockLedger,
} from '../../db/schema';
import { FinanceService } from '../finance/finance.service';

interface Draft {
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  detail: string;
  entityType?: string;
  entityId?: string;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const todayStr = () => new Date().toISOString().slice(0, 10);

/**
 * Deterministic, rule-based analyzers — NOT an LLM. Each reads current
 * operational data and returns drafts; AiService.run persists them as
 * PROPOSED findings. Nothing here writes to business tables.
 */
@Injectable()
export class AiService {
  private readonly analyzers: Record<string, () => Promise<Draft[]>> = {
    inventory: () => this.inventory(),
    quality: () => this.quality(),
    maintenance: () => this.maintenance(),
    procurement: () => this.procurement(),
    dispatch: () => this.dispatch(),
    finance: () => this.finance(),
    compliance: () => this.compliance(),
    reporting: () => this.reporting(),
  };

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly financeService: FinanceService,
  ) {}

  listAgents() { return this.db.select().from(aiAgents).orderBy(aiAgents.code); }
  listRuns() { return this.db.select().from(aiRuns).orderBy(desc(aiRuns.startedAt)).limit(50); }

  listFindings(status?: string) {
    const q = this.db.select().from(aiFindings);
    return (status ? q.where(eq(aiFindings.status, status as never)) : q).orderBy(desc(aiFindings.createdAt)).limit(200);
  }

  async run(agentId: string, userId: string) {
    const [agent] = await this.db.select().from(aiAgents).where(eq(aiAgents.id, agentId));
    if (!agent) throw new NotFoundException(`AI agent ${agentId} not found`);
    if (agent.status !== 'ENABLED') throw new ConflictException(`Agent ${agent.code} is DISABLED`);
    const analyzer = agent.analyzerKey ? this.analyzers[agent.analyzerKey] : undefined;
    if (!analyzer) throw new ConflictException(`Agent ${agent.code} (${agent.name}) is specified but has no implementation yet`);

    const [run] = await this.db.insert(aiRuns).values({ agentId, triggeredBy: userId, status: 'COMPLETED' }).returning();
    try {
      const drafts = await analyzer();
      let created = 0;
      for (const d of drafts) {
        // Don't re-propose something already awaiting a human decision.
        const dupe = await this.db
          .select({ id: aiFindings.id })
          .from(aiFindings)
          .where(
            and(
              eq(aiFindings.agentId, agentId),
              eq(aiFindings.title, d.title),
              eq(aiFindings.status, 'PROPOSED'),
              d.entityId ? eq(aiFindings.entityId, d.entityId) : sql`${aiFindings.entityId} IS NULL`,
            ),
          );
        if (dupe.length) continue;
        await this.db.insert(aiFindings).values({ runId: run.id, agentId, ...d });
        created++;
      }
      const summary = `${drafts.length} condition(s) detected, ${created} new finding(s) proposed, ${drafts.length - created} already pending`;
      const [done] = await this.db
        .update(aiRuns)
        .set({ summary, findingCount: created, finishedAt: new Date() })
        .where(eq(aiRuns.id, run.id))
        .returning();
      return done;
    } catch (err) {
      const [failed] = await this.db
        .update(aiRuns)
        .set({ status: 'FAILED', error: err instanceof Error ? err.message : String(err), finishedAt: new Date() })
        .where(eq(aiRuns.id, run.id))
        .returning();
      return failed;
    }
  }

  async decide(id: string, decision: 'ACKNOWLEDGED' | 'DISMISSED', userId: string) {
    const [f] = await this.db.select().from(aiFindings).where(eq(aiFindings.id, id));
    if (!f) throw new NotFoundException(`Finding ${id} not found`);
    if (f.status !== 'PROPOSED') throw new ConflictException(`Finding ${id} is already ${f.status}`);
    const [row] = await this.db
      .update(aiFindings)
      .set({ status: decision, decidedBy: userId, decidedAt: new Date() })
      .where(eq(aiFindings.id, id))
      .returning();
    return row;
  }

  // ---------------- analyzers

  private async inventory(): Promise<Draft[]> {
    const rows = await this.db
      .select({ productId: stockLedger.productId, bal: sql<string>`SUM(${stockLedger.quantityKg})` })
      .from(stockLedger)
      .groupBy(stockLedger.productId)
      .having(sql`SUM(${stockLedger.quantityKg}) < 0`);
    const skus = new Map((await this.db.select({ id: products.id, sku: products.sku }).from(products)).map((p) => [p.id, p.sku]));
    return rows.map((r) => ({
      severity: 'CRITICAL' as const,
      title: `Negative stock: ${skus.get(r.productId) ?? r.productId}`,
      detail: `Computed balance is ${Number(r.bal).toFixed(3)} kg. More has been consumed or shipped than was ever received into the ledger — usually a missing receipt or a movement recorded before ledger tracking existed.`,
      entityType: 'product',
      entityId: r.productId,
    }));
  }

  private async quality(): Promise<Draft[]> {
    const held = await this.db.select().from(productionBatches).where(eq(productionBatches.status, 'ON_HOLD'));
    return held.map((b) => ({
      severity: 'WARNING' as const,
      title: `Batch on QC hold: ${b.batchNumber}`,
      detail: 'This batch was automatically placed on hold after an out-of-spec QC result and is waiting for a release/reject decision.',
      entityType: 'production_batch',
      entityId: b.id,
    }));
  }

  private async maintenance(): Promise<Draft[]> {
    const out: Draft[] = [];
    const overdue = await this.db
      .select()
      .from(maintenancePlans)
      .where(and(eq(maintenancePlans.status, 'ACTIVE'), lt(maintenancePlans.nextDueDate, todayStr())));
    for (const p of overdue) {
      const days = Math.floor((Date.now() - new Date(`${p.nextDueDate}T00:00:00Z`).getTime()) / 86_400_000);
      out.push({
        severity: days > 14 ? 'CRITICAL' : 'WARNING',
        title: `Maintenance overdue: ${p.title}`,
        detail: `Planned for ${p.nextDueDate}, ${days} day(s) overdue.`,
        entityType: 'maintenance_plan',
        entityId: p.id,
      });
    }
    const open = await this.db.select().from(breakdowns).where(ne(breakdowns.status, 'RESOLVED'));
    for (const b of open) {
      out.push({
        severity: b.severity === 'CRITICAL' || b.severity === 'HIGH' ? 'CRITICAL' : 'WARNING',
        title: `Open breakdown (${b.severity}): ${b.description.slice(0, 60)}`,
        detail: `Reported ${b.reportedAt.toISOString().slice(0, 10)}, status ${b.status}. The machine stays SUSPENDED until this is resolved.`,
        entityType: 'breakdown',
        entityId: b.id,
      });
    }
    const parts = await this.db.select().from(spareParts);
    for (const sp of parts.filter((p) => p.reorderLevel > 0 && p.quantityOnHand <= p.reorderLevel)) {
      out.push({
        severity: 'WARNING',
        title: `Spare part at reorder level: ${sp.code}`,
        detail: `${sp.quantityOnHand} on hand against a reorder level of ${sp.reorderLevel}.`,
        entityType: 'spare_part',
        entityId: sp.id,
      });
    }
    return out;
  }

  private async procurement(): Promise<Draft[]> {
    const out: Draft[] = [];
    const pending = await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.status, 'PENDING_APPROVAL'));
    for (const po of pending) {
      out.push({
        severity: 'WARNING',
        title: `PO awaiting approval: ${po.poNumber}`,
        detail: `Total ${po.totalAmount} exceeded the approval threshold and has not been decided.`,
        entityType: 'purchase_order',
        entityId: po.id,
      });
    }
    const stale = await this.db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.status, 'APPROVED'),
          lt(purchaseOrders.createdAt, daysAgo(7)),
          sql`NOT EXISTS (SELECT 1 FROM goods_receipts gr WHERE gr.purchase_order_id = ${purchaseOrders.id})`,
        ),
      );
    for (const po of stale) {
      out.push({
        severity: 'INFO',
        title: `Approved PO with no receipt after 7 days: ${po.poNumber}`,
        detail: 'Approved more than a week ago and nothing has been received against it.',
        entityType: 'purchase_order',
        entityId: po.id,
      });
    }
    return out;
  }

  private async dispatch(): Promise<Draft[]> {
    const out: Draft[] = [];
    const waiting = await this.db
      .select()
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.status, 'CONFIRMED'),
          lt(salesOrders.updatedAt, daysAgo(3)),
          sql`NOT EXISTS (SELECT 1 FROM dispatches d WHERE d.sales_order_id = ${salesOrders.id} AND d.status <> 'CANCELLED')`,
        ),
      );
    for (const o of waiting) {
      out.push({
        severity: 'WARNING',
        title: `Confirmed order not dispatched: ${o.orderNumber}`,
        detail: 'Confirmed more than 3 days ago with no active dispatch.',
        entityType: 'sales_order',
        entityId: o.id,
      });
    }
    const stuck = await this.db.select().from(dispatches).where(and(eq(dispatches.status, 'PENDING'), lt(dispatches.createdAt, daysAgo(2))));
    for (const d of stuck) {
      out.push({
        severity: 'WARNING',
        title: 'Dispatch pending for over 2 days',
        detail: 'A dispatch record was created but the vehicle has not been marked as dispatched.',
        entityType: 'dispatch',
        entityId: d.id,
      });
    }
    return out;
  }

  private async finance(): Promise<Draft[]> {
    const out: Draft[] = [];
    const { byCustomer } = await this.financeService.receivables();
    for (const c of byCustomer) {
      if (c.creditLimit != null && c.outstanding > c.creditLimit) {
        out.push({
          severity: 'CRITICAL',
          title: `Customer over credit limit: ${c.code}`,
          detail: `Outstanding ${c.outstanding.toFixed(2)} against a credit limit of ${c.creditLimit.toFixed(2)}.`,
          entityType: 'customer',
          entityId: c.customerId,
        });
      }
    }
    const waiting = await this.db.select().from(expenses).where(and(eq(expenses.status, 'SUBMITTED'), lt(expenses.createdAt, daysAgo(7))));
    for (const e of waiting) {
      out.push({
        severity: 'INFO',
        title: `Expense unapproved after 7 days: ${e.expenseNumber}`,
        detail: `${e.amount} (${e.category}) is still waiting for a decision.`,
        entityType: 'expense',
        entityId: e.id,
      });
    }
    return out;
  }

  private async compliance(): Promise<Draft[]> {
    const out: Draft[] = [];
    const denied = await this.db
      .select({ actorId: auditEvents.actorId, n: sql<number>`count(*)::int` })
      .from(auditEvents)
      .where(and(eq(auditEvents.module, 'SECURITY'), gte(auditEvents.createdAt, daysAgo(1))))
      .groupBy(auditEvents.actorId);
    for (const d of denied.filter((r) => r.n >= 3)) {
      out.push({
        severity: 'WARNING',
        title: `Repeated access denials: ${d.actorId ?? 'unauthenticated caller'}`,
        detail: `${d.n} denied access attempts in the last 24 hours.`,
        entityType: 'user',
        entityId: d.actorId ?? undefined,
      });
    }
    const stale = await this.db.select().from(approvals).where(and(eq(approvals.status, 'PENDING'), lt(approvals.requestedAt, daysAgo(3))));
    for (const a of stale) {
      out.push({
        severity: 'WARNING',
        title: `Approval pending over 3 days (${a.entityType})`,
        detail: a.reason ?? 'An approval request has not been decided.',
        entityType: a.entityType,
        entityId: a.entityId,
      });
    }
    return out;
  }

  private async reporting(): Promise<Draft[]> {
    const day = new Date(`${todayStr()}T00:00:00Z`);
    const count = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
    const confirmed = await count(
      this.db.select({ n: sql<number>`count(*)::int` }).from(salesOrders).where(and(eq(salesOrders.status, 'CONFIRMED'), gte(salesOrders.updatedAt, day))),
    );
    const completed = await count(this.db.select({ n: sql<number>`count(*)::int` }).from(productionBatches).where(gte(productionBatches.completedAt, day)));
    const delivered = await count(
      this.db.select({ n: sql<number>`count(*)::int` }).from(dispatches).where(and(eq(dispatches.status, 'DELIVERED'), gte(dispatches.deliveredAt, day))),
    );
    const open = await count(this.db.select({ n: sql<number>`count(*)::int` }).from(breakdowns).where(ne(breakdowns.status, 'RESOLVED')));
    return [
      {
        severity: 'INFO',
        title: `Daily operations summary ${todayStr()}`,
        detail: `Sales orders confirmed today: ${confirmed}. Production batches completed today: ${completed}. Dispatches delivered today: ${delivered}. Open machine breakdowns: ${open}.`,
      },
    ];
  }
}
