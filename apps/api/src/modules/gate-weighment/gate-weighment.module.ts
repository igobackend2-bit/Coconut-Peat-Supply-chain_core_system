import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { DriversController } from './drivers/drivers.controller';
import { DriversService } from './drivers/drivers.service';
import { GateEntriesController } from './gate-entries/gate-entries.controller';
import { GateEntriesService } from './gate-entries/gate-entries.service';
import { VehiclesController } from './vehicles/vehicles.controller';
import { VehiclesService } from './vehicles/vehicles.service';
import { WeighmentsController } from './weighments/weighments.controller';
import { WeighmentsService } from './weighments/weighments.service';

/**
 * One module for the whole Gate & Weighment domain (unlike Master Data's
 * one-module-per-entity pattern) — these four entities are tightly
 * coupled (a weighment always belongs to a gate entry, which always
 * belongs to a vehicle) and are always deployed/versioned together, so
 * a single module boundary matches the domain boundary from
 * architecture.md §3 better than four independent ones would.
 */
@Module({
  imports: [IdentityModule],
  controllers: [VehiclesController, DriversController, GateEntriesController, WeighmentsController],
  providers: [VehiclesService, DriversService, GateEntriesService, WeighmentsService],
})
export class GateWeighmentModule {}
