import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../../common/audit/audit-log.decorator';
import { RequirePermissions } from '../../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../../identity/guards/session-auth.guard';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { GoodsReceiptsService } from './goods-receipts.service';

@Controller('goods-receipts')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class GoodsReceiptsController {
  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Get()
  list() {
    return this.goodsReceiptsService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.goodsReceiptsService.findOne(id);
  }

  @Post()
  @RequirePermissions('procurement.goods_receipt.write')
  @AuditLog({ module: 'PROCUREMENT', entityType: 'goods_receipt', actionType: 'CREATE' })
  create(@Body() dto: CreateGoodsReceiptDto) {
    return this.goodsReceiptsService.create(dto);
  }
}
