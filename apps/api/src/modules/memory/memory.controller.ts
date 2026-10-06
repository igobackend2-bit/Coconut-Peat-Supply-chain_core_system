import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../common/audit/audit-log.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { RequirePermissions } from '../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { RequestUser } from '../identity/types';
import { CreateMemoryDto, ReviseMemoryDto } from './memory.dto';
import { MemoryService } from './memory.service';

@Controller('memory')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class MemoryController {
  constructor(private readonly svc: MemoryService) {}

  @Get() list(@CurrentUser() u: RequestUser, @Query('type') type?: string, @Query('status') status?: string, @Query('q') q?: string) {
    return this.svc.list(u, { type, status, q });
  }

  @Get(':id/history') history(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: RequestUser) { return this.svc.history(id, u); }

  @Post() @RequirePermissions('memory.item.write')
  @AuditLog({ module: 'MEMORY', entityType: 'memory_item', actionType: 'CREATE', redactResponseFields: ['content'] })
  create(@Body() dto: CreateMemoryDto, @CurrentUser() u: RequestUser) { return this.svc.create(dto, u); }

  @Post(':id/revise') @RequirePermissions('memory.item.write')
  @AuditLog({ module: 'MEMORY', entityType: 'memory_item', actionType: 'UPDATE', operation: 'revise', redactResponseFields: ['content'] })
  revise(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviseMemoryDto, @CurrentUser() u: RequestUser) { return this.svc.revise(id, dto, u); }

  @Post(':id/archive') @RequirePermissions('memory.item.write')
  @AuditLog({ module: 'MEMORY', entityType: 'memory_item', actionType: 'UPDATE', operation: 'archive', redactResponseFields: ['content'] })
  archive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: RequestUser) { return this.svc.archive(id, u); }
}
