import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';

@Module({
  imports: [IdentityModule],
  controllers: [DispatchController],
  providers: [DispatchService],
})
export class DispatchModule {}
