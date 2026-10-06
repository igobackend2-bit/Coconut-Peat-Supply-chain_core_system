import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../db/drizzle.provider';
import { dispatchLots, dispatches, packingLots, packingOrders, salesOrderItems, salesOrders } from '../../db/schema';
import { AddDispatchLotDto } from './dto/add-dispatch-lot.dto';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { DeliverDispatchDto } from './dto/deliver-dispatch.dto';

@Injectable()
export class DispatchService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(dispatches);
  }

  async findOne(id: string) {
    const [dispatch] = await this.db.select().from(dispatches).where(eq(dispatches.id, id));
    if (!dispatch) {
      throw new NotFoundException(`Dispatch ${id} not found`);
    }
    return dispatch;
  }

  /**
   * A sales order must be CONFIRMED before it can be dispatched — an
   * unconfirmed order hasn't cleared the credit-limit check, and a
   * cancelled one shouldn't ship at all. Same reasoning as Packing's
   * RELEASED-batch gate.
   */
  async create(dto: CreateDispatchDto) {
    const [order] = await this.db.select().from(salesOrders).where(eq(salesOrders.id, dto.salesOrderId));
    if (!order) {
      throw new NotFoundException(`Sales order ${dto.salesOrderId} not found`);
    }
    if (order.status !== 'CONFIRMED') {
      throw new ConflictException(`Sales order ${dto.salesOrderId} is "${order.status}", not CONFIRMED — cannot dispatch it`);
    }

    const [existing] = await this.db
      .select()
      .from(dispatches)
      .where(and(eq(dispatches.salesOrderId, dto.salesOrderId), ne(dispatches.status, 'CANCELLED')));
    if (existing) {
      throw new ConflictException(`Sales order ${dto.salesOrderId} already has an active dispatch record (${existing.id})`);
    }

    const [dispatch] = await this.db
      .insert(dispatches)
      .values({
        salesOrderId: dto.salesOrderId,
        vehicleId: dto.vehicleId,
        driverId: dto.driverId,
      })
      .returning();
    return dispatch;
  }

  async dispatch(id: string) {
    const record = await this.findOne(id);
    if (record.status !== 'PENDING') {
      throw new ConflictException(`Dispatch ${id} is "${record.status}", not PENDING — cannot dispatch`);
    }

    const [updated] = await this.db
      .update(dispatches)
      .set({ status: 'DISPATCHED', dispatchedAt: new Date(), updatedAt: new Date() })
      .where(eq(dispatches.id, id))
      .returning();
    return updated;
  }

  async deliver(id: string, dto: DeliverDispatchDto) {
    const record = await this.findOne(id);
    if (record.status !== 'DISPATCHED') {
      throw new ConflictException(`Dispatch ${id} is "${record.status}", not DISPATCHED — cannot mark delivered`);
    }

    const [updated] = await this.db
      .update(dispatches)
      .set({ status: 'DELIVERED', deliveredAt: new Date(), deliveryNotes: dto.deliveryNotes, updatedAt: new Date() })
      .where(eq(dispatches.id, id))
      .returning();
    return updated;
  }

  async cancel(id: string) {
    const record = await this.findOne(id);
    if (record.status === 'DELIVERED' || record.status === 'CANCELLED') {
      throw new ConflictException(`Dispatch ${id} is "${record.status}" — cannot cancel`);
    }

    const [updated] = await this.db
      .update(dispatches)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(dispatches.id, id))
      .returning();
    return updated;
  }

  // ---- lots: what physically ships on this dispatch

  async listLots(dispatchId: string) {
    await this.findOne(dispatchId);
    return this.db
      .select({
        id: dispatchLots.id,
        packingLotId: packingLots.id,
        lotNumber: packingLots.lotNumber,
        productId: packingLots.productId,
        quantityUnits: packingLots.quantityUnits,
        netWeightKg: packingLots.netWeightKg,
        addedAt: dispatchLots.addedAt,
      })
      .from(dispatchLots)
      .innerJoin(packingLots, eq(packingLots.id, dispatchLots.packingLotId))
      .where(eq(dispatchLots.dispatchId, dispatchId));
  }

  /** Ids of lots currently committed to a live (non-cancelled) dispatch. */
  private async lotsOnActiveDispatches(): Promise<Set<string>> {
    const rows = await this.db
      .select({ id: dispatchLots.packingLotId })
      .from(dispatchLots)
      .innerJoin(dispatches, eq(dispatches.id, dispatchLots.dispatchId))
      .where(ne(dispatches.status, 'CANCELLED'));
    return new Set(rows.map((r) => r.id));
  }

  /**
   * Lots that could go on this dispatch: from a COMPLETED packing order, not
   * QC-FAILED, of a product that is actually on the sales order, and not
   * already on another live dispatch.
   */
  async availableLots(dispatchId: string) {
    const dispatch = await this.findOne(dispatchId);
    const orderProducts = await this.db
      .select({ id: salesOrderItems.productId })
      .from(salesOrderItems)
      .where(eq(salesOrderItems.salesOrderId, dispatch.salesOrderId));
    if (orderProducts.length === 0) return [];
    const taken = await this.lotsOnActiveDispatches();
    const rows = await this.db
      .select({
        id: packingLots.id,
        lotNumber: packingLots.lotNumber,
        productId: packingLots.productId,
        quantityUnits: packingLots.quantityUnits,
        qcStatus: packingLots.qcStatus,
      })
      .from(packingLots)
      .innerJoin(packingOrders, eq(packingOrders.id, packingLots.packingOrderId))
      .where(
        and(
          eq(packingOrders.status, 'COMPLETED'),
          ne(packingLots.qcStatus, 'FAILED'),
          inArray(packingLots.productId, orderProducts.map((p) => p.id)),
        ),
      );
    return rows.filter((r) => !taken.has(r.id));
  }

  async addLot(dispatchId: string, dto: AddDispatchLotDto) {
    const dispatch = await this.findOne(dispatchId);
    if (dispatch.status !== 'PENDING') {
      throw new ConflictException(`Dispatch ${dispatchId} is "${dispatch.status}" — lots can only be changed while it is PENDING`);
    }
    const [lot] = await this.db
      .select({ id: packingLots.id, lotNumber: packingLots.lotNumber, productId: packingLots.productId, qcStatus: packingLots.qcStatus, orderStatus: packingOrders.status })
      .from(packingLots)
      .innerJoin(packingOrders, eq(packingOrders.id, packingLots.packingOrderId))
      .where(eq(packingLots.id, dto.packingLotId));
    if (!lot) throw new NotFoundException(`Packing lot ${dto.packingLotId} not found`);
    if (lot.orderStatus !== 'COMPLETED') {
      throw new ConflictException(`Lot ${lot.lotNumber} belongs to a packing order that is "${lot.orderStatus}", not COMPLETED`);
    }
    if (lot.qcStatus === 'FAILED') throw new ConflictException(`Lot ${lot.lotNumber} failed QC and cannot be shipped`);

    const [onOrder] = await this.db
      .select({ id: salesOrderItems.id })
      .from(salesOrderItems)
      .where(and(eq(salesOrderItems.salesOrderId, dispatch.salesOrderId), eq(salesOrderItems.productId, lot.productId)));
    if (!onOrder) throw new ConflictException(`Lot ${lot.lotNumber} is a product that is not on this sales order`);

    if ((await this.lotsOnActiveDispatches()).has(lot.id)) {
      throw new ConflictException(`Lot ${lot.lotNumber} is already on an active dispatch`);
    }
    const [row] = await this.db.insert(dispatchLots).values({ dispatchId, packingLotId: lot.id }).returning();
    return row;
  }

  async removeLot(dispatchId: string, packingLotId: string) {
    const dispatch = await this.findOne(dispatchId);
    if (dispatch.status !== 'PENDING') {
      throw new ConflictException(`Dispatch ${dispatchId} is "${dispatch.status}" — lots can only be changed while it is PENDING`);
    }
    const removed = await this.db
      .delete(dispatchLots)
      .where(and(eq(dispatchLots.dispatchId, dispatchId), eq(dispatchLots.packingLotId, packingLotId)))
      .returning({ id: dispatchLots.id });
    if (removed.length === 0) throw new NotFoundException('That lot is not on this dispatch');
    return { dispatchId, packingLotId };
  }
}
