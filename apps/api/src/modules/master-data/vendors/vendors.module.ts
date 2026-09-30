import { Module } from '@nestjs/common';
import { IdentityModule } from '../../identity/identity.module';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

@Module({
  imports: [IdentityModule],
  controllers: [VendorsController],
  providers: [VendorsService],
})
export class VendorsModule {}
