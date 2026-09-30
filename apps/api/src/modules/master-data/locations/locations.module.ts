import { Module } from '@nestjs/common';
import { IdentityModule } from '../../identity/identity.module';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  imports: [IdentityModule],
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
