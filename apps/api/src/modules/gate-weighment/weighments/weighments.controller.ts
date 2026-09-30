import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../../common/audit/audit-log.decorator';
import { RequirePermissions } from '../../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../../identity/guards/session-auth.guard';
import { CreateWeighmentDto } from './dto/create-weighment.dto';
import { WeighmentsService } from './weighments.service';

@Controller('weighments')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class WeighmentsController {
  constructor(private readonly weighmentsService: WeighmentsService) {}

  @Get()
  list() {
    return this.weighmentsService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.weighmentsService.findOne(id);
  }

  @Post()
  @RequirePermissions('gate_weighment.weighment.write')
  @AuditLog({ module: 'GATE_WEIGHMENT', entityType: 'weighment', actionType: 'CREATE' })
  create(@Body() dto: CreateWeighmentDto) {
    return this.weighmentsService.create(dto);
  }
}
