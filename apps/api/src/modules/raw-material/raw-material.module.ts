import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { RawMaterialLotsController } from './lots/raw-material-lots.controller';
import { RawMaterialLotsService } from './lots/raw-material-lots.service';

@Module({
  imports: [IdentityModule],
  controllers: [RawMaterialLotsController],
  providers: [RawMaterialLotsService],
})
export class RawMaterialModule {}
