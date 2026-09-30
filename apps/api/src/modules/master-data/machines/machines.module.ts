import { Module } from '@nestjs/common';
import { IdentityModule } from '../../identity/identity.module';
import { MachinesController } from './machines.controller';
import { MachinesService } from './machines.service';

@Module({
  imports: [IdentityModule],
  controllers: [MachinesController],
  providers: [MachinesService],
})
export class MachinesModule {}
