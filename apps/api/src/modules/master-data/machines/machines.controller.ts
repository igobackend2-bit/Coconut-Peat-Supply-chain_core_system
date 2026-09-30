import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../../common/audit/audit-log.decorator';
import { RequirePermissions } from '../../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../../identity/guards/session-auth.guard';
import { CreateMachineDto } from './dto/create-machine.dto';
import { MachinesService } from './machines.service';

@Controller('machines')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Get()
  list() {
    return this.machinesService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.machinesService.findOne(id);
  }

  @Post()
  @RequirePermissions('master_data.machine.write')
  @AuditLog({ module: 'MASTER_DATA', entityType: 'machine', actionType: 'CREATE' })
  create(@Body() dto: CreateMachineDto) {
    return this.machinesService.create(dto);
  }
}
