import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../../common/audit/audit-log.decorator';
import { RequirePermissions } from '../../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../../identity/guards/session-auth.guard';
import { CreateRawMaterialLotDto } from './dto/create-raw-material-lot.dto';
import { RawMaterialLotsService } from './raw-material-lots.service';

@Controller('raw-material-lots')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class RawMaterialLotsController {
  constructor(private readonly rawMaterialLotsService: RawMaterialLotsService) {}

  @Get()
  list() {
    return this.rawMaterialLotsService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rawMaterialLotsService.findOne(id);
  }

  @Post()
  @RequirePermissions('raw_material.lot.write')
  @AuditLog({ module: 'RAW_MATERIAL', entityType: 'raw_material_lot', actionType: 'CREATE' })
  create(@Body() dto: CreateRawMaterialLotDto) {
    return this.rawMaterialLotsService.createFromGoodsReceipt(dto);
  }
}
