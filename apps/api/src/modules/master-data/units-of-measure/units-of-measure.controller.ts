import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../../common/audit/audit-log.decorator';
import { RequirePermissions } from '../../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../../identity/guards/session-auth.guard';
import { CreateUnitOfMeasureDto } from './dto/create-unit-of-measure.dto';
import { UnitsOfMeasureService } from './units-of-measure.service';

@Controller('units-of-measure')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class UnitsOfMeasureController {
  constructor(private readonly unitsOfMeasureService: UnitsOfMeasureService) {}

  @Get()
  list() {
    return this.unitsOfMeasureService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.unitsOfMeasureService.findOne(id);
  }

  @Post()
  @RequirePermissions('master_data.unit.write')
  @AuditLog({ module: 'MASTER_DATA', entityType: 'unit_of_measure', actionType: 'CREATE' })
  create(@Body() dto: CreateUnitOfMeasureDto) {
    return this.unitsOfMeasureService.create(dto);
  }
}
