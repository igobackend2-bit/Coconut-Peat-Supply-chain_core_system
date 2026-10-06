import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { and, eq, ne, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../db/drizzle.provider';
import { customers, salesOrderItems, salesOrders } from '../../db/schema';
import { CreateSalesOrderItemDto } from './dto/create-sales-order-item.dto';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';

@Injectable()
export class SalesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async list() {
    return this.db.select().from(salesOrders);
  }

  async findOne(id: string) {
    const [order] = await this.db.select().from(salesOrders).where(eq(salesOrders.id, id));
    if (!order) {
      throw new NotFoundException(`Sales order ${id} not found`);
    }
    return order;
  }

  async create(dto: CreateSalesOrderDto) {
    const [customer] = await this.db.select().from(customers).where(eq(customers.id, dto.customerId));
    if (!customer) {
      throw new NotFoundException(`Customer ${dto.customerId} not found`);
    }

    const [order] = await this.db
      .insert(salesOrders)
      .values({
        orderNumber: this.generateOrderNumber(),
        customerId: dto.customerId,
      })
      .returning();
    return order;
  }

  async listItems(orderId: string) {
    return this.db.select().from(salesOrderItems).where(eq(salesOrderItems.salesOrderId, orderId));
  }

  async addItem(orderId: string, dto: CreateSalesOrderItemDto) {
    const order = await this.findOne(orderId);
    if (order.status !== 'DRAFT') {
      throw new ConflictException(`Sales order ${orderId} is "${order.status}", not DRAFT — cannot add items`);
    }

    const lineTotal = dto.quantity * dto.unitPrice;
    const [item] = await this.db
      .insert(salesOrderItems)
      .values({
        salesOrderId: orderId,
        productId: dto.productId,
        quantity: dto.quantity.toString(),
        unitPrice: dto.unitPrice.toString(),
        lineTotal: lineTotal.toString(),
      })
      .returning();

    await this.recomputeTotal(orderId);
    return item;
  }

  private async recomputeTotal(orderId: string) {
    const [{ total }] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${salesOrderItems.lineTotal}), 0)` })
      .from(salesOrderItems)
      .where(eq(salesOrderItems.salesOrderId, orderId));

    await this.db.update(salesOrders).set({ totalAmount: total, updatedAt: new Date() }).where(eq(salesOrders.id, orderId));
  }

  /**
   * Credit limit is checked here, not on create() or addItem() — a
   * DRAFT order can be built up freely; the customer's total exposure
   * (this order's total + their other CONFIRMED orders) is only
   * validated at the commitment point. A null credit_limit means the
   * customer has no cap configured, so nothing is enforced (matches
   * master-data.schema.ts: not every customer has one set).
   */
  async confirm(orderId: string) {
    const order = await this.findOne(orderId);
    if (order.status !== 'DRAFT') {
      throw new ConflictException(`Sales order ${orderId} is "${order.status}", not DRAFT — cannot confirm`);
    }

    const items = await this.listItems(orderId);
    if (items.length === 0) {
      throw new BadRequestException(`Sales order ${orderId} has no line items — cannot confirm`);
    }

    const [customer] = await this.db.select().from(customers).where(eq(customers.id, order.customerId));
    if (customer?.creditLimit != null) {
      const [{ confirmedTotal }] = await this.db
        .select({ confirmedTotal: sql<string>`COALESCE(SUM(${salesOrders.totalAmount}), 0)` })
        .from(salesOrders)
        .where(and(eq(salesOrders.customerId, order.customerId), eq(salesOrders.status, 'CONFIRMED'), ne(salesOrders.id, orderId)));

      const projectedExposure = Number(confirmedTotal) + Number(order.totalAmount);
      if (projectedExposure > Number(customer.creditLimit)) {
        throw new ConflictException(
          `Confirming sales order ${orderId} would bring customer ${customer.code}'s exposure to ${projectedExposure.toFixed(2)}, exceeding their credit limit of ${customer.creditLimit}`,
        );
      }
    }

    const [updated] = await this.db
      .update(salesOrders)
      .set({ status: 'CONFIRMED', updatedAt: new Date() })
      .where(eq(salesOrders.id, orderId))
      .returning();
    return updated;
  }

  async cancel(orderId: string) {
    const order = await this.findOne(orderId);
    if (order.status === 'CANCELLED') {
      throw new ConflictException(`Sales order ${orderId} is already CANCELLED`);
    }

    const [updated] = await this.db
      .update(salesOrders)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(salesOrders.id, orderId))
      .returning();
    return updated;
  }

  private generateOrderNumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = randomBytes(3).toString('hex').toUpperCase();
    return `SO-${datePart}-${randomPart}`;
  }
}
