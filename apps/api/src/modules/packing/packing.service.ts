import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../db/drizzle.provider';
import { packingLots, packingOrders, productionBatches } from '../../db/schema';
import { CreatePackingLotDto } from './dto/create-packing-lot.dto';
import { CreatePackingOrderDto } from './dto/create-packing-order.dto';

@Injectable()
export class PackingService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(packingOrders);
  }

  async findOne(id: string) {
    const [order] = await this.db.select().from(packingOrders).where(eq(packingOrders.id, id));
    if (!order) {
      throw new NotFoundException(`Packing order ${id} not found`);
    }
    return order;
  }

  /**
   * A production batch must be RELEASED before it can be packed —
   * packing what hasn't cleared QC would defeat the whole Quality gate
   * built in Phase 3. This is a real domain rule, not a placeholder
   * check.
   */
  async create(dto: CreatePackingOrderDto) {
    const [batch] = await this.db.select().from(productionBatches).where(eq(productionBatches.id, dto.productionBatchId));
    if (!batch) {
      throw new NotFoundException(`Production batch ${dto.productionBatchId} not found`);
    }
    if (batch.status !== 'RELEASED') {
      throw new ConflictException(`Production batch ${dto.productionBatchId} is "${batch.status}", not RELEASED — cannot create a packing order against it`);
    }

    const [order] = await this.db
      .insert(packingOrders)
      .values({
        productionBatchId: dto.productionBatchId,
        packagingTypeId: dto.packagingTypeId,
        plannedQuantityUnits: dto.plannedQuantityUnits?.toString(),
      })
      .returning();
    return order;
  }

  async listLots(orderId: string) {
    return this.db.select().from(packingLots).where(eq(packingLots.packingOrderId, orderId));
  }

  async addLot(orderId: string, dto: CreatePackingLotDto) {
    const order = await this.findOne(orderId);
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new ConflictException(`Packing order ${orderId} is "${order.status}" — cannot add lots`);
    }

    const [lot] = await this.db
      .insert(packingLots)
      .values({
        packingOrderId: orderId,
        lotNumber: this.generateLotNumber(),
        productId: dto.productId,
        quantityUnits: dto.quantityUnits.toString(),
        netWeightKg: dto.netWeightKg?.toString(),
      })
      .returning();

    if (order.status === 'PENDING') {
      await this.db.update(packingOrders).set({ status: 'IN_PROGRESS', updatedAt: new Date() }).where(eq(packingOrders.id, orderId));
    }

    return lot;
  }

  async complete(orderId: string) {
    const order = await this.findOne(orderId);
    if (order.status !== 'IN_PROGRESS') {
      throw new ConflictException(`Packing order ${orderId} is "${order.status}", not IN_PROGRESS — must have at least one lot recorded to complete`);
    }

    const [updated] = await this.db
      .update(packingOrders)
      .set({ status: 'COMPLETED', updatedAt: new Date() })
      .where(eq(packingOrders.id, orderId))
      .returning();
    return updated;
  }

  private generateLotNumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = randomBytes(3).toString('hex').toUpperCase();
    return `PKG-${datePart}-${randomPart}`;
  }
}
