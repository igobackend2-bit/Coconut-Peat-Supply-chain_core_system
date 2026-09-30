import { Module } from '@nestjs/common';
import { IdentityModule } from '../../identity/identity.module';
import { QcParametersController } from './qc-parameters.controller';
import { QcParametersService } from './qc-parameters.service';

@Module({
  imports: [IdentityModule],
  controllers: [QcParametersController],
  providers: [QcParametersService],
})
export class QcParametersModule {}
