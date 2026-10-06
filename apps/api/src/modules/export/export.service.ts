import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../db/drizzle.provider';
import {
  commercialInvoices,
  containers,
  exportCustomers,
  proformaInvoiceItems,
  proformaInvoices,
  shipmentMilestones,
} from '../../db/schema';
import {
  CreateContainerDto,
  CreateExportCustomerDto,
  CreateMilestoneDto,
  CreateProformaDto,
  CreateProformaItemDto,
} from './export.dto';

// Which container status each milestone moves the container to.
const MILESTONE_STATUS = {
  LOADED: 'LOADED',
  GATED_OUT: 'IN_TRANSIT',
  DEPARTED: 'IN_TRANSIT',
  ARRIVED: 'ARRIVED',
  CUSTOMS_CLEARED: 'ARRIVED',
  DELIVERED: 'DELIVERED',
} as const;

// A milestone cannot be recorded before the one preceding it.
const MILESTONE_ORDER = ['LOADED', 'GATED_OUT', 'DEPARTED', 'ARRIVED', 'CUSTOMS_CLEARED', 'DELIVERED'];

@Injectable()
export class ExportService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  private number(prefix: string) {
    return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  // ---- customers
  listCustomers() {
    return this.db.select().from(exportCustomers).orderBy(desc(exportCustomers.createdAt));
  }

  async createCustomer(dto: CreateExportCustomerDto) {
    const [dup] = await this.db.select({ id: exportCustomers.id }).from(exportCustomers).where(eq(exportCustomers.code, dto.code));
    if (dup) throw new ConflictException(`Export customer code ${dto.code} already exists`);
    const [row] = await this.db.insert(exportCustomers).values(dto).returning();
    return row;
  }

  // ---- proforma
  listProformas() {
    return this.db.select().from(proformaInvoices).orderBy(desc(proformaInvoices.createdAt));
  }

  async findProforma(id: string) {
    const [row] = await this.db.select().from(proformaInvoices).where(eq(proformaInvoices.id, id));
    if (!row) throw new NotFoundException(`Proforma invoice ${id} not found`);
    return row;
  }

  async createProforma(dto: CreateProformaDto) {
    const [customer] = await this.db.select().from(exportCustomers).where(eq(exportCustomers.id, dto.exportCustomerId));
    if (!customer) throw new NotFoundException(`Export customer ${dto.exportCustomerId} not found`);
    const [row] = await this.db
      .insert(proformaInvoices)
      .values({ invoiceNumber: this.number('PI'), exportCustomerId: dto.exportCustomerId, currency: (dto.currency ?? 'USD').toUpperCase() })
      .returning();
    return row;
  }

  listProformaItems(id: string) {
    return this.db.select().from(proformaInvoiceItems).where(eq(proformaInvoiceItems.proformaInvoiceId, id));
  }

  async addProformaItem(id: string, dto: CreateProformaItemDto) {
    const pi = await this.findProforma(id);
    if (pi.status !== 'DRAFT') throw new ConflictException(`Proforma ${id} is "${pi.status}", not DRAFT — cannot add items`);
    const [item] = await this.db
      .insert(proformaInvoiceItems)
      .values({
        proformaInvoiceId: id,
        productId: dto.productId,
        quantity: dto.quantity.toString(),
        unitPrice: dto.unitPrice.toString(),
        lineTotal: (dto.quantity * dto.unitPrice).toFixed(2),
      })
      .returning();
    const [{ total }] = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${proformaInvoiceItems.lineTotal}), 0)` })
      .from(proformaInvoiceItems)
      .where(eq(proformaInvoiceItems.proformaInvoiceId, id));
    await this.db.update(proformaInvoices).set({ totalAmount: total, updatedAt: new Date() }).where(eq(proformaInvoices.id, id));
    return item;
  }

  async issueProforma(id: string) {
    const pi = await this.findProforma(id);
    if (pi.status !== 'DRAFT') throw new ConflictException(`Proforma ${id} is "${pi.status}", not DRAFT`);
    const items = await this.listProformaItems(id);
    if (items.length === 0) throw new BadRequestException(`Proforma ${id} has no line items — cannot issue`);
    const [row] = await this.db.update(proformaInvoices).set({ status: 'ISSUED', updatedAt: new Date() }).where(eq(proformaInvoices.id, id)).returning();
    return row;
  }

  async cancelProforma(id: string) {
    const pi = await this.findProforma(id);
    if (pi.status === 'CONVERTED' || pi.status === 'CANCELLED') throw new ConflictException(`Proforma ${id} is "${pi.status}" — cannot cancel`);
    const [row] = await this.db.update(proformaInvoices).set({ status: 'CANCELLED', updatedAt: new Date() }).where(eq(proformaInvoices.id, id)).returning();
    return row;
  }

  // ---- commercial invoice
  listCommercialInvoices() {
    return this.db.select().from(commercialInvoices).orderBy(desc(commercialInvoices.issuedAt));
  }

  async findCommercialInvoice(id: string) {
    const [row] = await this.db.select().from(commercialInvoices).where(eq(commercialInvoices.id, id));
    if (!row) throw new NotFoundException(`Commercial invoice ${id} not found`);
    return row;
  }

  /** Converts an ISSUED proforma: the proforma becomes CONVERTED so it can't be invoiced twice. */
  async convertProforma(proformaId: string) {
    const pi = await this.findProforma(proformaId);
    if (pi.status !== 'ISSUED') throw new ConflictException(`Proforma ${proformaId} is "${pi.status}", not ISSUED — only an issued proforma can be converted`);
    const [invoice] = await this.db
      .insert(commercialInvoices)
      .values({
        invoiceNumber: this.number('CI'),
        proformaInvoiceId: pi.id,
        exportCustomerId: pi.exportCustomerId,
        currency: pi.currency,
        totalAmount: pi.totalAmount,
      })
      .returning();
    await this.db.update(proformaInvoices).set({ status: 'CONVERTED', updatedAt: new Date() }).where(eq(proformaInvoices.id, pi.id));
    return invoice;
  }

  async markCommercialPaid(id: string) {
    const inv = await this.findCommercialInvoice(id);
    if (inv.status !== 'ISSUED') throw new ConflictException(`Commercial invoice ${id} is "${inv.status}", not ISSUED`);
    const [row] = await this.db.update(commercialInvoices).set({ status: 'PAID', paidAt: new Date() }).where(eq(commercialInvoices.id, id)).returning();
    return row;
  }

  // ---- containers & milestones
  listContainers() {
    return this.db.select().from(containers).orderBy(desc(containers.createdAt));
  }

  async findContainer(id: string) {
    const [row] = await this.db.select().from(containers).where(eq(containers.id, id));
    if (!row) throw new NotFoundException(`Container ${id} not found`);
    return row;
  }

  async createContainer(dto: CreateContainerDto) {
    const inv = await this.findCommercialInvoice(dto.commercialInvoiceId);
    if (inv.status === 'CANCELLED') throw new ConflictException(`Commercial invoice ${inv.id} is CANCELLED — cannot book a container against it`);
    const [dup] = await this.db.select({ id: containers.id }).from(containers).where(eq(containers.containerNumber, dto.containerNumber));
    if (dup) throw new ConflictException(`Container number ${dto.containerNumber} already exists`);
    const [row] = await this.db.insert(containers).values(dto).returning();
    return row;
  }

  listMilestones(containerId: string) {
    return this.db.select().from(shipmentMilestones).where(eq(shipmentMilestones.containerId, containerId)).orderBy(asc(shipmentMilestones.occurredAt));
  }

  async addMilestone(containerId: string, dto: CreateMilestoneDto) {
    const container = await this.findContainer(containerId);
    if (container.status === 'DELIVERED' || container.status === 'CANCELLED') {
      throw new ConflictException(`Container ${containerId} is "${container.status}" — no further milestones can be recorded`);
    }
    const existing = await this.listMilestones(containerId);
    const reached = existing.length ? Math.max(...existing.map((m) => MILESTONE_ORDER.indexOf(m.milestone))) : -1;
    const next = MILESTONE_ORDER.indexOf(dto.milestone);
    if (next <= reached) {
      throw new ConflictException(`Milestone ${dto.milestone} cannot be recorded: the container has already reached ${MILESTONE_ORDER[reached]}`);
    }
    const [row] = await this.db.insert(shipmentMilestones).values({ containerId, milestone: dto.milestone, notes: dto.notes }).returning();
    await this.db.update(containers).set({ status: MILESTONE_STATUS[dto.milestone], updatedAt: new Date() }).where(eq(containers.id, containerId));
    return row;
  }
}
