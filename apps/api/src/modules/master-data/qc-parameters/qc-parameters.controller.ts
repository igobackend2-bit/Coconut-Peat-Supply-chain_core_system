import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../../common/audit/audit-log.decorator';
import { RequirePermissions } from '../../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../../identity/guards/session-auth.guard';
import { CreateQcParameterDto } from './dto/create-qc-parameter.dto';
import { QcParametersService } from './qc-parameters.service';

@Controller('qc-parameters')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class QcParametersController {
  constructor(private readonly qcParametersService: QcParametersService) {}

  @Get()
  list() {
    return this.qcParametersService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.qcParametersService.findOne(id);
  }

  @Post()
  @RequirePermissions('master_data.qc_parameter.write')
  @AuditLog({ module: 'MASTER_DATA', entityType: 'qc_parameter', actionType: 'CREATE' })
  create(@Body() dto: CreateQcParameterDto) {
    return this.qcParametersService.create(dto);
  }
}
