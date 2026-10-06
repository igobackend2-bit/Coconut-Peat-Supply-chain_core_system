import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { ActivityService } from './activity.service';

/** Read-only view over the append-only audit_events table. Reading the audit log is itself permissioned (handler-level: PermissionsGuard ignores class-level metadata). */
@Controller('audit-events')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ActivityController {
  constructor(private readonly svc: ActivityService) {}

  @Get()
  @RequirePermissions('audit.event.read')
  list(
    @Query('module') module?: string,
    @Query('actionType') actionType?: string,
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
    @Query('actorId') actorId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.list({ module, actionType, status, entityType, actorId, from, to, limit: limit ? Number(limit) : undefined, offset: offset ? Number(offset) : undefined });
  }

  @Get('meta') @RequirePermissions('audit.event.read')
  meta() { return this.svc.meta(); }
  @Get(':id') @RequirePermissions('audit.event.read')
  one(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findOne(id); }
}
