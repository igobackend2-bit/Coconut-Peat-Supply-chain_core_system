import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../../common/audit/audit-log.decorator';
import { RequirePermissions } from '../../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../../identity/guards/session-auth.guard';
import { CreateDriverDto } from './dto/create-driver.dto';
import { DriversService } from './drivers.service';

@Controller('drivers')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  list() {
    return this.driversService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.driversService.findOne(id);
  }

  @Post()
  @RequirePermissions('gate_weighment.driver.write')
  @AuditLog({ module: 'GATE_WEIGHMENT', entityType: 'driver', actionType: 'CREATE' })
  create(@Body() dto: CreateDriverDto) {
    return this.driversService.create(dto);
  }
}
