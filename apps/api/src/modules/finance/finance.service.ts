import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../db/drizzle.provider';
import {
  batchInputs,
  batchOutputs,
  costCentres,
  customers,
  expenses,
  goodsReceipts,
  labourAllocations,
  payments,
  productionBatches,
  purchaseOrders,
  rawMaterialLots,
  salesOrders,
} from '../../db/schema';
import { CreateCostCentreDto, CreateExpenseDto, CreatePaymentDto, DecideExpenseDto } from './finance.dto';

const num = (v: unknown) => Number(v ?? 0);
const ref = (p: string) => `${p}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(3).toString('hex').toUpperCase()}`;

@Injectable()
export class FinanceService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  // ---- cost centres
  listCostCentres() { return this.db.select().from(costCentres).orderBy(costCentres.code); }

  async createCostCentre(dto: CreateCostCentreDto) {
    const [dup] = await this.db.select({ id: costCentres.id }).from(costCentres).where(eq(costCentres.code, dto.code));
    if (dup) throw new ConflictException(`Cost centre code ${dto.code} already exists`);
    const [row] = await this.db.insert(costCentres).values(dto).returning();
    return row;
  }

  // ---- expenses
  listExpenses() { return this.db.select().from(expenses).orderBy(desc(expenses.createdAt)); }

  async submitExpense(dto: CreateExpenseDto, userId: string) {
    const [row] = await this.db
      .insert(expenses)
      .values({ ...dto, amount: dto.amount.toFixed(2), expenseNumber: ref('EXP'), submittedBy: userId })
      .returning();
    return row;
  }

  /** Segregation of duties (docs/agents.md A11): the submitter cannot decide their own expense. */
  private async decide(id: string, decision: 'APPROVED' | 'REJECTED', dto: DecideExpenseDto, userId: string) {
    const [e] = await this.db.select().from(expenses).where(eq(expenses.id, id));
    if (!e) throw new NotFoundException(`Expense ${id} not found`);
    if (e.status !== 'SUBMITTED') throw new ConflictException(`Expense ${id} is "${e.status}", not SUBMITTED`);
    if (e.submittedBy === userId) throw new ForbiddenException('Segregation of duties: you cannot approve or reject an expense you submitted');
    const [row] = await this.db
      .update(expenses)
      .set({ status: decision, decidedBy: userId, decidedAt: new Date(), decisionReason: dto.reason })
      .where(eq(expenses.id, id))
      .returning();
    return row;
  }
  approveExpense(id: string, dto: DecideExpenseDto, userId: string) { return this.decide(id, 'APPROVED', dto, userId); }
  rejectExpense(id: string, dto: DecideExpenseDto, userId: string) { return this.decide(id, 'REJECTED', dto, userId); }

  // ---- payments
  listPayments() { return this.db.select().from(payments).orderBy(desc(payments.paidAt)); }

  private async received(salesOrderId: string) {
    const [r] = await this.db
      .select({ s: sql<string>`COALESCE(SUM(${payments.amount}),0)` })
      .from(payments)
      .where(sql`${payments.salesOrderId} = ${salesOrderId} AND ${payments.direction} = 'INCOMING'`);
    return num(r.s);
  }

  private async paid(purchaseOrderId: string) {
    const [r] = await this.db
      .select({ s: sql<string>`COALESCE(SUM(${payments.amount}),0)` })
      .from(payments)
      .where(sql`${payments.purchaseOrderId} = ${purchaseOrderId} AND ${payments.direction} = 'OUTGOING'`);
    return num(r.s);
  }

  async recordPayment(dto: CreatePaymentDto, userId: string) {
    let outstanding: number;
    if (dto.direction === 'INCOMING') {
      if (!dto.salesOrderId || dto.purchaseOrderId) throw new BadRequestException('An INCOMING payment must reference a salesOrderId (and no purchaseOrderId)');
      const [so] = await this.db.select().from(salesOrders).where(eq(salesOrders.id, dto.salesOrderId));
      if (!so) throw new NotFoundException(`Sales order ${dto.salesOrderId} not found`);
      if (so.status !== 'CONFIRMED') throw new ConflictException(`Sales order ${so.id} is "${so.status}" — payments can only be recorded against CONFIRMED orders`);
      outstanding = num(so.totalAmount) - (await this.received(so.id));
    } else {
      if (!dto.purchaseOrderId || dto.salesOrderId) throw new BadRequestException('An OUTGOING payment must reference a purchaseOrderId (and no salesOrderId)');
      const [po] = await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, dto.purchaseOrderId));
      if (!po) throw new NotFoundException(`Purchase order ${dto.purchaseOrderId} not found`);
      if (po.status === 'DRAFT' || po.status === 'PENDING_APPROVAL' || po.status === 'REJECTED' || po.status === 'CANCELLED') {
        throw new ConflictException(`Purchase order ${po.id} is "${po.status}" — payments can only be recorded against approved orders`);
      }
      outstanding = num(po.totalAmount) - (await this.paid(po.id));
    }
    if (dto.amount > outstanding + 0.005) {
      throw new ConflictException(`Payment of ${dto.amount.toFixed(2)} exceeds the outstanding amount of ${outstanding.toFixed(2)}`);
    }
    const [row] = await this.db
      .insert(payments)
      .values({
        paymentNumber: ref('PAY'),
        direction: dto.direction,
        salesOrderId: dto.salesOrderId,
        purchaseOrderId: dto.purchaseOrderId,
        amount: dto.amount.toFixed(2),
        method: dto.method ?? 'BANK_TRANSFER',
        reference: dto.reference,
        recordedBy: userId,
      })
      .returning();
    return row;
  }

  // ---- computed views
  /** Confirmed sales orders with amount received and outstanding, plus per-customer exposure vs credit limit. */
  async receivables() {
    const orders = await this.db.select().from(salesOrders).where(eq(salesOrders.status, 'CONFIRMED'));
    const custs = await this.db.select().from(customers);
    const rows: { salesOrderId: string; orderNumber: string; customerId: string; total: number; received: number; outstanding: number }[] = [];
    for (const o of orders) {
      const received = await this.received(o.id);
      rows.push({
        salesOrderId: o.id,
        orderNumber: o.orderNumber,
        customerId: o.customerId,
        total: num(o.totalAmount),
        received,
        outstanding: +(num(o.totalAmount) - received).toFixed(2),
      });
    }
    const byCustomer = custs
      .map((c) => {
        const mine = rows.filter((r) => r.customerId === c.id);
        return {
          customerId: c.id,
          code: c.code,
          name: c.name,
          creditLimit: c.creditLimit == null ? null : num(c.creditLimit),
          outstanding: +mine.reduce((s, r) => s + r.outstanding, 0).toFixed(2),
        };
      })
      .filter((c) => c.outstanding > 0 || rows.some((r) => r.customerId === c.customerId));
    return { orders: rows, byCustomer, totalOutstanding: +rows.reduce((s, r) => s + r.outstanding, 0).toFixed(2) };
  }

  async payables() {
    const orders = await this.db
      .select()
      .from(purchaseOrders)
      .where(inArray(purchaseOrders.status, ['APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED']));
    const rows: { purchaseOrderId: string; poNumber: string; supplierId: string; total: number; paid: number; outstanding: number }[] = [];
    for (const o of orders) {
      const paid = await this.paid(o.id);
      rows.push({
        purchaseOrderId: o.id,
        poNumber: o.poNumber,
        supplierId: o.supplierId,
        total: num(o.totalAmount),
        paid,
        outstanding: +(num(o.totalAmount) - paid).toFixed(2),
      });
    }
    return { orders: rows, totalOutstanding: +rows.reduce((s, r) => s + r.outstanding, 0).toFixed(2) };
  }

  /**
   * Material-only batch cost: each consumed lot costs
   * quantity_consumed_kg × the unit price on the purchase order the lot
   * came from (lot → goods receipt → PO). ASSUMPTION: PO unit price is
   * per kg for raw material orders. Labour hours are reported but NOT
   * costed (no wage data exists), so this understates true cost.
   */
  async batchCost(batchId: string) {
    const [batch] = await this.db.select().from(productionBatches).where(eq(productionBatches.id, batchId));
    if (!batch) throw new NotFoundException(`Production batch ${batchId} not found`);
    const inputs = await this.db
      .select({
        lotNumber: rawMaterialLots.lotNumber,
        quantityKg: batchInputs.quantityConsumedKg,
        unitPrice: purchaseOrders.unitPrice,
        poNumber: purchaseOrders.poNumber,
      })
      .from(batchInputs)
      .innerJoin(rawMaterialLots, eq(rawMaterialLots.id, batchInputs.rawMaterialLotId))
      .innerJoin(goodsReceipts, eq(goodsReceipts.id, rawMaterialLots.goodsReceiptId))
      .innerJoin(purchaseOrders, eq(purchaseOrders.id, goodsReceipts.purchaseOrderId))
      .where(eq(batchInputs.productionBatchId, batchId));
    const lines = inputs.map((i) => ({ ...i, cost: +(num(i.quantityKg) * num(i.unitPrice)).toFixed(2) }));
    const materialCost = +lines.reduce((s, l) => s + l.cost, 0).toFixed(2);
    const [{ out }] = await this.db
      .select({ out: sql<string>`COALESCE(SUM(${batchOutputs.quantityKg}),0)` })
      .from(batchOutputs)
      .where(eq(batchOutputs.productionBatchId, batchId));
    const [{ hrs }] = await this.db
      .select({ hrs: sql<string>`COALESCE(SUM(${labourAllocations.hours}),0)` })
      .from(labourAllocations)
      .where(eq(labourAllocations.productionBatchId, batchId));
    const outputKg = num(out);
    return {
      batchId,
      batchNumber: batch.batchNumber,
      status: batch.status,
      materialCost,
      outputKg,
      materialCostPerKg: outputKg > 0 ? +(materialCost / outputKg).toFixed(2) : null,
      labourHours: num(hrs),
      costedComponents: ['MATERIAL'],
      notCosted: ['LABOUR', 'MACHINE', 'OVERHEAD', 'PACKAGING'],
      lines,
    };
  }

  async summary() {
    const byCategory = await this.db
      .select({ category: expenses.category, total: sql<string>`SUM(${expenses.amount})`, count: sql<number>`count(*)::int` })
      .from(expenses)
      .where(eq(expenses.status, 'APPROVED'))
      .groupBy(expenses.category);
    const byStatus = await this.db
      .select({ status: expenses.status, count: sql<number>`count(*)::int`, total: sql<string>`SUM(${expenses.amount})` })
      .from(expenses)
      .groupBy(expenses.status);
    return {
      approvedByCategory: byCategory.map((r) => ({ category: r.category, total: num(r.total), count: r.count })),
      expensesByStatus: byStatus.map((r) => ({ status: r.status, total: num(r.total), count: r.count })),
      receivablesOutstanding: (await this.receivables()).totalOutstanding,
      payablesOutstanding: (await this.payables()).totalOutstanding,
    };
  }
}
