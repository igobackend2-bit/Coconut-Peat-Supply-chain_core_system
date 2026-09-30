import { Module } from '@nestjs/common';
import { IdentityModule } from '../../identity/identity.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [IdentityModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
