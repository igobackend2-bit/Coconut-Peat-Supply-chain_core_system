import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../../common/audit/audit-log.decorator';
import { CurrentUser } from '../../identity/decorators/current-user.decorator';
import { RequirePermissions } from '../../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../../identity/guards/session-auth.guard';
import { RequestUser } from '../../identity/types';
import { CreateBatchInputDto } from './dto/create-batch-input.dto';
import { CreateBatchOutputDto } from './dto/create-batch-output.dto';
import { CreateProductionBatchDto } from './dto/create-production-batch.dto';
import { DecideBatchDto } from './dto/decide-batch.dto';
import { ProductionBatchesService } from './production-batches.service';

@Controller('production-batches')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ProductionBatchesController {
  constructor(private readonly batchesService: ProductionBatchesService) {}

  @Get()
  list() {
    return this.batchesService.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.batchesService.findOne(id);
  }

  @Post()
  @RequirePermissions('production.batch.write')
  @AuditLog({ module: 'PRODUCTION', entityType: 'production_batch', actionType: 'CREATE' })
  create(@Body() dto: CreateProductionBatchDto) {
    return this.batchesService.create(dto);
  }

  @Get(':id/inputs')
  listInputs(@Param('id', ParseUUIDPipe) id: string) {
    return this.batchesService.listInputs(id);
  }

  @Post(':id/inputs')
  @RequirePermissions('production.batch.write')
  @AuditLog({ module: 'PRODUCTION', entityType: 'batch_input', actionType: 'CREATE' })
  addInput(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateBatchInputDto) {
    return this.batchesService.addInput(id, dto);
  }

  @Get(':id/outputs')
  listOutputs(@Param('id', ParseUUIDPipe) id: string) {
    return this.batchesService.listOutputs(id);
  }

  @Post(':id/outputs')
  @RequirePermissions('production.batch.write')
  @AuditLog({ module: 'PRODUCTION', entityType: 'batch_output', actionType: 'CREATE' })
  addOutput(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateBatchOutputDto) {
    return this.batchesService.addOutput(id, dto);
  }

  @Post(':id/complete')
  @RequirePermissions('production.batch.write')
  @AuditLog({ module: 'PRODUCTION', entityType: 'production_batch', actionType: 'UPDATE', operation: 'complete' })
  complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.batchesService.complete(id);
  }

  @Post(':id/release')
  @RequirePermissions('production.batch.release')
  @AuditLog({ module: 'PRODUCTION', entityType: 'production_batch', actionType: 'APPROVE', operation: 'release' })
  release(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecideBatchDto, @CurrentUser() user: RequestUser) {
    return this.batchesService.release(id, dto, user.id);
  }

  @Post(':id/reject')
  @RequirePermissions('production.batch.release')
  @AuditLog({ module: 'PRODUCTION', entityType: 'production_batch', actionType: 'REJECT', operation: 'reject' })
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecideBatchDto, @CurrentUser() user: RequestUser) {
    return this.batchesService.reject(id, dto, user.id);
  }

  @Post(':id/close')
  @RequirePermissions('production.batch.write')
  @AuditLog({ module: 'PRODUCTION', entityType: 'production_batch', actionType: 'UPDATE', operation: 'close' })
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.batchesService.close(id);
  }
}
