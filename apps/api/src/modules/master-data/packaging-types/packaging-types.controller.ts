import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../../common/audit/audit-log.decorator';
import { RequirePermissions } from '../../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../../identity/guards/session-auth.guard';
import { CreatePackagingTypeDto } from './dto/create-packaging-type.dto';
import { PackagingTypesService } from './packaging-types.service';

@Controller('packaging-types')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class PackagingTypesController {
  constructor(private readonly packagingTypesService: PackagingTypesService) {}

  @Get()
  list() {
    return this.packagingTypesService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.packagingTypesService.findOne(id);
  }

  @Post()
  @RequirePermissions('master_data.packaging_type.write')
  @AuditLog({ module: 'MASTER_DATA', entityType: 'packaging_type', actionType: 'CREATE' })
  create(@Body() dto: CreatePackagingTypeDto) {
    return this.packagingTypesService.create(dto);
  }
}
