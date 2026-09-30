import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DRIZZLE, DrizzleDb } from '../../db/drizzle.provider';
import { NewAuditEvent, auditEvents } from '../../db/schema';

/**
 * Closes a real gap found by testing: NestJS runs Guards *before*
 * Interceptors, so when SessionAuthGuard/PermissionsGuard reject a
 * request, AuditInterceptor's code never runs — a 401/403 was
 * completely invisible to audit_events. Verified: a real POST /products
 * attempt by a user without master_data.product.write produced a 403
 * response but zero audit_events rows, before this filter existed.
 *
 * This filter catches exactly those two exception types globally and
 * writes a FAILED audit_events row, then re-emits the exact same
 * response body NestJS would have sent anyway (via
 * exception.getResponse()) — it changes what gets logged, not what the
 * caller sees.
 */
@Catch(UnauthorizedException, ForbiddenException)
@Injectable()
export class AuthFailureAuditFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthFailureAuditFilter.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async catch(exception: UnauthorizedException | ForbiddenException, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const request: any = ctx.getRequest();
    const response: any = ctx.getResponse();
    const status = exception.getStatus();

    void this.write({
      actorType: request.user ? 'USER' : 'SYSTEM',
      actorId: request.user?.id ?? null,
      actorName: request.user?.fullName ?? null,
      actionType: 'REJECT',
      module: 'SECURITY',
      entityType: 'access_attempt',
      operation: `${request.method} ${request.route?.path ?? request.url}`,
      status: 'FAILED',
      reason: exception.message,
      requestId: this.header(request, 'x-request-id') ?? randomUUID(),
      correlationId: this.header(request, 'x-correlation-id') ?? randomUUID(),
      conversationId: this.header(request, 'x-conversation-id'),
      sessionId: this.header(request, 'x-session-id'),
      source: this.header(request, 'x-source') ?? 'API',
      metadata: { httpStatus: status },
    });

    response.status(status).json(exception.getResponse());
  }

  private async write(event: Partial<NewAuditEvent>): Promise<void> {
    try {
      await this.db.insert(auditEvents).values(event as NewAuditEvent);
    } catch (writeErr) {
      this.logger.error('Failed to write auth-failure audit event', writeErr as Error);
    }
  }

  private header(request: any, name: string): string | null {
    const value = request.headers?.[name];
    return typeof value === 'string' ? value : null;
  }
}
