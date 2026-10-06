import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../common/audit/audit-log.decorator';
import { RequirePermissions } from '../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import {
  AdjustSparePartDto,
  CreatePlanDto,
  CreateSparePartDto,
  CreateWorkOrderDto,
  ReportBreakdownDto,
  ResolveDto,
} from './maintenance.dto';
import { MaintenanceService } from './maintenance.service';

const A = (entityType: string, actionType: string, operation?: string) =>
  AuditLog({ module: 'MAINTENANCE', entityType, actionType: actionType as never, operation });

@Controller()
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class MaintenanceController {
  constructor(private readonly svc: MaintenanceService) {}

  @Get('maintenance-plans') listPlans() { return this.svc.listPlans(); }
  @Post('maintenance-plans') @RequirePermissions('maintenance.plan.write') @A('maintenance_plan', 'CREATE')
  createPlan(@Body() dto: CreatePlanDto) { return this.svc.createPlan(dto); }
  @Post('maintenance-plans/:id/generate-work-order') @RequirePermissions('maintenance.work_order.write') @A('work_order', 'CREATE', 'generate_from_plan')
  generate(@Param('id', ParseUUIDPipe) id: string) { return this.svc.generateWorkOrder(id); }

  @Get('breakdowns') listBreakdowns() { return this.svc.listBreakdowns(); }
  @Post('breakdowns') @RequirePermissions('maintenance.breakdown.write') @A('breakdown', 'CREATE')
  report(@Body() dto: ReportBreakdownDto) { return this.svc.report(dto); }
  @Post('breakdowns/:id/start-repair') @RequirePermissions('maintenance.breakdown.write') @A('breakdown', 'UPDATE', 'start_repair')
  startRepair(@Param('id', ParseUUIDPipe) id: string) { return this.svc.startRepair(id); }
  @Post('breakdowns/:id/resolve') @RequirePermissions('maintenance.breakdown.write') @A('breakdown', 'UPDATE', 'resolve')
  resolve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResolveDto) { return this.svc.resolve(id, dto); }

  @Get('work-orders') listWorkOrders() { return this.svc.listWorkOrders(); }
  @Post('work-orders') @RequirePermissions('maintenance.work_order.write') @A('work_order', 'CREATE')
  createWo(@Body() dto: CreateWorkOrderDto) { return this.svc.createWorkOrder(dto); }
  @Post('work-orders/:id/start') @RequirePermissions('maintenance.work_order.write') @A('work_order', 'UPDATE', 'start')
  startWo(@Param('id', ParseUUIDPipe) id: string) { return this.svc.startWorkOrder(id); }
  @Post('work-orders/:id/complete') @RequirePermissions('maintenance.work_order.write') @A('work_order', 'UPDATE', 'complete')
  completeWo(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResolveDto) { return this.svc.completeWorkOrder(id, dto); }
  @Post('work-orders/:id/cancel') @RequirePermissions('maintenance.work_order.write') @A('work_order', 'UPDATE', 'cancel')
  cancelWo(@Param('id', ParseUUIDPipe) id: string) { return this.svc.cancelWorkOrder(id); }

  @Get('spare-parts') listParts() { return this.svc.listSpareParts(); }
  @Post('spare-parts') @RequirePermissions('maintenance.spare_part.write') @A('spare_part', 'CREATE')
  createPart(@Body() dto: CreateSparePartDto) { return this.svc.createSparePart(dto); }
  @Post('spare-parts/:id/adjust') @RequirePermissions('maintenance.spare_part.write') @A('spare_part', 'UPDATE', 'adjust')
  adjust(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AdjustSparePartDto) { return this.svc.adjustSparePart(id, dto); }

  @Get('machines/:id/history')
  history(@Param('id', ParseUUIDPipe) id: string) { return this.svc.machineHistory(id); }
}
