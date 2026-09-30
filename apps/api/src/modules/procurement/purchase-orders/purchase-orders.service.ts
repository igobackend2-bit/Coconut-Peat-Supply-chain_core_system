import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../../db/drizzle.provider';
import { approvals, purchaseOrders } from '../../../db/schema';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { DecidePurchaseOrderDto } from './dto/decide-purchase-order.dto';

/**
 * PO approval threshold — MASTER_PROMPT.md §18's example is "PO >
 * ₹1,00,000 → Manager Approval". Hardcoded for now; a real
 * configuration mechanism belongs in docs/configuration.md's
 * "Approval policy configuration" TODO, not improvised here.
 */
const PO_APPROVAL_THRESHOLD = 100_000;

@Injectable()
export class PurchaseOrdersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(purchaseOrders);
  }

  async findOne(id: string) {
    const [po] = await this.db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    if (!po) {
      throw new NotFoundException(`Purchase order ${id} not found`);
    }
    return po;
  }

  async create(dto: CreatePurchaseOrderDto, requestedBy: string) {
    const totalAmount = dto.quantity * dto.unitPrice;
    const needsApproval = totalAmount > PO_APPROVAL_THRESHOLD;

    const [po] = await this.db
      .insert(purchaseOrders)
      .values({
        poNumber: this.generatePoNumber(),
        supplierId: dto.supplierId,
        productId: dto.productId,
        quantity: dto.quantity.toString(),
        unitId: dto.unitId,
        unitPrice: dto.unitPrice.toString(),
        totalAmount: totalAmount.toString(),
        status: needsApproval ? 'PENDING_APPROVAL' : 'APPROVED',
      })
      .returning();

    if (needsApproval) {
      await this.db.insert(approvals).values({
        entityType: 'purchase_order',
        entityId: po.id,
        reason: `Total amount ${totalAmount} exceeds approval threshold ${PO_APPROVAL_THRESHOLD}`,
        requestedBy,
      });
    }

    return po;
  }

  async approve(id: string, dto: DecidePurchaseOrderDto, decidedBy: string) {
    return this.decide(id, 'APPROVED', dto, decidedBy);
  }

  async reject(id: string, dto: DecidePurchaseOrderDto, decidedBy: string) {
    return this.decide(id, 'REJECTED', dto, decidedBy);
  }

  private async decide(id: string, decision: 'APPROVED' | 'REJECTED', dto: DecidePurchaseOrderDto, decidedBy: string) {
    const po = await this.findOne(id);
    if (po.status !== 'PENDING_APPROVAL') {
      throw new ConflictException(`Purchase order ${id} is "${po.status}", not awaiting approval`);
    }

    const [approval] = await this.db
      .select()
      .from(approvals)
      .where(and(eq(approvals.entityType, 'purchase_order'), eq(approvals.entityId, id), eq(approvals.status, 'PENDING')));
    if (!approval) {
      throw new BadRequestException(`No pending approval record found for purchase order ${id}`);
    }

    await this.db
      .update(approvals)
      .set({ status: decision, decidedBy, decidedAt: new Date(), decisionReason: dto.reason })
      .where(eq(approvals.id, approval.id));

    const [updated] = await this.db
      .update(purchaseOrders)
      .set({ status: decision, updatedAt: new Date() })
      .where(eq(purchaseOrders.id, id))
      .returning();

    return updated;
  }

  private generatePoNumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = randomBytes(3).toString('hex').toUpperCase();
    return `PO-${datePart}-${randomPart}`;
  }
}
