import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../../common/audit/audit-log.decorator';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import { RequirePermissions } from '../../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../../identity/guards/session-auth.guard';
import { RequestUser } from '../../identity/types';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { DecidePurchaseOrderDto } from './dto/decide-purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@Controller('purchase-orders')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  list() {
    return this.purchaseOrdersService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchaseOrdersService.findOne(id);
  }

  @Post()
  @RequirePermissions('procurement.purchase_order.write')
  @AuditLog({ module: 'PROCUREMENT', entityType: 'purchase_order', actionType: 'CREATE' })
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: RequestUser) {
    return this.purchaseOrdersService.create(dto, user.id);
  }

  @Post(':id/approve')
  @RequirePermissions('procurement.purchase_order.approve')
  @AuditLog({ module: 'PROCUREMENT', entityType: 'purchase_order', actionType: 'APPROVE' })
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecidePurchaseOrderDto, @CurrentUser() user: RequestUser) {
    return this.purchaseOrdersService.approve(id, dto, user.id);
  }

  @Post(':id/reject')
  @RequirePermissions('procurement.purchase_order.approve')
  @AuditLog({ module: 'PROCUREMENT', entityType: 'purchase_order', actionType: 'REJECT' })
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecidePurchaseOrderDto, @CurrentUser() user: RequestUser) {
    return this.purchaseOrdersService.reject(id, dto, user.id);
  }
}
