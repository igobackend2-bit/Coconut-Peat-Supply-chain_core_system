import { PageHeader } from '../components/ui';
import { useEffect, useState } from 'react';
import { apiGet, ApiError } from '../lib/api';
import { Tabs } from '../components/Tabs';
import listStyles from '../components/ResourceListPage.module.css';

interface StockLedgerEntry {
  id: string;
  productId: string;
  locationId: string | null;
  movementType: string;
  quantityKg: string;
  referenceType: string | null;
  referenceId: string | null;
  occurredAt: string;
}

interface StockBalance {
  id: string;
  productId: string;
  locationId: string | null;
  balanceKg: string;
}

interface ProductOption {
  id: string;
  sku: string;
}

/**
 * Read-only by design — there is no create form here. Stock only moves
 * because a real business operation happened elsewhere (Production
 * consuming/producing, eventually Goods Receipt crediting on arrival —
 * see docs/api.md "Inventory"). A generic write form here would
 * contradict architecture.md §4's "never directly manipulate stock
 * balances without generating a stock movement."
 */
function useList<T>(path: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<T[]>(path)
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [path]);

  return { items, loading, error };
}

function BalancesPanel() {
  const { items: balances, loading, error } = useList<StockBalance>('/stock-balances');
  const { items: products } = useList<ProductOption>('/products');
  const skuFor = (id: string) => products.find((p) => p.id === id)?.sku ?? id.slice(0, 8);

  return (
    <section>
      
      <p className={listStyles.description}>
        Computed as SUM(quantity_kg) over stock_ledger — not a separately maintained table (see the doc comment in
        inventory.schema.ts for why).
      </p>
      {loading && <p>Loading…</p>}
      {error && (
        <p role="alert" className={listStyles.formError}>
          {error}
        </p>
      )}
      {!loading && !error && balances.length === 0 && <p className={listStyles.description}>No stock movements recorded yet.</p>}
      {!loading && !error && balances.length > 0 && (
        <table className={listStyles.table}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Location</th>
              <th>Balance (kg)</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.id}>
                <td>{skuFor(b.productId)}</td>
                <td>{b.locationId ?? '—'}</td>
                <td style={{ color: Number(b.balanceKg) < 0 ? 'var(--danger)' : undefined }}>{b.balanceKg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function LedgerPanel() {
  const { items: entries, loading, error } = useList<StockLedgerEntry>('/stock-ledger');
  const { items: products } = useList<ProductOption>('/products');
  const skuFor = (id: string) => products.find((p) => p.id === id)?.sku ?? id.slice(0, 8);

  return (
    <section>
      
      <p className={listStyles.description}>
        Append-only (database-level trigger, same pattern as audit_events) — every row here is a real, immutable stock
        movement, negative for consumption, positive for receipts/output.
      </p>
      {loading && <p>Loading…</p>}
      {error && (
        <p role="alert" className={listStyles.formError}>
          {error}
        </p>
      )}
      {!loading && !error && (
        <table className={listStyles.table}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Movement</th>
              <th>Quantity (kg)</th>
              <th>Reference</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{skuFor(e.productId)}</td>
                <td>{e.movementType.replaceAll('_', ' ')}</td>
                <td style={{ color: Number(e.quantityKg) < 0 ? 'var(--danger)' : 'var(--accent)' }}>{e.quantityKg}</td>
                <td>{e.referenceType ?? '—'}</td>
                <td>{new Date(e.occurredAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function InventoryPage() {
  return (
    <section>
      <PageHeader title="Inventory" description="Stock is never edited directly — every balance is the sum of immutable ledger movements written by receiving, production and (later) dispatch." />
      <Tabs
        tabs={[
          { label: 'Balances', content: <BalancesPanel /> },
          { label: 'Ledger', content: <LedgerPanel /> },
        ]}
      />
    </section>
  );
}
