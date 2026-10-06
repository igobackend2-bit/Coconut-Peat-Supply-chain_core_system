import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [IdentityModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
