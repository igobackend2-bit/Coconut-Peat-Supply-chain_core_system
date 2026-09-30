import { Module } from '@nestjs/common';
import { IdentityModule } from '../../identity/identity.module';
import { PackagingTypesController } from './packaging-types.controller';
import { PackagingTypesService } from './packaging-types.service';

@Module({
  imports: [IdentityModule],
  controllers: [PackagingTypesController],
  providers: [PackagingTypesService],
})
export class PackagingTypesModule {}
