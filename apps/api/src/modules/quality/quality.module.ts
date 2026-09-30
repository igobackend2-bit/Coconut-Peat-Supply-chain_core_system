import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { QcSamplesController } from './samples/qc-samples.controller';
import { QcSamplesService } from './samples/qc-samples.service';

@Module({
  imports: [IdentityModule],
  controllers: [QcSamplesController],
  providers: [QcSamplesService],
})
export class QualityModule {}
