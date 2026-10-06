import { ArrowRight } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Badge } from '../components/Badge';
import { Tabs } from '../components/Tabs';
import { EmptyState, InlineError, Panel, PageHeader, TableSkeleton } from '../components/ui';
import { money, when } from '../lib/format';
import { ApiError, apiGet } from '../lib/api';
import tableStyles from '../components/ResourceListPage.module.css';
import styles from './Reports.module.css';

interface YieldRow { id: string; batchNumber: string; status: string; inputKg: number; outputKg: number; yieldPercent: number | null }
interface SalesRow { id: string; code: string; name: string; creditLimit: string | null; orders: number; value: string }
interface Trace {
  batch: { batchNumber: string; status: string; startedAt: string; completedAt: string | null };
  backward: {
    quantityKg: string; lotNumber: string; supplierCode: string | null; supplierName: string | null; poNumber: string | null; grnNumber: string | null;
    netWeightKg: string | null; weighedAt: string | null; vehicle: string | null; driver: string | null;
  }[];
  quality: { parameter: string; measuredValue: string; passed: boolean | null }[];
  forward: {
    packingOrderId: string; orderStatus: string; packagingType: string; lotNumber: string | null; quantityUnits: string | null; qcStatus: string | null;
    salesOrderNumber: string | null; customerCode: string | null; customerName: string | null; dispatchStatus: string | null;
  }[];
  limits: string;
}

function useFetch<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    apiGet<T>(path)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof ApiError ? e.message : 'Failed to load'));
    return () => {
      cancelled = true;
    };
  }, [path]);
  return { data, error };
}

function YieldTab() {
  const { data, error } = useFetch<YieldRow[]>('/reports/production-yield');
  if (error) return <InlineError>{error}</InlineError>;
  if (!data) return <TableSkeleton />;
  if (data.length === 0) return <EmptyState title="No production batches yet" hint="Yield is output kg as a share of the raw-material kg consumed." />;
  return (
    <div className={tableStyles.tableWrap}>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>Batch</th>
            <th>Status</th>
            <th className={tableStyles.right}>Input (kg)</th>
            <th className={tableStyles.right}>Output (kg)</th>
            <th style={{ width: '28%' }}>Yield</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id}>
              <td className={tableStyles.mono}>{r.batchNumber}</td>
              <td><Badge value={r.status} /></td>
              <td className={tableStyles.right}>{r.inputKg.toLocaleString('en-IN')}</td>
              <td className={tableStyles.right}>{r.outputKg.toLocaleString('en-IN')}</td>
              <td>
                {r.yieldPercent == null ? (
                  <span className="muted">no input recorded</span>
                ) : (
                  <span className={styles.yield}>
                    <span className={styles.track}>
                      <span className={`${styles.fill} ${r.yieldPercent > 100 ? styles.warn : ''}`} style={{ width: `${Math.min(100, r.yieldPercent)}%` }} />
                    </span>
                    <b className="num">{r.yieldPercent}%</b>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SalesTab() {
  const { data, error } = useFetch<SalesRow[]>('/reports/sales-by-customer');
  if (error) return <InlineError>{error}</InlineError>;
  if (!data) return <TableSkeleton />;
  if (data.length === 0) return <EmptyState title="No customers yet" />;
  const max = Math.max(1, ...data.map((r) => Number(r.value)));
  return (
    <div className={tableStyles.tableWrap}>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>Customer</th>
            <th className={tableStyles.right}>Confirmed orders</th>
            <th style={{ width: '34%' }}>Value</th>
            <th className={tableStyles.right}>Credit limit</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id}>
              <td>
                <span className={tableStyles.mono}>{r.code}</span> <span className="muted">{r.name}</span>
              </td>
              <td className={tableStyles.right}>{r.orders}</td>
              <td>
                <span className={styles.yield}>
                  <span className={styles.track}>
                    <span className={styles.fill} style={{ width: `${(Number(r.value) / max) * 100}%` }} />
                  </span>
                  <b className="num">{money(r.value)}</b>
                </span>
              </td>
              <td className={tableStyles.right}>{r.creditLimit == null ? <span className="muted">none</span> : money(r.creditLimit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Node({ label, value, sub }: { label: string; value: string | null; sub?: string | null }) {
  return (
    <div className={styles.node}>
      <div className={styles.nodeLabel}>{label}</div>
      <div className={styles.nodeValue}>{value ?? <span className="muted">not linked</span>}</div>
      {sub && <div className={styles.nodeSub}>{sub}</div>}
    </div>
  );
}

function TraceTab() {
  const [batches, setBatches] = useState<{ id: string; batchNumber: string; status: string }[]>([]);
  const [id, setId] = useState('');
  const [trace, setTrace] = useState<Trace | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<typeof batches>('/production-batches').then(setBatches).catch(() => {});
  }, []);

  function pick(next: string) {
    setId(next);
    setTrace(null);
    setError(null);
    if (!next) return;
    apiGet<Trace>(`/reports/traceability/batch/${next}`)
      .then(setTrace)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load'));
  }

  return (
    <div>
      <label className={styles.picker}>
        <span>Production batch</span>
        <select value={id} onChange={(e) => pick(e.target.value)}>
          <option value="">Select a batch…</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>{b.batchNumber} · {b.status.toLowerCase().replace('_', ' ')}</option>
          ))}
        </select>
      </label>
      {error && <InlineError>{error}</InlineError>}
      {!trace && !error && <EmptyState title="Pick a batch to trace" hint="See exactly which supplier, vehicle, weighment and purchase order every kilo of input came from, and where the output went." />}
      {trace && (
        <div className={styles.traceStack}>
          <Panel title="Where the input came from" aside={<span className="muted">{trace.backward.length} lot(s) consumed</span>}>
            {trace.backward.length === 0 && <p className="muted">No raw material has been consumed into this batch.</p>}
            {trace.backward.map((b) => (
              <div key={b.lotNumber} className={styles.chain}>
                <Node label="Supplier" value={b.supplierCode} sub={b.supplierName} />
                <ArrowRight className={styles.arrow} aria-hidden="true" />
                <Node label="Vehicle" value={b.vehicle} sub={b.driver} />
                <ArrowRight className={styles.arrow} aria-hidden="true" />
                <Node label="Weighment" value={b.netWeightKg == null ? null : `${b.netWeightKg} kg net`} sub={b.weighedAt ? when(b.weighedAt) : null} />
                <ArrowRight className={styles.arrow} aria-hidden="true" />
                <Node label="PO → Receipt" value={b.poNumber} sub={b.grnNumber} />
                <ArrowRight className={styles.arrow} aria-hidden="true" />
                <Node label="Lot" value={b.lotNumber} sub={`${b.quantityKg} kg consumed`} />
              </div>
            ))}
          </Panel>
          <Panel title={`Batch ${trace.batch.batchNumber}`} aside={<Badge value={trace.batch.status} />}>
            <p className="muted" style={{ margin: 0 }}>
              Started {when(trace.batch.startedAt)}
              {trace.batch.completedAt ? ` · completed ${when(trace.batch.completedAt)}` : ' · not completed'}
            </p>
            <h3>Quality results</h3>
            {trace.quality.length === 0 ? (
              <p className="muted">No QC results recorded.</p>
            ) : (
              <div className={styles.chips}>
                {trace.quality.map((q, i) => (
                  <span key={i} className={styles.chip}>
                    <b>{q.parameter}</b> {q.measuredValue} <Badge value={q.passed == null ? 'PENDING' : q.passed ? 'PASS' : 'FAIL'} />
                  </span>
                ))}
              </div>
            )}
          </Panel>
          <Panel title="Where the output went">
            {trace.forward.length === 0 ? (
              <p className="muted">Not packed yet.</p>
            ) : (
              <div className={tableStyles.tableWrap} style={{ boxShadow: 'none' }}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr><th>Packaging</th><th>Lot</th><th className={tableStyles.right}>Units</th><th>QC</th><th>Shipped to</th></tr>
                  </thead>
                  <tbody>
                    {trace.forward.map((f, i) => (
                      <tr key={i}>
                        <td>{f.packagingType}</td>
                        <td className={tableStyles.mono}>{f.lotNumber ?? '—'}</td>
                        <td className={tableStyles.right}>{f.quantityUnits ?? '—'}</td>
                        <td><Badge value={f.qcStatus} /></td>
                        <td>
                          {f.customerCode ? (
                            <>
                              <b>{f.customerCode}</b> <span className="muted">{f.customerName} · {f.salesOrderNumber}</span> <Badge value={f.dispatchStatus} />
                            </>
                          ) : f.lotNumber ? (
                            <span className="muted">packed, not shipped</span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className={styles.limit}>{trace.limits}</p>
          </Panel>
        </div>
      )}
    </div>
  );
}

interface OrderTrace {
  order: { orderNumber: string; status: string; totalAmount: string; customerCode: string; customerName: string };
  lots: { lotNumber: string; quantityUnits: string; packagingType: string; batchId: string; batchNumber: string; dispatchStatus: string }[];
  batches: { batchId: string; batchNumber: string; backward: Trace['backward'] }[];
  suppliers: string[];
  limits: string | null;
}

function RecallTab() {
  const [orders, setOrders] = useState<{ id: string; orderNumber: string; status: string }[]>([]);
  const [id, setId] = useState('');
  const [trace, setTrace] = useState<OrderTrace | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<typeof orders>('/sales-orders').then((o) => setOrders(o.filter((x) => x.status === 'CONFIRMED'))).catch(() => {});
  }, []);

  function pick(next: string) {
    setId(next);
    setTrace(null);
    setError(null);
    if (!next) return;
    apiGet<OrderTrace>(`/reports/traceability/sales-order/${next}`)
      .then(setTrace)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load'));
  }

  return (
    <div>
      <label className={styles.picker}>
        <span>Confirmed sales order</span>
        <select value={id} onChange={(e) => pick(e.target.value)}>
          <option value="">Select an order…</option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>{o.orderNumber}</option>
          ))}
        </select>
      </label>
      {error && <InlineError>{error}</InlineError>}
      {!trace && !error && <EmptyState title="Pick an order to run a recall trace" hint="Shows which batches went to this customer, and every supplier whose material is in them." />}
      {trace && (
        <div className={styles.traceStack}>
          <Panel title={`${trace.order.customerCode} — ${trace.order.customerName}`} aside={<span className="muted">{trace.order.orderNumber} · {money(trace.order.totalAmount)}</span>}>
            {trace.limits && <p className={styles.limit}>{trace.limits}</p>}
            {trace.suppliers.length > 0 && (
              <>
                <h3>Suppliers whose material is in this order</h3>
                <div className={styles.chips}>
                  {trace.suppliers.map((s) => <span key={s} className={styles.chip}><b>{s}</b></span>)}
                </div>
              </>
            )}
          </Panel>
          {trace.lots.length > 0 && (
            <Panel title="Lots shipped">
              <div className={tableStyles.tableWrap} style={{ boxShadow: 'none' }}>
                <table className={tableStyles.table}>
                  <thead><tr><th>Lot</th><th>Packaging</th><th className={tableStyles.right}>Units</th><th>Batch</th><th>Dispatch</th></tr></thead>
                  <tbody>
                    {trace.lots.map((l) => (
                      <tr key={l.lotNumber}>
                        <td className={tableStyles.mono}>{l.lotNumber}</td>
                        <td>{l.packagingType}</td>
                        <td className={tableStyles.right}>{l.quantityUnits}</td>
                        <td className={tableStyles.mono}>{l.batchNumber}</td>
                        <td><Badge value={l.dispatchStatus} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
          {trace.batches.map((b) => (
            <Panel key={b.batchId} title={`Raw material in ${b.batchNumber}`}>
              {b.backward.map((r) => (
                <div key={r.lotNumber} className={styles.chain}>
                  <Node label="Supplier" value={r.supplierCode} sub={r.supplierName} />
                  <ArrowRight className={styles.arrow} aria-hidden="true" />
                  <Node label="Vehicle" value={r.vehicle} sub={r.driver} />
                  <ArrowRight className={styles.arrow} aria-hidden="true" />
                  <Node label="PO → Receipt" value={r.poNumber} sub={r.grnNumber} />
                  <ArrowRight className={styles.arrow} aria-hidden="true" />
                  <Node label="Lot" value={r.lotNumber} sub={`${r.quantityKg} kg consumed`} />
                </div>
              ))}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReportsPage() {
  return (
    <section>
      <PageHeader title="Reports" description="Computed live from the operational tables — nothing here is stored or cached." />
      <Tabs
        tabs={[
          { label: 'Production yield', content: <YieldTab /> },
          { label: 'Sales by customer', content: <SalesTab /> },
          { label: 'Batch traceability', content: <TraceTab /> },
          { label: 'Customer recall', content: <RecallTab /> },
        ]}
      />
    </section>
  );
}
