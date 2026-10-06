import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../common/audit/audit-log.decorator';
import { RequirePermissions } from '../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { CreatePackingLotDto } from './dto/create-packing-lot.dto';
import { CreatePackingOrderDto } from './dto/create-packing-order.dto';
import { PackingService } from './packing.service';

@Controller('packing-orders')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class PackingController {
  constructor(private readonly packingService: PackingService) {}

  @Get()
  list() {
    return this.packingService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.packingService.findOne(id);
  }

  @Post()
  @RequirePermissions('packing.order.write')
  @AuditLog({ module: 'PACKING', entityType: 'packing_order', actionType: 'CREATE' })
  create(@Body() dto: CreatePackingOrderDto) {
    return this.packingService.create(dto);
  }

  @Get(':id/lots')
  listLots(@Param('id', ParseUUIDPipe) id: string) {
    return this.packingService.listLots(id);
  }

  @Post(':id/lots')
  @RequirePermissions('packing.lot.write')
  @AuditLog({ module: 'PACKING', entityType: 'packing_lot', actionType: 'CREATE' })
  addLot(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreatePackingLotDto) {
    return this.packingService.addLot(id, dto);
  }

  @Post(':id/complete')
  @RequirePermissions('packing.order.write')
  @AuditLog({ module: 'PACKING', entityType: 'packing_order', actionType: 'UPDATE', operation: 'complete' })
  complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.packingService.complete(id);
  }
}
