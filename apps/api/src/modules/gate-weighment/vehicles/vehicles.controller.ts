import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../../common/audit/audit-log.decorator';
import { RequirePermissions } from '../../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../../identity/guards/session-auth.guard';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@Controller('vehicles')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  list() {
    return this.vehiclesService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Post()
  @RequirePermissions('gate_weighment.vehicle.write')
  @AuditLog({ module: 'GATE_WEIGHMENT', entityType: 'vehicle', actionType: 'CREATE' })
  create(@Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('gate_weighment.vehicle.write')
  @AuditLog({ module: 'GATE_WEIGHMENT', entityType: 'vehicle', actionType: 'UPDATE' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, dto);
  }
}
