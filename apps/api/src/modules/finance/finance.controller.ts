import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../common/audit/audit-log.decorator';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { RequirePermissions } from '../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { RequestUser } from '../identity/types';
import { CreateCostCentreDto, CreateExpenseDto, CreatePaymentDto, DecideExpenseDto } from './finance.dto';
import { FinanceService } from './finance.service';

@Controller()
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class FinanceController {
  constructor(private readonly svc: FinanceService) {}

  @Get('cost-centres') @RequirePermissions('finance.read') listCc() { return this.svc.listCostCentres(); }
  @Post('cost-centres') @RequirePermissions('finance.cost_centre.write')
  @AuditLog({ module: 'FINANCE', entityType: 'cost_centre', actionType: 'CREATE' })
  createCc(@Body() dto: CreateCostCentreDto) { return this.svc.createCostCentre(dto); }

  @Get('expenses') @RequirePermissions('finance.read') listExpenses() { return this.svc.listExpenses(); }
  @Post('expenses') @RequirePermissions('finance.expense.write')
  @AuditLog({ module: 'FINANCE', entityType: 'expense', actionType: 'CREATE' })
  submit(@Body() dto: CreateExpenseDto, @CurrentUser() u: RequestUser) { return this.svc.submitExpense(dto, u.id); }

  @Post('expenses/:id/approve') @RequirePermissions('finance.expense.approve')
  @AuditLog({ module: 'FINANCE', entityType: 'expense', actionType: 'APPROVE', operation: 'approve' })
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecideExpenseDto, @CurrentUser() u: RequestUser) { return this.svc.approveExpense(id, dto, u.id); }

  @Post('expenses/:id/reject') @RequirePermissions('finance.expense.approve')
  @AuditLog({ module: 'FINANCE', entityType: 'expense', actionType: 'REJECT', operation: 'reject' })
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecideExpenseDto, @CurrentUser() u: RequestUser) { return this.svc.rejectExpense(id, dto, u.id); }

  @Get('payments') @RequirePermissions('finance.read') listPayments() { return this.svc.listPayments(); }
  @Post('payments') @RequirePermissions('finance.payment.write')
  @AuditLog({ module: 'FINANCE', entityType: 'payment', actionType: 'CREATE' })
  pay(@Body() dto: CreatePaymentDto, @CurrentUser() u: RequestUser) { return this.svc.recordPayment(dto, u.id); }

  @Get('finance/summary') @RequirePermissions('finance.read') summary() { return this.svc.summary(); }
  @Get('finance/receivables') @RequirePermissions('finance.read') receivables() { return this.svc.receivables(); }
  @Get('finance/payables') @RequirePermissions('finance.read') payables() { return this.svc.payables(); }
  @Get('finance/batch-costs/:batchId') @RequirePermissions('finance.read') batchCost(@Param('batchId', ParseUUIDPipe) id: string) { return this.svc.batchCost(id); }
}
