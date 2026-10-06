import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../common/audit/audit-log.decorator';
import { RequirePermissions } from '../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { CreateAllocationDto, CreateAttendanceDto, CreateShiftDto } from './workforce.dto';
import { WorkforceService } from './workforce.service';

@Controller()
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class WorkforceController {
  constructor(private readonly svc: WorkforceService) {}

  @Get('shifts') listShifts() { return this.svc.listShifts(); }
  @Post('shifts') @RequirePermissions('workforce.shift.write')
  @AuditLog({ module: 'WORKFORCE', entityType: 'shift', actionType: 'CREATE' })
  createShift(@Body() dto: CreateShiftDto) { return this.svc.createShift(dto); }

  @Get('attendance') listAttendance(@Query('date') date?: string) { return this.svc.listAttendance(date); }
  @Get('attendance/summary') summary(@Query('date') date: string = new Date().toISOString().slice(0, 10)) { return this.svc.summary(date); }
  @Post('attendance') @RequirePermissions('workforce.attendance.write')
  @AuditLog({ module: 'WORKFORCE', entityType: 'attendance', actionType: 'CREATE' })
  mark(@Body() dto: CreateAttendanceDto) { return this.svc.markAttendance(dto); }

  @Get('labour-allocations') listAllocations(@Query('date') date?: string) { return this.svc.listAllocations(date); }
  @Post('labour-allocations') @RequirePermissions('workforce.allocation.write')
  @AuditLog({ module: 'WORKFORCE', entityType: 'labour_allocation', actionType: 'CREATE' })
  allocate(@Body() dto: CreateAllocationDto) { return this.svc.allocate(dto); }
}
