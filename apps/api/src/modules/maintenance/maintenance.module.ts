import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';

@Module({ imports: [IdentityModule], controllers: [MaintenanceController], providers: [MaintenanceService] })
export class MaintenanceModule {}
