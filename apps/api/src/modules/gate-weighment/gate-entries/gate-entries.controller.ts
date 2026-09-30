import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../../common/audit/audit-log.decorator';
import { RequirePermissions } from '../../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../../identity/guards/session-auth.guard';
import { CreateGateEntryDto } from './dto/create-gate-entry.dto';
import { GateEntriesService } from './gate-entries.service';

@Controller('gate-entries')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class GateEntriesController {
  constructor(private readonly gateEntriesService: GateEntriesService) {}

  @Get()
  list() {
    return this.gateEntriesService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.gateEntriesService.findOne(id);
  }

  @Post()
  @RequirePermissions('gate_weighment.gate_entry.write')
  @AuditLog({ module: 'GATE_WEIGHMENT', entityType: 'gate_entry', actionType: 'CREATE' })
  create(@Body() dto: CreateGateEntryDto) {
    return this.gateEntriesService.create(dto);
  }
}
