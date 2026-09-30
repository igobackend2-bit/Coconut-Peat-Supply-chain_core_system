import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ProductionBatchesController } from './batches/production-batches.controller';
import { ProductionBatchesService } from './batches/production-batches.service';

@Module({
  imports: [IdentityModule],
  controllers: [ProductionBatchesController],
  providers: [ProductionBatchesService],
})
export class ProductionModule {}
