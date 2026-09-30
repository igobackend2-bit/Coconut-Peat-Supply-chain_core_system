import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { randomUUID } from 'crypto';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { DRIZZLE, DrizzleDb } from '../../db/drizzle.provider';
import { NewAuditEvent, auditEvents } from '../../db/schema';
import { AUDIT_LOG_KEY, AuditLogOptions } from './audit-log.decorator';

/**
 * Writes an audit_events row for every handler annotated with @AuditLog,
 * per docs/actions.md §4-5 (append-only; every mutating action gets a
 * record). Handlers without @AuditLog pass through untouched.
 *
 * Known limitations, documented rather than hidden (see
 * docs/project-state.md):
 * - There is no auth system yet, so actor identity is a placeholder
 *   (SYSTEM / null) until a real auth module populates `request.user`.
 * - This inserts as a separate statement after the handler runs, not
 *   inside the same DB transaction as the business write. True
 *   transactional coupling belongs in each business module once those
 *   exist; this global interceptor is a baseline that guarantees an
 *   audit row exists even for handlers that don't do that yet.
 * - An audit-write failure is logged loudly but does not alter or block
 *   the actual HTTP response, so a broken audit pipe fails safe for
 *   users rather than taking down the API — but it does mean a missing
 *   audit row is possible if the DB write itself fails. This trade-off
 *   should be revisited once audit completeness becomes a hard
 *   requirement (docs/actions.md §9 "audit queries").
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditLogOptions | undefined>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const startedAt = Date.now();

    const base: Partial<NewAuditEvent> = {
      actorType: request.user?.actorType ?? 'SYSTEM',
      actorId: request.user?.id ?? null,
      actorName: request.user?.name ?? null,
      actionType: options.actionType,
      module: options.module,
      entityType: options.entityType,
      operation: options.operation ?? `${request.method} ${request.route?.path ?? request.url}`,
      requestId: this.headerOrNew(request, 'x-request-id'),
      correlationId: this.headerOrNew(request, 'x-correlation-id'),
      conversationId: this.header(request, 'x-conversation-id'),
      sessionId: this.header(request, 'x-session-id'),
      source: this.header(request, 'x-source') ?? 'API',
    };

    return next.handle().pipe(
      tap((responseBody) => {
        void this.write({
          ...base,
          entityId: this.extractEntityId(request, responseBody),
          status: 'COMPLETED',
          afterState: this.safeJson(this.redact(responseBody, options.redactResponseFields)),
          metadata: { durationMs: Date.now() - startedAt },
        });
      }),
      catchError((err) => {
        void this.write({
          ...base,
          entityId: this.extractEntityId(request, undefined),
          status: 'FAILED',
          reason: err?.message ?? 'Unknown error',
          metadata: { durationMs: Date.now() - startedAt, errorName: err?.name },
        });
        return throwError(() => err);
      }),
    );
  }

  private async write(event: Partial<NewAuditEvent>): Promise<void> {
    try {
      await this.db.insert(auditEvents).values(event as NewAuditEvent);
    } catch (writeErr) {
      this.logger.error('Failed to write audit event', writeErr as Error);
    }
  }

  private header(request: any, name: string): string | null {
    const value = request.headers?.[name];
    return typeof value === 'string' ? value : null;
  }

  private headerOrNew(request: any, name: string): string {
    return this.header(request, name) ?? randomUUID();
  }

  private extractEntityId(request: any, responseBody: any): string | null {
    const fromBody = responseBody?.id;
    const fromParams = request?.params?.id;
    return typeof fromBody === 'string' ? fromBody : (typeof fromParams === 'string' ? fromParams : null);
  }

  private redact(value: unknown, fields: string[] | undefined): unknown {
    if (!fields || fields.length === 0 || value === null || typeof value !== 'object') {
      return value;
    }
    const clone: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    for (const field of fields) {
      if (field in clone) clone[field] = '[REDACTED]';
    }
    return clone;
  }

  private safeJson(value: unknown) {
    try {
      return JSON.parse(JSON.stringify(value ?? null));
    } catch {
      return null;
    }
  }
}
