import { Controller, Get, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../identity/guards/permissions.guard';
import { SessionAuthGuard } from '../identity/guards/session-auth.guard';
import { InventoryService } from './inventory.service';

/**
 * Read-only on purpose: there is no `POST /stock-ledger`. Ledger entries
 * are only ever written by the business operation that causes a real
 * stock movement (e.g. ProductionBatchesService consuming a raw
 * material lot) — never directly by a client, per architecture.md §4
 * ("never directly manipulate stock balances without generating a stock
 * movement"). Manual `ADJUSTMENT` entries will need their own reasoned
 * endpoint later, not a generic write here.
 */
@Controller()
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stock-ledger')
  listLedger() {
    return this.inventoryService.listLedger();
  }

  @Get('stock-balances')
  getBalances() {
    return this.inventoryService.getBalances();
  }
}
