import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuditLog } from '../../common/audit/audit-log.decorator';
import { RequirePermissions } from '../identity/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import {
  CreateContainerDto,
  CreateExportCustomerDto,
  CreateMilestoneDto,
  CreateProformaDto,
  CreateProformaItemDto,
} from './export.dto';
import { ExportService } from './export.service';

@Controller()
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class ExportController {
  constructor(private readonly svc: ExportService) {}

  @Get('export-customers') listCustomers() { return this.svc.listCustomers(); }

  @Post('export-customers')
  @RequirePermissions('export.customer.write')
  @AuditLog({ module: 'EXPORT', entityType: 'export_customer', actionType: 'CREATE' })
  createCustomer(@Body() dto: CreateExportCustomerDto) { return this.svc.createCustomer(dto); }

  @Get('proforma-invoices') listProformas() { return this.svc.listProformas(); }
  @Get('proforma-invoices/:id') findProforma(@Param('id', ParseUUIDPipe) id: string) { return this.svc.findProforma(id); }

  @Post('proforma-invoices')
  @RequirePermissions('export.invoice.write')
  @AuditLog({ module: 'EXPORT', entityType: 'proforma_invoice', actionType: 'CREATE' })
  createProforma(@Body() dto: CreateProformaDto) { return this.svc.createProforma(dto); }

  @Get('proforma-invoices/:id/items') listItems(@Param('id', ParseUUIDPipe) id: string) { return this.svc.listProformaItems(id); }

  @Post('proforma-invoices/:id/items')
  @RequirePermissions('export.invoice.write')
  @AuditLog({ module: 'EXPORT', entityType: 'proforma_invoice_item', actionType: 'CREATE' })
  addItem(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateProformaItemDto) { return this.svc.addProformaItem(id, dto); }

  @Post('proforma-invoices/:id/issue')
  @RequirePermissions('export.invoice.write')
  @AuditLog({ module: 'EXPORT', entityType: 'proforma_invoice', actionType: 'UPDATE', operation: 'issue' })
  issue(@Param('id', ParseUUIDPipe) id: string) { return this.svc.issueProforma(id); }

  @Post('proforma-invoices/:id/cancel')
  @RequirePermissions('export.invoice.write')
  @AuditLog({ module: 'EXPORT', entityType: 'proforma_invoice', actionType: 'UPDATE', operation: 'cancel' })
  cancel(@Param('id', ParseUUIDPipe) id: string) { return this.svc.cancelProforma(id); }

  @Post('proforma-invoices/:id/convert')
  @RequirePermissions('export.invoice.write')
  @AuditLog({ module: 'EXPORT', entityType: 'commercial_invoice', actionType: 'CREATE', operation: 'convert_from_proforma' })
  convert(@Param('id', ParseUUIDPipe) id: string) { return this.svc.convertProforma(id); }

  @Get('commercial-invoices') listCommercial() { return this.svc.listCommercialInvoices(); }

  @Post('commercial-invoices/:id/mark-paid')
  @RequirePermissions('export.invoice.write')
  @AuditLog({ module: 'EXPORT', entityType: 'commercial_invoice', actionType: 'UPDATE', operation: 'mark_paid' })
  markPaid(@Param('id', ParseUUIDPipe) id: string) { return this.svc.markCommercialPaid(id); }

  @Get('containers') listContainers() { return this.svc.listContainers(); }

  @Post('containers')
  @RequirePermissions('export.container.write')
  @AuditLog({ module: 'EXPORT', entityType: 'container', actionType: 'CREATE' })
  createContainer(@Body() dto: CreateContainerDto) { return this.svc.createContainer(dto); }

  @Get('containers/:id/milestones') listMilestones(@Param('id', ParseUUIDPipe) id: string) { return this.svc.listMilestones(id); }

  @Post('containers/:id/milestones')
  @RequirePermissions('export.container.write')
  @AuditLog({ module: 'EXPORT', entityType: 'shipment_milestone', actionType: 'CREATE' })
  addMilestone(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateMilestoneDto) { return this.svc.addMilestone(id, dto); }
}
