import { ArrowRight } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, PageHeader, Panel } from '../components/ui';
import { apiGet } from '../lib/api';
import styles from './Dashboard.module.css';

interface HealthResponse {
  status: string;
}

interface Overview {
  sales: { confirmedOrders: number; confirmedValue: number; draftOrders: number };
  production: Record<string, number>;
  quality: { results: number; failed: number };
  inventory: { ledgerEntries: number; negativeProducts: number; totalKg: number };
  packing: Record<string, number>;
  dispatch: Record<string, number>;
  procurement: { pendingApproval: number; openOrders: number };
  maintenance: { openBreakdowns: number; overduePlans: number; lowStockParts: number; suspendedMachines: number };
  workforce: Record<string, number>;
  finance: { receivablesOutstanding: number; expensesPending: number; expensesApprovedValue: number };
  export: Record<string, number>;
  ai: { proposed: number; critical: number };
}

type HealthState = { kind: 'loading' } | { kind: 'ok' } | { kind: 'error'; message: string };
type Tone = 'warning' | 'negative' | 'info';

const rupees = (n: number) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const n = (v: number | undefined) => v ?? 0;
const sentence = (s: string) => {
  const t = s.toLowerCase().replaceAll('_', ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Things that need a person, derived from live counts. Zero-count signals are omitted. */
function attention(o: Overview) {
  const rows: { tone: Tone; text: string; to: string; cta: string }[] = [];
  if (n(o.inventory.negativeProducts)) rows.push({ tone: 'negative', text: `${plural(o.inventory.negativeProducts, 'product')} with negative stock`, to: '/inventory', cta: 'Inventory' });
  if (n(o.maintenance.openBreakdowns)) rows.push({ tone: 'negative', text: `${plural(o.maintenance.openBreakdowns, 'open breakdown')} — machines suspended until resolved`, to: '/maintenance', cta: 'Maintenance' });
  if (n(o.maintenance.overduePlans)) rows.push({ tone: 'warning', text: `${plural(o.maintenance.overduePlans, 'maintenance plan')} overdue`, to: '/maintenance', cta: 'Plans' });
  if (n(o.maintenance.lowStockParts)) rows.push({ tone: 'warning', text: `${plural(o.maintenance.lowStockParts, 'spare part')} at or below reorder level`, to: '/maintenance', cta: 'Spare parts' });
  if (n(o.procurement.pendingApproval)) rows.push({ tone: 'warning', text: `${plural(o.procurement.pendingApproval, 'purchase order')} awaiting approval`, to: '/procurement', cta: 'Review' });
  if (n(o.production.ON_HOLD)) rows.push({ tone: 'warning', text: `${plural(o.production.ON_HOLD, 'production batch', 'production batches')} on QC hold`, to: '/production', cta: 'Review' });
  if (n(o.finance.expensesPending)) rows.push({ tone: 'info', text: `${plural(o.finance.expensesPending, 'expense')} awaiting approval`, to: '/finance', cta: 'Finance' });
  if (n(o.dispatch.PENDING)) rows.push({ tone: 'info', text: `${plural(o.dispatch.PENDING, 'dispatch', 'dispatches')} waiting to leave the gate`, to: '/dispatch', cta: 'Dispatch' });
  if (n(o.ai.proposed)) rows.push({ tone: o.ai.critical ? 'negative' : 'info', text: `${plural(o.ai.proposed, 'AI finding')} to review${o.ai.critical ? ` (${o.ai.critical} critical)` : ''}`, to: '/ai-agents', cta: 'AI Agents' });
  return rows;
}

const PRODUCTION_ORDER = ['IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'RELEASED', 'REJECTED', 'CLOSED'];
const STATUS_COLOR: Record<string, string> = {
  IN_PROGRESS: 'var(--info)',
  COMPLETED: 'var(--accent)',
  RELEASED: 'var(--accent)',
  ON_HOLD: 'var(--warning)',
  REJECTED: 'var(--danger)',
  CLOSED: 'var(--text-faint)',
};

export function Dashboard() {
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' });
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<HealthResponse>('/health')
      .then(() => !cancelled && setHealth({ kind: 'ok' }))
      .catch((err: unknown) => !cancelled && setHealth({ kind: 'error', message: err instanceof Error ? err.message : 'Unknown error' }));
    apiGet<Overview>('/reports/overview')
      .then((o) => !cancelled && setOverview(o))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = overview ? attention(overview) : [];
  const prodTotal = overview ? PRODUCTION_ORDER.reduce((s, k) => s + n(overview.production[k]), 0) : 0;
  const present = overview ? n(overview.workforce.PRESENT) + n(overview.workforce.HALF_DAY) : 0;
  const marked = overview ? Object.values(overview.workforce).reduce((a, b) => a + b, 0) : 0;

  return (
    <section>
      <PageHeader
        title="Dashboard"
        description="Where the factory stands right now, computed from live records."
        actions={
          <span className={styles.health} data-testid="api-status">
            <span className={`${styles.dot} ${health.kind === 'ok' ? styles.dotOk : health.kind === 'error' ? styles.dotError : ''}`} />
            {health.kind === 'loading' && 'Checking API…'}
            {health.kind === 'ok' && 'API connected'}
            {health.kind === 'error' && <span role="alert">API unreachable: {health.message}</span>}
          </span>
        }
      />

      <div className={styles.kpis}>
        {overview ? (
          <>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Confirmed sales</span>
              <span className={styles.kpiValue}>{rupees(overview.sales.confirmedValue)}</span>
              <span className={styles.kpiSub}>{plural(overview.sales.confirmedOrders, 'order')} · {overview.sales.draftOrders} in draft</span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Receivable outstanding</span>
              <span className={styles.kpiValue}>{rupees(overview.finance.receivablesOutstanding)}</span>
              <Link to="/finance" className={styles.kpiLink}>Finance <ArrowRight size={12} /></Link>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Stock on hand</span>
              <span className={styles.kpiValue}>{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(overview.inventory.totalKg)} <small>kg</small></span>
              <span className={overview.inventory.negativeProducts ? styles.kpiBad : styles.kpiSub}>
                {overview.inventory.negativeProducts ? `${plural(overview.inventory.negativeProducts, 'product')} below zero` : `${overview.inventory.ledgerEntries} ledger entries`}
              </span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>QC results failed</span>
              <span className={styles.kpiValue}>
                {overview.quality.failed}
                <small> of {overview.quality.results}</small>
              </span>
              <Link to="/quality" className={styles.kpiLink}>Quality <ArrowRight size={12} /></Link>
            </div>
          </>
        ) : (
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={styles.kpi} aria-hidden="true">
              <span className={styles.skel} style={{ width: '60%' }} />
              <span className={styles.skel} style={{ width: '80%', height: 26 }} />
              <span className={styles.skel} style={{ width: '45%' }} />
            </div>
          ))
        )}
      </div>

      <div className={styles.split}>
        <Panel title="Needs attention" aside={overview && rows.length > 0 ? <span className="muted">{rows.length} item{rows.length === 1 ? '' : 's'}</span> : undefined}>
          {!overview && <div className={styles.skel} style={{ height: 120 }} />}
          {overview && rows.length === 0 && <EmptyState title="Nothing needs attention" hint="No approvals waiting, no open breakdowns, no negative stock." />}
          {rows.length > 0 && (
            <ul className={styles.attention}>
              {rows.map((r) => (
                <li key={r.text}>
                  <span className={`${styles.tone} ${styles[r.tone]}`} aria-hidden="true" />
                  <span>{r.text}</span>
                  <Link to={r.to} className={styles.rowLink}>{r.cta} <ArrowRight size={12} /></Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Order to delivery">
          {!overview ? (
            <div className={styles.skel} style={{ height: 220 }} />
          ) : (
            <ol className={styles.flow}>
              {[
                { to: '/procurement', label: 'Procurement', value: overview.procurement.openOrders, unit: 'open POs' },
                { to: '/production', label: 'Production', value: n(overview.production.IN_PROGRESS), unit: 'batches running' },
                { to: '/production', label: 'QC hold', value: n(overview.production.ON_HOLD), unit: 'awaiting decision', warn: n(overview.production.ON_HOLD) > 0 },
                { to: '/packing', label: 'Packing', value: n(overview.packing.IN_PROGRESS) + n(overview.packing.PENDING), unit: 'orders open' },
                { to: '/sales', label: 'Sales', value: overview.sales.confirmedOrders, unit: 'confirmed' },
                { to: '/dispatch', label: 'Dispatch', value: n(overview.dispatch.PENDING) + n(overview.dispatch.DISPATCHED), unit: 'in motion' },
                { to: '/export', label: 'Export', value: n(overview.export.IN_TRANSIT) + n(overview.export.LOADED) + n(overview.export.BOOKED), unit: 'containers' },
              ].map((s) => (
                <li key={s.label}>
                  <Link to={s.to} className={styles.stage}>
                    <span className={`${styles.pip} ${s.warn ? styles.pipWarn : ''}`} aria-hidden="true" />
                    <span className={styles.stageLabel}>{s.label}</span>
                    <span className={`${styles.stageValue} num`}>{s.value}</span>
                    <span className={styles.stageUnit}>{s.unit}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      {overview && (
        <div className={styles.trio}>
          <Panel title="Production batches" aside={<span className="muted num">{prodTotal} total</span>}>
            {prodTotal === 0 ? (
              <p className="muted">No batches yet.</p>
            ) : (
              <>
                <div className={styles.stack} role="img" aria-label="Production batches by status">
                  {PRODUCTION_ORDER.filter((k) => n(overview.production[k]) > 0).map((k) => (
                    <span key={k} style={{ flex: n(overview.production[k]), background: STATUS_COLOR[k] }} title={`${sentence(k)}: ${overview.production[k]}`} />
                  ))}
                </div>
                <ul className={styles.legend}>
                  {PRODUCTION_ORDER.filter((k) => n(overview.production[k]) > 0).map((k) => (
                    <li key={k}>
                      <span className={styles.swatch} style={{ background: STATUS_COLOR[k] }} />
                      {sentence(k)}
                      <b className="num">{overview.production[k]}</b>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
          <Panel title="Workforce today">
            {marked === 0 ? (
              <p className="muted">Attendance hasn’t been marked today.</p>
            ) : (
              <>
                <div className={styles.big}>{present}<small> of {marked} in</small></div>
                <ul className={styles.legend}>
                  {Object.entries(overview.workforce).map(([k, v]) => (
                    <li key={k}>{sentence(k)}<b className="num">{v}</b></li>
                  ))}
                </ul>
              </>
            )}
            <Link to="/workforce" className={styles.rowLink}>Workforce <ArrowRight size={12} /></Link>
          </Panel>
          <Panel title="Machine health">
            <ul className={styles.legend}>
              <li>Suspended machines<b className={`num ${overview.maintenance.suspendedMachines ? styles.bad : ''}`}>{overview.maintenance.suspendedMachines}</b></li>
              <li>Open breakdowns<b className={`num ${overview.maintenance.openBreakdowns ? styles.bad : ''}`}>{overview.maintenance.openBreakdowns}</b></li>
              <li>Overdue plans<b className={`num ${overview.maintenance.overduePlans ? styles.bad : ''}`}>{overview.maintenance.overduePlans}</b></li>
              <li>Parts at reorder level<b className="num">{overview.maintenance.lowStockParts}</b></li>
            </ul>
            <Link to="/maintenance" className={styles.rowLink}>Maintenance <ArrowRight size={12} /></Link>
          </Panel>
        </div>
      )}
    </section>
  );
}
