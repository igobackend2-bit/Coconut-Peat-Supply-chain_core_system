import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('overview') overview() { return this.svc.overview(); }
  @Get('production-yield') yield() { return this.svc.productionYield(); }
  @Get('sales-by-customer') sales() { return this.svc.salesByCustomer(); }
  @Get('traceability/batch/:id') trace(@Param('id', ParseUUIDPipe) id: string) { return this.svc.traceBatch(id); }
  @Get('traceability/sales-order/:id') traceOrder(@Param('id', ParseUUIDPipe) id: string) { return this.svc.traceSalesOrder(id); }
}
