import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './common/audit/audit.module';
import { DrizzleModule } from './db/drizzle.module';
import { HealthController } from './health/health.controller';
import { IdentityModule } from './modules/identity/identity.module';
import { CustomersModule } from './modules/master-data/customers/customers.module';
import { DepartmentsModule } from './modules/master-data/departments/departments.module';
import { EmployeesModule } from './modules/master-data/employees/employees.module';
import { LocationsModule } from './modules/master-data/locations/locations.module';
import { MachinesModule } from './modules/master-data/machines/machines.module';
import { PackagingTypesModule } from './modules/master-data/packaging-types/packaging-types.module';
import { ProductsModule } from './modules/master-data/products/products.module';
import { QcParametersModule } from './modules/master-data/qc-parameters/qc-parameters.module';
import { SuppliersModule } from './modules/master-data/suppliers/suppliers.module';
import { UnitsOfMeasureModule } from './modules/master-data/units-of-measure/units-of-measure.module';
import { VendorsModule } from './modules/master-data/vendors/vendors.module';
import { WarehousesModule } from './modules/master-data/warehouses/warehouses.module';
import { GateWeighmentModule } from './modules/gate-weighment/gate-weighment.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { RawMaterialModule } from './modules/raw-material/raw-material.module';
import { ProductionModule } from './modules/production/production.module';
import { QualityModule } from './modules/quality/quality.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PackingModule } from './modules/packing/packing.module';
import { SalesModule } from './modules/sales/sales.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { ExportModule } from './modules/export/export.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { WorkforceModule } from './modules/workforce/workforce.module';
import { FinanceModule } from './modules/finance/finance.module';
import { MemoryModule } from './modules/memory/memory.module';
import { AiModule } from './modules/ai/ai.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ActivityModule } from './modules/activity/activity.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Blanket per-IP ceiling for every route; login/register/change-password set a much tighter one.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: Number(process.env.RATE_LIMIT ?? 600) }]),
    DrizzleModule,
    AuditModule,
    IdentityModule,
    ProductsModule,
    SuppliersModule,
    CustomersModule,
    WarehousesModule,
    DepartmentsModule,
    EmployeesModule,
    LocationsModule,
    MachinesModule,
    PackagingTypesModule,
    QcParametersModule,
    UnitsOfMeasureModule,
    VendorsModule,
    GateWeighmentModule,
    ProcurementModule,
    RawMaterialModule,
    ProductionModule,
    QualityModule,
    InventoryModule,
    PackingModule,
    SalesModule,
    DispatchModule,
    ExportModule,
    MaintenanceModule,
    WorkforceModule,
    FinanceModule,
    MemoryModule,
    AiModule,
    ReportsModule,
    ActivityModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
