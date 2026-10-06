import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { WorkforceController } from './workforce.controller';
import { WorkforceService } from './workforce.service';

@Module({ imports: [IdentityModule], controllers: [WorkforceController], providers: [WorkforceService] })
export class WorkforceModule {}
