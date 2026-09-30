import { Inject, Injectable } from '@nestjs/common';
import { desc, sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../db/drizzle.provider';
import { stockLedger } from '../../db/schema';

@Injectable()
export class InventoryService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async listLedger() {
    return this.db.select().from(stockLedger).orderBy(desc(stockLedger.occurredAt));
  }

  /**
   * Computed, not stored — see the doc comment on `stockLedger` in
   * inventory.schema.ts for why there's no separate stock_balances
   * table. `id` here is synthesized (productId:locationId) purely so
   * the frontend's generic ResourceListPage, which expects every row to
   * have an `id`, can render this like any other list.
   */
  async getBalances() {
    const rows = await this.db
      .select({
        productId: stockLedger.productId,
        locationId: stockLedger.locationId,
        balanceKg: sql<string>`SUM(${stockLedger.quantityKg})`,
      })
      .from(stockLedger)
      .groupBy(stockLedger.productId, stockLedger.locationId);

    return rows.map((row) => ({
      id: `${row.productId}:${row.locationId ?? 'none'}`,
      ...row,
    }));
  }
}
