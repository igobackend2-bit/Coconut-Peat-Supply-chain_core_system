import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { goodsReceipts, purchaseOrders, weighments } from '../../../db/schema';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';

@Injectable()
export class GoodsReceiptsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(goodsReceipts);
  }

  async findOne(id: string) {
    const [receipt] = await this.db.select().from(goodsReceipts).where(eq(goodsReceipts.id, id));
    if (!receipt) {
      throw new NotFoundException(`Goods receipt ${id} not found`);
    }
    return receipt;
  }

  /**
   * Phase 2 scope simplification: one goods receipt fully receives its
   * PO (status -> RECEIVED). Partial receipts (PO.status ->
   * PARTIALLY_RECEIVED, multiple receipts per PO) are a real future
   * requirement (the enum already has PARTIALLY_RECEIVED) but are not
   * implemented yet — documented here rather than silently assumed away.
   */
  async create(dto: CreateGoodsReceiptDto) {
    const [po] = await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, dto.purchaseOrderId));
    if (!po) {
      throw new NotFoundException(`Purchase order ${dto.purchaseOrderId} not found`);
    }
    if (po.status !== 'APPROVED') {
      throw new ConflictException(`Purchase order ${dto.purchaseOrderId} is "${po.status}", not APPROVED — cannot receive against it`);
    }

    if (dto.weighmentId) {
      const [weighment] = await this.db.select().from(weighments).where(eq(weighments.id, dto.weighmentId));
      if (!weighment) {
        throw new NotFoundException(`Weighment ${dto.weighmentId} not found`);
      }
    }

    const [receipt] = await this.db
      .insert(goodsReceipts)
      .values({
        grnNumber: this.generateGrnNumber(),
        purchaseOrderId: dto.purchaseOrderId,
        weighmentId: dto.weighmentId,
        receivedQuantity: dto.receivedQuantity.toString(),
      })
      .returning();

    await this.db
      .update(purchaseOrders)
      .set({ status: 'RECEIVED', updatedAt: new Date() })
      .where(eq(purchaseOrders.id, dto.purchaseOrderId));

    return receipt;
  }

  private generateGrnNumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = randomBytes(3).toString('hex').toUpperCase();
    return `GRN-${datePart}-${randomPart}`;
  }
}
