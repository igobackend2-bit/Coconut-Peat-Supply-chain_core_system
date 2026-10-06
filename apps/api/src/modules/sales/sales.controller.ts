import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../common/audit/audit-log.decorator';
import { RequirePermissions } from '../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { CreateSalesOrderItemDto } from './dto/create-sales-order-item.dto';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { SalesService } from './sales.service';

@Controller('sales-orders')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  list() {
    return this.salesService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.findOne(id);
  }

  @Post()
  @RequirePermissions('sales.order.write')
  @AuditLog({ module: 'SALES', entityType: 'sales_order', actionType: 'CREATE' })
  create(@Body() dto: CreateSalesOrderDto) {
    return this.salesService.create(dto);
  }

  @Get(':id/items')
  listItems(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.listItems(id);
  }

  @Post(':id/items')
  @RequirePermissions('sales.order.write')
  @AuditLog({ module: 'SALES', entityType: 'sales_order_item', actionType: 'CREATE' })
  addItem(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateSalesOrderItemDto) {
    return this.salesService.addItem(id, dto);
  }

  @Post(':id/confirm')
  @RequirePermissions('sales.order.confirm')
  @AuditLog({ module: 'SALES', entityType: 'sales_order', actionType: 'UPDATE', operation: 'confirm' })
  confirm(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.confirm(id);
  }

  @Post(':id/cancel')
  @RequirePermissions('sales.order.write')
  @AuditLog({ module: 'SALES', entityType: 'sales_order', actionType: 'UPDATE', operation: 'cancel' })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.cancel(id);
  }
}
