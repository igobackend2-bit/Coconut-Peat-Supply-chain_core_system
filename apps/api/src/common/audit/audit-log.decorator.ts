import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'audit_log_metadata';

/**
 * Fields per docs/actions.md §4's mandatory action record. actor/request/
 * correlation/conversation/session identifiers are filled in by
 * AuditInterceptor at request time, not here — this decorator only
 * declares the parts that are fixed per-endpoint.
 */
export interface AuditLogOptions {
  module: string;
  entityType: string;
  actionType: string;
  /** Defaults to "<METHOD> <path>" if omitted. */
  operation?: string;
  /**
   * Top-level response field names to omit from `after_state` before it
   * is written to audit_events — e.g. a raw session token, a password
   * reset link. Use this rather than skipping @AuditLog entirely when an
   * endpoint is worth auditing but its response contains something that
   * must never be persisted in plaintext outside its original purpose.
   */
  redactResponseFields?: string[];
}

/**
 * Marks a controller method as producing an audit_events row (see
 * docs/actions.md §5 for the list of action types that must be logged).
 * Endpoints without this decorator are not audited — e.g. plain health
 * checks or other non-business reads.
 */
export const AuditLog = (options: AuditLogOptions) => SetMetadata(AUDIT_LOG_KEY, options);
