import { index, numeric, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { commercialInvoiceStatusEnum, containerStatusEnum, proformaStatusEnum } from './enums';
import { products } from './master-data.schema';

/**
 * Export domain (architecture.md §3, product-requirements.md §4.12).
 * Flow: export_customer → proforma invoice (DRAFT, items, ISSUED) →
 * commercial invoice (only from an ISSUED proforma, which becomes
 * CONVERTED) → container booking (only against an ISSUED/PAID
 * commercial invoice) → shipment milestones (append-only event trail;
 * each milestone moves the container's status).
 *
 * Kept separate from `customers`/`sales_orders` on purpose: export
 * customers carry a country and are invoiced in a foreign currency.
 * Not modelled yet: HS codes, bill of lading, customs documents, FX
 * rates, and any link from export lines back to production/packing lots
 * (so export traceability stops at the product, not the lot).
 */
export const exportCustomers = pgTable('export_customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  country: text('country').notNull(),
  contactName: text('contact_name'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('export_customers_code_unique').on(t.code),
}));

export const proformaInvoices = pgTable('proforma_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  invoiceNumber: text('invoice_number').notNull(),
  exportCustomerId: uuid('export_customer_id').notNull().references(() => exportCustomers.id),
  currency: text('currency').notNull().default('USD'),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  status: proformaStatusEnum('status').notNull().default('DRAFT'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  numberUnique: unique('proforma_invoices_number_unique').on(t.invoiceNumber),
  customerIdx: index('proforma_invoices_customer_idx').on(t.exportCustomerId),
}));

export const proformaInvoiceItems = pgTable('proforma_invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  proformaInvoiceId: uuid('proforma_invoice_id').notNull().references(() => proformaInvoices.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
  lineTotal: numeric('line_total', { precision: 14, scale: 2 }).notNull(),
}, (t) => ({
  invoiceIdx: index('proforma_invoice_items_invoice_idx').on(t.proformaInvoiceId),
}));

export const commercialInvoices = pgTable('commercial_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  invoiceNumber: text('invoice_number').notNull(),
  proformaInvoiceId: uuid('proforma_invoice_id').notNull().references(() => proformaInvoices.id),
  exportCustomerId: uuid('export_customer_id').notNull().references(() => exportCustomers.id),
  currency: text('currency').notNull(),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
  status: commercialInvoiceStatusEnum('status').notNull().default('ISSUED'),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
}, (t) => ({
  numberUnique: unique('commercial_invoices_number_unique').on(t.invoiceNumber),
  proformaIdx: index('commercial_invoices_proforma_idx').on(t.proformaInvoiceId),
}));

export const containers = pgTable('containers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  containerNumber: text('container_number').notNull(),
  commercialInvoiceId: uuid('commercial_invoice_id').notNull().references(() => commercialInvoices.id),
  sealNumber: text('seal_number'),
  destinationPort: text('destination_port'),
  status: containerStatusEnum('status').notNull().default('BOOKED'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  numberUnique: unique('containers_container_number_unique').on(t.containerNumber),
  invoiceIdx: index('containers_invoice_idx').on(t.commercialInvoiceId),
}));

/** Append-only event trail per container (no UPDATE/DELETE path in the API). */
export const shipmentMilestones = pgTable('shipment_milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  containerId: uuid('container_id').notNull().references(() => containers.id),
  milestone: text('milestone').notNull(),
  notes: text('notes'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  containerIdx: index('shipment_milestones_container_idx').on(t.containerId),
}));

export type ExportCustomer = typeof exportCustomers.$inferSelect;
export type ProformaInvoice = typeof proformaInvoices.$inferSelect;
export type CommercialInvoice = typeof commercialInvoices.$inferSelect;
export type Container = typeof containers.$inferSelect;
