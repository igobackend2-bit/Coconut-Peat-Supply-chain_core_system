import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { entityStatusEnum, productCategoryEnum, qcDataTypeEnum, uomCategoryEnum } from './enums';

/**
 * Master Data domain (architecture.md §3, expanded to match
 * product-requirements.md §4.1's fuller list: raw materials are modeled
 * as products.category = RAW_MATERIAL rather than a separate table,
 * since they share the same identity/UoM/grading shape as finished
 * goods and packaging).
 *
 * `tenant_id` is nullable on every table: multi-tenancy is an open
 * decision (docs/project-state.md), so the column is reserved now to
 * avoid a painful migration later, but nothing enforces it yet.
 *
 * IMPORTANT (found by testing, not theoretical): `code`/`sku` uniqueness
 * is declared as a single-column unique constraint, NOT composite with
 * `tenant_id`. A composite UNIQUE(tenant_id, code) does not work while
 * tenant_id is NULL for every row — Postgres treats NULL as distinct
 * from NULL for uniqueness purposes, so two rows with the same code and
 * both NULL tenant_id would both be accepted (verified: this exact bug
 * was inserted and caught before being left in place). If/when
 * multi-tenancy is decided and tenant_id is populated, these constraints
 * need to become composite (tenant_id, code) — that migration is
 * straightforward for existing single-tenant data (tenant_id would be
 * backfilled to one real value, and a single-column unique constraint's
 * data trivially satisfies a composite one). Doing it the other way
 * around first would have shipped a silently broken constraint.
 *
 * created_by/updated_by are intentionally omitted for v1 — audit_events
 * already captures actor_id per change (docs/actions.md §4); per-row
 * "last touched by" columns can be added later without breaking this
 * schema if a specific module needs them.
 */

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  status: entityStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('departments_code_unique').on(t.code),
}));

export const unitsOfMeasure = pgTable('units_of_measure', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  code: text('code').notNull(), // e.g. kg, pcs, bag, litre
  name: text('name').notNull(),
  category: uomCategoryEnum('category').notNull().default('OTHER'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('uom_code_unique').on(t.code),
}));

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  employeeCode: text('employee_code').notNull(),
  fullName: text('full_name').notNull(),
  departmentId: uuid('department_id').references(() => departments.id),
  designation: text('designation'),
  phone: text('phone'),
  email: text('email'),
  status: entityStatusEnum('status').notNull().default('ACTIVE'),
  joinedAt: timestamp('joined_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('employees_code_unique').on(t.employeeCode),
  departmentIdx: index('employees_department_idx').on(t.departmentId),
}));

export const warehouses = pgTable('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull().default('GENERAL'), // RAW_MATERIAL | FINISHED_GOODS | PACKAGING | GENERAL
  status: entityStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('warehouses_code_unique').on(t.code),
}));

/** A specific storage location, optionally nested under a warehouse (bay, rack, yard, dock). */
export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id),
  code: text('code').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull().default('STORAGE'), // STORAGE | BAY | RACK | YARD | DOCK
  status: entityStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('locations_code_unique').on(t.code),
  warehouseIdx: index('locations_warehouse_idx').on(t.warehouseId),
}));

export const machines = pgTable('machines', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  machineType: text('machine_type'),
  locationId: uuid('location_id').references(() => locations.id),
  capacityPerHour: numeric('capacity_per_hour', { precision: 12, scale: 2 }),
  status: entityStatusEnum('status').notNull().default('ACTIVE'),
  installedAt: timestamp('installed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('machines_code_unique').on(t.code),
  locationIdx: index('machines_location_idx').on(t.locationId),
}));

export const packagingTypes = pgTable('packaging_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  capacityValue: numeric('capacity_value', { precision: 12, scale: 3 }),
  capacityUnitId: uuid('capacity_unit_id').references(() => unitsOfMeasure.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('packaging_types_code_unique').on(t.code),
}));

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  category: productCategoryEnum('category').notNull(),
  baseUnitId: uuid('base_unit_id').references(() => unitsOfMeasure.id),
  hsCode: text('hs_code'), // export/customs classification
  status: entityStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  skuUnique: unique('products_sku_unique').on(t.sku),
  categoryIdx: index('products_category_idx').on(t.category),
}));

export const productGrades = pgTable('product_grades', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  productId: uuid('product_id').notNull().references(() => products.id),
  code: text('code').notNull(), // e.g. GRADE_A, GRADE_B
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('product_grades_product_code_unique').on(t.productId, t.code),
}));

export const qcParameters = pgTable('qc_parameters', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  code: text('code').notNull(), // e.g. PH, EC, MOISTURE, EXPANSION, FIBRE_CONTENT
  name: text('name').notNull(),
  dataType: qcDataTypeEnum('data_type').notNull().default('NUMERIC'),
  unitId: uuid('unit_id').references(() => unitsOfMeasure.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('qc_parameters_code_unique').on(t.code),
}));

/**
 * QC thresholds per product grade, per docs/configuration.md's TODO
 * ("QC parameter/threshold configuration per product/grade"). Backs the
 * grade-specific spec checks referenced in docs/product-requirements.md
 * §4.7 ("QC thresholds must be product/grade specific").
 */
export const productGradeQcSpecs = pgTable('product_grade_qc_specs', {
  id: uuid('id').primaryKey().defaultRandom(),
  productGradeId: uuid('product_grade_id').notNull().references(() => productGrades.id),
  qcParameterId: uuid('qc_parameter_id').notNull().references(() => qcParameters.id),
  minValue: numeric('min_value', { precision: 12, scale: 4 }),
  maxValue: numeric('max_value', { precision: 12, scale: 4 }),
  targetValue: numeric('target_value', { precision: 12, scale: 4 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  gradeParamUnique: unique('product_grade_qc_specs_unique').on(t.productGradeId, t.qcParameterId),
}));

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  gstin: text('gstin'),
  contactName: text('contact_name'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  paymentTermsDays: integer('payment_terms_days'),
  status: entityStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('suppliers_code_unique').on(t.code),
}));

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  gstin: text('gstin'),
  contactName: text('contact_name'),
  phone: text('phone'),
  email: text('email'),
  billingAddress: text('billing_address'),
  shippingAddress: text('shipping_address'),
  creditLimit: numeric('credit_limit', { precision: 14, scale: 2 }),
  status: entityStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('customers_code_unique').on(t.code),
}));

/** Service providers (transport, maintenance, contract labour) — distinct from raw-material suppliers. */
export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  vendorType: text('vendor_type').notNull().default('OTHER'), // TRANSPORT | MAINTENANCE | CONTRACT_LABOUR | OTHER
  contactName: text('contact_name'),
  phone: text('phone'),
  email: text('email'),
  status: entityStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('vendors_code_unique').on(t.code),
}));

export const taxConfigurations = pgTable('tax_configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  code: text('code').notNull(), // e.g. GST_5, GST_12, EXPORT_ZERO_RATED
  name: text('name').notNull(),
  ratePercent: numeric('rate_percent', { precision: 5, scale: 2 }).notNull(),
  taxType: text('tax_type').notNull(), // GST | CGST | SGST | IGST | EXPORT
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  effectiveTo: timestamp('effective_to', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('tax_configurations_code_unique').on(t.code),
}));

export const priceLists = pgTable('price_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  currency: text('currency').notNull().default('INR'),
  validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
  validTo: timestamp('valid_to', { withTimezone: true }),
  status: entityStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('price_lists_code_unique').on(t.code),
}));

export const priceListItems = pgTable('price_list_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  priceListId: uuid('price_list_id').notNull().references(() => priceLists.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  productGradeId: uuid('product_grade_id').references(() => productGrades.id),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
  unitId: uuid('unit_id').references(() => unitsOfMeasure.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // NOTE: same NULL-defeats-uniqueness caveat as above applies here for
  // productGradeId specifically (it's nullable — a grade-less product).
  // Two rows for the same (priceListId, productId) with productGradeId
  // both NULL would both be accepted. Left as-is for now since it's a
  // narrower edge case than the tenant_id issue; revisit with a partial
  // unique index (`WHERE product_grade_id IS NULL`) if it causes a real
  // duplicate-pricing bug once Sales/pricing is actually implemented.
  itemUnique: unique('price_list_items_unique').on(t.priceListId, t.productId, t.productGradeId),
}));

export type Department = typeof departments.$inferSelect;
export type UnitOfMeasure = typeof unitsOfMeasure.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type Warehouse = typeof warehouses.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Machine = typeof machines.$inferSelect;
export type PackagingType = typeof packagingTypes.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductGrade = typeof productGrades.$inferSelect;
export type QcParameter = typeof qcParameters.$inferSelect;
export type ProductGradeQcSpec = typeof productGradeQcSpecs.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type TaxConfiguration = typeof taxConfigurations.$inferSelect;
export type PriceList = typeof priceLists.$inferSelect;
export type PriceListItem = typeof priceListItems.$inferSelect;
