import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../common/audit/audit-log.decorator';
import { RequirePermissions } from '../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { DispatchService } from './dispatch.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';
import { AddDispatchLotDto } from './dto/add-dispatch-lot.dto';
import { DeliverDispatchDto } from './dto/deliver-dispatch.dto';

@Controller('dispatches')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get()
  list() {
    return this.dispatchService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.dispatchService.findOne(id);
  }

  @Post()
  @RequirePermissions('dispatch.record.write')
  @AuditLog({ module: 'DISPATCH', entityType: 'dispatch', actionType: 'CREATE' })
  create(@Body() dto: CreateDispatchDto) {
    return this.dispatchService.create(dto);
  }

  @Post(':id/dispatch')
  @RequirePermissions('dispatch.record.write')
  @AuditLog({ module: 'DISPATCH', entityType: 'dispatch', actionType: 'UPDATE', operation: 'dispatch' })
  dispatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.dispatchService.dispatch(id);
  }

  @Post(':id/deliver')
  @RequirePermissions('dispatch.record.write')
  @AuditLog({ module: 'DISPATCH', entityType: 'dispatch', actionType: 'UPDATE', operation: 'deliver' })
  deliver(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DeliverDispatchDto) {
    return this.dispatchService.deliver(id, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions('dispatch.record.write')
  @AuditLog({ module: 'DISPATCH', entityType: 'dispatch', actionType: 'UPDATE', operation: 'cancel' })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.dispatchService.cancel(id);
  }

  @Get(':id/lots')
  listLots(@Param('id', ParseUUIDPipe) id: string) {
    return this.dispatchService.listLots(id);
  }

  @Get(':id/available-lots')
  availableLots(@Param('id', ParseUUIDPipe) id: string) {
    return this.dispatchService.availableLots(id);
  }

  @Post(':id/lots')
  @RequirePermissions('dispatch.record.write')
  @AuditLog({ module: 'DISPATCH', entityType: 'dispatch_lot', actionType: 'CREATE' })
  addLot(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddDispatchLotDto) {
    return this.dispatchService.addLot(id, dto);
  }

  @Delete(':id/lots/:packingLotId')
  @RequirePermissions('dispatch.record.write')
  @AuditLog({ module: 'DISPATCH', entityType: 'dispatch_lot', actionType: 'DELETE' })
  removeLot(@Param('id', ParseUUIDPipe) id: string, @Param('packingLotId', ParseUUIDPipe) packingLotId: string) {
    return this.dispatchService.removeLot(id, packingLotId);
  }
}
