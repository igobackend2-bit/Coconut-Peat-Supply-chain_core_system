import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../common/audit/audit-log.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { RequirePermissions } from '../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { RequestUser } from '../identity/types';
import { AiService } from './ai.service';

@Controller()
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class AiController {
  constructor(private readonly svc: AiService) {}

  @Get('ai-agents') agents() { return this.svc.listAgents(); }
  @Get('ai-runs') runs() { return this.svc.listRuns(); }
  @Get('ai-findings') findings(@Query('status') status?: string) { return this.svc.listFindings(status); }

  @Post('ai-agents/:id/run') @RequirePermissions('ai.agent.run')
  @AuditLog({ module: 'AI', entityType: 'ai_run', actionType: 'CREATE', operation: 'run_agent' })
  run(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: RequestUser) { return this.svc.run(id, u.id); }

  @Post('ai-findings/:id/acknowledge') @RequirePermissions('ai.finding.decide')
  @AuditLog({ module: 'AI', entityType: 'ai_finding', actionType: 'APPROVE', operation: 'acknowledge' })
  ack(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: RequestUser) { return this.svc.decide(id, 'ACKNOWLEDGED', u.id); }

  @Post('ai-findings/:id/dismiss') @RequirePermissions('ai.finding.decide')
  @AuditLog({ module: 'AI', entityType: 'ai_finding', actionType: 'REJECT', operation: 'dismiss' })
  dismiss(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: RequestUser) { return this.svc.decide(id, 'DISMISSED', u.id); }
}
