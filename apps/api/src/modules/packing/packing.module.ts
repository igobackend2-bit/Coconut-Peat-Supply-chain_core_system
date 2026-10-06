import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PackingController } from './packing.controller';
import { PackingService } from './packing.service';

@Module({
  imports: [IdentityModule],
  controllers: [PackingController],
  providers: [PackingService],
})
export class PackingModule {}
