import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { Badge } from '../components/Badge';
import { StatCard } from '../components/StatCard';
import styles from './Dashboard.module.css';

interface HealthResponse {
  status: string;
  service: string;
}

interface WithId {
  id: string;
}

interface PurchaseOrder extends WithId {
  poNumber: string;
  status: string;
  totalAmount: string;
}

interface ProductionBatch extends WithId {
  batchNumber: string;
  status: string;
}

type HealthState = { kind: 'loading' } | { kind: 'ok' } | { kind: 'error'; message: string };

/**
 * Real KPI dashboard, not just a health check — counts are live data
 * from the modules that actually exist (docs/roadmap.md Phases 1-3).
 * Each list is fetched independently (Promise.allSettled) so one
 * endpoint failing doesn't blank the whole page — matches how
 * ResourceListPage/ProcurementPage/ProductionPage already handle
 * partial failure per-section rather than all-or-nothing.
 */
export function Dashboard() {
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' });
  const [counts, setCounts] = useState<Record<string, number | null>>({
    products: null,
    suppliers: null,
    customers: null,
    warehouses: null,
  });
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);

  useEffect(() => {
    let cancelled = false;

    apiGet<HealthResponse>('/health')
      .then(() => !cancelled && setHealth({ kind: 'ok' }))
      .catch((err: unknown) =>
        !cancelled && setHealth({ kind: 'error', message: err instanceof Error ? err.message : 'Unknown error' }),
      );

    const countEndpoints: [keyof typeof counts, string][] = [
      ['products', '/products'],
      ['suppliers', '/suppliers'],
      ['customers', '/customers'],
      ['warehouses', '/warehouses'],
    ];
    countEndpoints.forEach(([key, path]) => {
      apiGet<WithId[]>(path)
        .then((data) => !cancelled && setCounts((prev) => ({ ...prev, [key]: data.length })))
        .catch(() => !cancelled && setCounts((prev) => ({ ...prev, [key]: null })));
    });

    apiGet<PurchaseOrder[]>('/purchase-orders')
      .then((data) => !cancelled && setPurchaseOrders(data))
      .catch(() => {});
    apiGet<ProductionBatch[]>('/production-batches')
      .then((data) => !cancelled && setBatches(data))
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const pendingPOs = purchaseOrders.filter((po) => po.status === 'PENDING_APPROVAL');
  const heldBatches = batches.filter((b) => b.status === 'ON_HOLD');
  const inProgressBatches = batches.filter((b) => b.status === 'IN_PROGRESS').length;

  return (
    <section>
      <div className={styles.header}>
        <div>
          <h1>Dashboard</h1>
          <p className={styles.subtitle}>Live snapshot across every implemented module.</p>
        </div>
        <span className={styles.healthBadge} data-testid="api-status">
          <span
            className={`${styles.dot} ${health.kind === 'ok' ? styles.dotOk : health.kind === 'error' ? styles.dotError : ''}`}
          />
          {health.kind === 'loading' && 'Checking API…'}
          {health.kind === 'ok' && 'API connected'}
          {health.kind === 'error' && <span role="alert">API unreachable: {health.message}</span>}
        </span>
      </div>

      <div className={styles.grid}>
        <StatCard label="Products" value={counts.products ?? '—'} linkTo="/master-data" />
        <StatCard label="Suppliers" value={counts.suppliers ?? '—'} linkTo="/master-data" />
        <StatCard label="Customers" value={counts.customers ?? '—'} linkTo="/master-data" />
        <StatCard label="Warehouses" value={counts.warehouses ?? '—'} linkTo="/master-data" />
        <StatCard
          label="POs Pending Approval"
          value={pendingPOs.length}
          hint={pendingPOs.length > 0 ? 'Needs a decision' : undefined}
          linkTo="/procurement"
        />
        <StatCard label="Batches In Progress" value={inProgressBatches} linkTo="/production" />
        <StatCard
          label="Batches On Hold"
          value={heldBatches.length}
          hint={heldBatches.length > 0 ? 'QC flagged an out-of-spec result' : undefined}
          linkTo="/production"
        />
      </div>

      <div className={styles.panel}>
        <h2>Needs Attention</h2>
        {pendingPOs.length === 0 && heldBatches.length === 0 && (
          <p className={styles.empty}>Nothing pending — all purchase orders and production batches are clear.</p>
        )}
        {pendingPOs.map((po) => (
          <div key={po.id} className={styles.attentionRow}>
            <span>
              Purchase Order <strong>{po.poNumber}</strong> — ₹{po.totalAmount} awaiting approval
            </span>
            <span>
              <Badge value={po.status} /> <Link to="/procurement">Review →</Link>
            </span>
          </div>
        ))}
        {heldBatches.map((b) => (
          <div key={b.id} className={styles.attentionRow}>
            <span>
              Production Batch <strong>{b.batchNumber}</strong> is on hold
            </span>
            <span>
              <Badge value={b.status} /> <Link to="/production">Review →</Link>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
