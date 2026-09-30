import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
