import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { goodsReceipts, purchaseOrders, rawMaterialLots, stockLedger } from '../../../db/schema';
import { CreateRawMaterialLotDto } from './dto/create-raw-material-lot.dto';

@Injectable()
export class RawMaterialLotsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(rawMaterialLots);
  }

  async findOne(id: string) {
    const [lot] = await this.db.select().from(rawMaterialLots).where(eq(rawMaterialLots.id, id));
    if (!lot) {
      throw new NotFoundException(`Raw material lot ${id} not found`);
    }
    return lot;
  }

  /**
   * productId/supplierId are deliberately NOT accepted from the client —
   * they're derived from the Goods Receipt's Purchase Order, so a lot's
   * recorded supplier/product can never drift from what was actually
   * ordered and received (the whole point of the traceability chain in
   * product-requirements.md §1).
   *
   * Also writes a stock_ledger RAW_MATERIAL_RECEIPT entry (Phase 4) —
   * found by live-testing the Production retrofit: without this, the
   * ledger only ever debited raw materials (via consumption) and never
   * credited them on receipt, so any consumed raw material showed a
   * permanently negative computed balance. Caught before being left as
   * a silent correctness gap.
   */
  async createFromGoodsReceipt(dto: CreateRawMaterialLotDto) {
    const [receipt] = await this.db.select().from(goodsReceipts).where(eq(goodsReceipts.id, dto.goodsReceiptId));
    if (!receipt) {
      throw new NotFoundException(`Goods receipt ${dto.goodsReceiptId} not found`);
    }

    const existingLot = await this.db
      .select({ id: rawMaterialLots.id })
      .from(rawMaterialLots)
      .where(eq(rawMaterialLots.goodsReceiptId, dto.goodsReceiptId));
    if (existingLot.length > 0) {
      throw new ConflictException(`Goods receipt ${dto.goodsReceiptId} already has a raw material lot`);
    }

    const [po] = await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, receipt.purchaseOrderId));
    if (!po) {
      throw new NotFoundException(`Purchase order for goods receipt ${dto.goodsReceiptId} not found`);
    }

    const [lot] = await this.db
      .insert(rawMaterialLots)
      .values({
        lotNumber: this.generateLotNumber(),
        productId: po.productId,
        supplierId: po.supplierId,
        goodsReceiptId: dto.goodsReceiptId,
        quantityKg: dto.quantityKg.toString(),
        moistureContentPercent: dto.moistureContentPercent?.toString(),
        storageLocationId: dto.storageLocationId,
      })
      .returning();

    await this.db.insert(stockLedger).values({
      productId: po.productId,
      locationId: dto.storageLocationId,
      movementType: 'RAW_MATERIAL_RECEIPT',
      quantityKg: dto.quantityKg.toString(),
      referenceType: 'raw_material_lot',
      referenceId: lot.id,
    });

    return lot;
  }

  private generateLotNumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = randomBytes(3).toString('hex').toUpperCase();
    return `RM-LOT-${datePart}-${randomPart}`;
  }
}
