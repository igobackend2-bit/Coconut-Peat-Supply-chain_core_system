import { boolean, index, pgTable, primaryKey, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { entityStatusEnum } from './enums';
import { employees } from './master-data.schema';

/**
 * Identity domain (architecture.md §3). `permissions` is a global,
 * system-defined catalog (not per-tenant) — what varies per tenant is
 * which permissions a given role grants, via role_permissions.
 *
 * `code`/`email` uniqueness is single-column, not composite with
 * tenant_id — see the NULL-defeats-uniqueness note in
 * master-data.schema.ts (verified bug, not theoretical): a composite
 * UNIQUE(tenant_id, x) is silently unenforced while tenant_id is NULL
 * for every row.
 */

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(), // e.g. "production.batch.approve"
  module: text('module').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  code: text('code').notNull(), // e.g. QC_MANAGER, PRODUCTION_MANAGER — see product-requirements.md §3
  name: text('name').notNull(),
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(false), // true for built-in roles that shouldn't be deleted (e.g. SUPER_ADMIN)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codeUnique: unique('roles_code_unique').on(t.code),
}));

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.roleId, t.permissionId] }),
}));

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  employeeId: uuid('employee_id').references(() => employees.id),
  status: entityStatusEnum('status').notNull().default('ACTIVE'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailUnique: unique('users_email_unique').on(t.email),
  employeeIdx: index('users_employee_idx').on(t.employeeId),
}));

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').notNull().references(() => users.id),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  assignedBy: uuid('assigned_by').references(() => users.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.roleId] }),
}));

export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull(),
  ipHash: text('ip_hash'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (t) => ({
  userIdx: index('user_sessions_user_idx').on(t.userId),
  tokenUnique: unique('user_sessions_token_hash_unique').on(t.tokenHash),
}));

/**
 * Non-human actors (AI agents, external integrations) that authenticate
 * against the API — distinct from `users`. See docs/agents.md's actor
 * type AI_AGENT and docs/actions.md's ACTOR_TYPES (USER, AI_AGENT,
 * SYSTEM, INTEGRATION, ADMIN).
 */
export const serviceAccounts = pgTable('service_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id'),
  name: text('name').notNull(),
  accountType: text('account_type').notNull().default('INTEGRATION'), // AI_AGENT | INTEGRATION
  description: text('description'),
  apiKeyHash: text('api_key_hash').notNull(),
  status: entityStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
}, (t) => ({
  apiKeyUnique: unique('service_accounts_api_key_hash_unique').on(t.apiKeyHash),
}));

export type Permission = typeof permissions.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type ServiceAccount = typeof serviceAccounts.$inferSelect;
