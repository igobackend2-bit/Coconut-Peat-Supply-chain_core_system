import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../../common/audit/audit-log.decorator';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import { RequirePermissions } from '../../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../../identity/guards/session-auth.guard';
import { RequestUser } from '../../identity/types';
import { CreateQcResultDto } from './dto/create-qc-result.dto';
import { CreateQcSampleDto } from './dto/create-qc-sample.dto';
import { QcSamplesService } from './qc-samples.service';

@Controller('qc-samples')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class QcSamplesController {
  constructor(private readonly qcSamplesService: QcSamplesService) {}

  @Get()
  list() {
    return this.qcSamplesService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.qcSamplesService.findOne(id);
  }

  @Post()
  @RequirePermissions('quality.qc_sample.write')
  @AuditLog({ module: 'QUALITY', entityType: 'qc_sample', actionType: 'CREATE' })
  create(@Body() dto: CreateQcSampleDto) {
    return this.qcSamplesService.create(dto);
  }

  @Get(':id/results')
  listResults(@Param('id', ParseUUIDPipe) id: string) {
    return this.qcSamplesService.listResults(id);
  }

  @Post(':id/results')
  @RequirePermissions('quality.qc_result.write')
  @AuditLog({ module: 'QUALITY', entityType: 'qc_result', actionType: 'CREATE' })
  addResult(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateQcResultDto, @CurrentUser() user: RequestUser) {
    return this.qcSamplesService.addResult(id, dto, user.id);
  }
}
