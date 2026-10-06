import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { and, desc, eq, ne, inArray } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../db/drizzle.provider';
import { breakdowns, machines, maintenancePlans, spareParts, workOrders } from '../../db/schema';
import {
  AdjustSparePartDto,
  CreatePlanDto,
  CreateSparePartDto,
  CreateWorkOrderDto,
  ReportBreakdownDto,
  ResolveDto,
} from './maintenance.dto';

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

@Injectable()
export class MaintenanceService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  private async machine(id: string) {
    const [m] = await this.db.select().from(machines).where(eq(machines.id, id));
    if (!m) throw new NotFoundException(`Machine ${id} not found`);
    return m;
  }

  // ---- plans
  listPlans() { return this.db.select().from(maintenancePlans).orderBy(maintenancePlans.nextDueDate); }

  async createPlan(dto: CreatePlanDto) {
    await this.machine(dto.machineId);
    const [row] = await this.db.insert(maintenancePlans).values(dto).returning();
    return row;
  }

  /** At most one open preventive work order per plan. */
  async generateWorkOrder(planId: string) {
    const [plan] = await this.db.select().from(maintenancePlans).where(eq(maintenancePlans.id, planId));
    if (!plan) throw new NotFoundException(`Maintenance plan ${planId} not found`);
    if (plan.status !== 'ACTIVE') throw new ConflictException(`Maintenance plan ${planId} is ${plan.status}`);
    const [open] = await this.db
      .select({ id: workOrders.id })
      .from(workOrders)
      .where(and(eq(workOrders.maintenancePlanId, planId), inArray(workOrders.status, ['OPEN', 'IN_PROGRESS'])));
    if (open) throw new ConflictException(`Plan ${planId} already has an open work order (${open.id})`);
    return this.createWorkOrder({ machineId: plan.machineId, type: 'PREVENTIVE', title: plan.title, maintenancePlanId: planId });
  }

  // ---- breakdowns
  listBreakdowns() { return this.db.select().from(breakdowns).orderBy(desc(breakdowns.reportedAt)); }

  async report(dto: ReportBreakdownDto) {
    await this.machine(dto.machineId);
    const [row] = await this.db
      .insert(breakdowns)
      .values({ machineId: dto.machineId, description: dto.description, severity: dto.severity ?? 'MEDIUM' })
      .returning();
    await this.db.update(machines).set({ status: 'SUSPENDED', updatedAt: new Date() }).where(eq(machines.id, dto.machineId));
    return row;
  }

  async startRepair(id: string) {
    const b = await this.findBreakdown(id);
    if (b.status !== 'OPEN') throw new ConflictException(`Breakdown ${id} is "${b.status}", not OPEN`);
    const [row] = await this.db.update(breakdowns).set({ status: 'IN_REPAIR' }).where(eq(breakdowns.id, id)).returning();
    return row;
  }

  async resolve(id: string, dto: ResolveDto) {
    const b = await this.findBreakdown(id);
    if (b.status === 'RESOLVED') throw new ConflictException(`Breakdown ${id} is already RESOLVED`);
    const [row] = await this.db
      .update(breakdowns)
      .set({ status: 'RESOLVED', resolvedAt: new Date(), resolutionNotes: dto.notes })
      .where(eq(breakdowns.id, id))
      .returning();
    // Restore the machine only when no other unresolved breakdown remains on it.
    const [stillBroken] = await this.db
      .select({ id: breakdowns.id })
      .from(breakdowns)
      .where(and(eq(breakdowns.machineId, b.machineId), ne(breakdowns.status, 'RESOLVED')));
    if (!stillBroken) {
      await this.db.update(machines).set({ status: 'ACTIVE', updatedAt: new Date() }).where(eq(machines.id, b.machineId));
    }
    return row;
  }

  private async findBreakdown(id: string) {
    const [b] = await this.db.select().from(breakdowns).where(eq(breakdowns.id, id));
    if (!b) throw new NotFoundException(`Breakdown ${id} not found`);
    return b;
  }

  // ---- work orders
  listWorkOrders() { return this.db.select().from(workOrders).orderBy(desc(workOrders.createdAt)); }

  async createWorkOrder(dto: CreateWorkOrderDto) {
    await this.machine(dto.machineId);
    if (dto.type === 'PREVENTIVE' && !dto.maintenancePlanId) {
      throw new BadRequestException('A PREVENTIVE work order must reference a maintenancePlanId');
    }
    if (dto.type === 'CORRECTIVE' && !dto.breakdownId) {
      throw new BadRequestException('A CORRECTIVE work order must reference a breakdownId');
    }
    const [row] = await this.db
      .insert(workOrders)
      .values({ ...dto, workOrderNumber: `WO-${today().replace(/-/g, '')}-${randomBytes(3).toString('hex').toUpperCase()}` })
      .returning();
    return row;
  }

  private async findWorkOrder(id: string) {
    const [w] = await this.db.select().from(workOrders).where(eq(workOrders.id, id));
    if (!w) throw new NotFoundException(`Work order ${id} not found`);
    return w;
  }

  async startWorkOrder(id: string) {
    const w = await this.findWorkOrder(id);
    if (w.status !== 'OPEN') throw new ConflictException(`Work order ${id} is "${w.status}", not OPEN`);
    const [row] = await this.db.update(workOrders).set({ status: 'IN_PROGRESS' }).where(eq(workOrders.id, id)).returning();
    if (w.breakdownId) {
      await this.db.update(breakdowns).set({ status: 'IN_REPAIR' }).where(and(eq(breakdowns.id, w.breakdownId), eq(breakdowns.status, 'OPEN')));
    }
    return row;
  }

  /**
   * Completing a PREVENTIVE order pushes its plan's next due date out by
   * frequency_days from today; completing a CORRECTIVE order resolves its
   * linked breakdown (and so may restore the machine to ACTIVE).
   */
  async completeWorkOrder(id: string, dto: ResolveDto) {
    const w = await this.findWorkOrder(id);
    if (w.status !== 'OPEN' && w.status !== 'IN_PROGRESS') throw new ConflictException(`Work order ${id} is "${w.status}" — cannot complete`);
    const [row] = await this.db
      .update(workOrders)
      .set({ status: 'COMPLETED', completedAt: new Date(), notes: dto.notes })
      .where(eq(workOrders.id, id))
      .returning();
    if (w.type === 'PREVENTIVE' && w.maintenancePlanId) {
      const [plan] = await this.db.select().from(maintenancePlans).where(eq(maintenancePlans.id, w.maintenancePlanId));
      if (plan) {
        await this.db.update(maintenancePlans).set({ nextDueDate: addDays(today(), plan.frequencyDays) }).where(eq(maintenancePlans.id, plan.id));
      }
    }
    if (w.type === 'CORRECTIVE' && w.breakdownId) {
      const b = await this.findBreakdown(w.breakdownId);
      if (b.status !== 'RESOLVED') await this.resolve(w.breakdownId, { notes: dto.notes });
    }
    return row;
  }

  async cancelWorkOrder(id: string) {
    const w = await this.findWorkOrder(id);
    if (w.status === 'COMPLETED' || w.status === 'CANCELLED') throw new ConflictException(`Work order ${id} is "${w.status}" — cannot cancel`);
    const [row] = await this.db.update(workOrders).set({ status: 'CANCELLED' }).where(eq(workOrders.id, id)).returning();
    return row;
  }

  // ---- spare parts
  listSpareParts() { return this.db.select().from(spareParts).orderBy(spareParts.code); }

  async createSparePart(dto: CreateSparePartDto) {
    const [dup] = await this.db.select({ id: spareParts.id }).from(spareParts).where(eq(spareParts.code, dto.code));
    if (dup) throw new ConflictException(`Spare part code ${dto.code} already exists`);
    const [row] = await this.db.insert(spareParts).values(dto).returning();
    return row;
  }

  async adjustSparePart(id: string, dto: AdjustSparePartDto) {
    const [p] = await this.db.select().from(spareParts).where(eq(spareParts.id, id));
    if (!p) throw new NotFoundException(`Spare part ${id} not found`);
    const next = p.quantityOnHand + dto.delta;
    if (next < 0) throw new ConflictException(`Adjustment of ${dto.delta} would take ${p.code} below zero (on hand: ${p.quantityOnHand})`);
    const [row] = await this.db.update(spareParts).set({ quantityOnHand: next, updatedAt: new Date() }).where(eq(spareParts.id, id)).returning();
    return row;
  }

  // ---- machine history (a view over breakdowns + work orders, not a table)
  async machineHistory(machineId: string) {
    const m = await this.machine(machineId);
    const [bd, wo] = await Promise.all([
      this.db.select().from(breakdowns).where(eq(breakdowns.machineId, machineId)),
      this.db.select().from(workOrders).where(eq(workOrders.machineId, machineId)),
    ]);
    const events = [
      ...bd.map((b) => ({ kind: 'BREAKDOWN', at: b.reportedAt, title: b.description, status: b.status, severity: b.severity, id: b.id })),
      ...wo.map((w) => ({ kind: `WORK_ORDER_${w.type}`, at: w.createdAt, title: w.title, status: w.status, severity: null, id: w.id })),
    ].sort((a, b) => b.at.getTime() - a.at.getTime());
    return { machine: m, events };
  }
}
