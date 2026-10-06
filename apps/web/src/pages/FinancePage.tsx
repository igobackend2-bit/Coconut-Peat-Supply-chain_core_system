import { useEffect, useState } from 'react';
import { ActionButton } from '../components/ActionButton';
import { Badge } from '../components/Badge';
import { ResourceListPage } from '../components/ResourceListPage';
import { Tabs } from '../components/Tabs';
import { EmptyState, InlineError, Panel, PageHeader, Stat, TableSkeleton } from '../components/ui';
import { money } from '../lib/format';
import { ApiError, apiGet, apiPost } from '../lib/api';
import { useLookup } from '../lib/useLookup';
import tableStyles from '../components/ResourceListPage.module.css';
import styles from './Finance.module.css';

interface Expense { id: string; expenseNumber: string; category: string; description: string; amount: string; expenseDate: string; status: string; costCentreId: string | null }
interface Payment { id: string; paymentNumber: string; direction: string; salesOrderId: string | null; purchaseOrderId: string | null; amount: string; method: string; paidAt: string }
interface CostCentre { id: string; code: string; name: string }
interface Summary {
  approvedByCategory: { category: string; total: number; count: number }[];
  expensesByStatus: { status: string; total: number; count: number }[];
  receivablesOutstanding: number;
  payablesOutstanding: number;
}
interface Receivables {
  orders: { salesOrderId: string; orderNumber: string; customerId: string; total: number; received: number; outstanding: number }[];
  byCustomer: { customerId: string; code: string; name: string; creditLimit: number | null; outstanding: number }[];
  totalOutstanding: number;
}
interface Payables {
  orders: { purchaseOrderId: string; poNumber: string; supplierId: string; total: number; paid: number; outstanding: number }[];
  totalOutstanding: number;
}
interface BatchCost {
  batchNumber: string;
  status: string;
  materialCost: number;
  outputKg: number;
  materialCostPerKg: number | null;
  labourHours: number;
  notCosted: string[];
  lines: { lotNumber: string; poNumber: string; quantityKg: string; unitPrice: string; cost: number }[];
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

function Overview() {
  const { data, error } = useFetch<Summary>('/finance/summary');
  if (error) return <InlineError>{error}</InlineError>;
  if (!data) return <TableSkeleton rows={3} cols={3} />;
  const maxCat = Math.max(1, ...data.approvedByCategory.map((c) => c.total));
  return (
    <div className={styles.overview}>
      <Panel title="Position">
        <div className={styles.stats}>
          <Stat label="Receivable (outstanding)" value={money(data.receivablesOutstanding)} tone={data.receivablesOutstanding > 0 ? 'warning' : undefined} />
          <Stat label="Payable (outstanding)" value={money(data.payablesOutstanding)} tone={data.payablesOutstanding > 0 ? 'warning' : undefined} />
        </div>
        <h3>Expenses by status</h3>
        <div className={styles.statusRow}>
          {data.expensesByStatus.length === 0 && <span className="muted">No expenses recorded.</span>}
          {data.expensesByStatus.map((s) => (
            <span key={s.status} className={styles.statusChip}>
              <Badge value={s.status} /> <b>{s.count}</b> <span className="muted">· {money(s.total)}</span>
            </span>
          ))}
        </div>
      </Panel>
      <Panel title="Approved spend by category">
        {data.approvedByCategory.length === 0 ? (
          <p className="muted">Nothing approved yet.</p>
        ) : (
          <ul className={styles.bars}>
            {data.approvedByCategory.map((c) => (
              <li key={c.category}>
                <span className={styles.barLabel}>{c.category.replaceAll('_', ' ').toLowerCase()}</span>
                <span className={styles.barTrack}>
                  <span className={styles.barFill} style={{ width: `${(c.total / maxCat) * 100}%` }} />
                </span>
                <span className={`${styles.barValue} num`}>{money(c.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function ReceivablesTab() {
  const { data, error } = useFetch<Receivables>('/finance/receivables');
  const customer = useLookup('/customers', (r) => String(r.code));
  if (error) return <InlineError>{error}</InlineError>;
  if (!data) return <TableSkeleton />;
  if (data.orders.length === 0) return <EmptyState title="No confirmed sales orders" hint="Receivables are the unpaid part of confirmed orders." />;
  return (
    <div className={styles.stack}>
      <Panel title="Customer exposure" aside={<span className="muted">Outstanding vs credit limit</span>}>
        <ul className={styles.bars}>
          {data.byCustomer.map((c) => {
            const pct = c.creditLimit ? Math.min(100, (c.outstanding / c.creditLimit) * 100) : 0;
            const over = c.creditLimit != null && c.outstanding > c.creditLimit;
            return (
              <li key={c.customerId}>
                <span className={styles.barLabel}>{c.code}</span>
                <span className={styles.barTrack}>
                  <span className={`${styles.barFill} ${over ? styles.over : ''}`} style={{ width: `${c.creditLimit ? pct : 0}%` }} />
                </span>
                <span className={`${styles.barValue} num`}>
                  {money(c.outstanding)}
                  <span className="muted"> / {c.creditLimit == null ? 'no limit' : money(c.creditLimit)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th className={tableStyles.right}>Total</th>
              <th className={tableStyles.right}>Received</th>
              <th className={tableStyles.right}>Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.map((o) => (
              <tr key={o.salesOrderId}>
                <td className={tableStyles.mono}>{o.orderNumber}</td>
                <td>{customer(o.customerId)}</td>
                <td className={tableStyles.right}>{money(o.total)}</td>
                <td className={tableStyles.right}>{money(o.received)}</td>
                <td className={tableStyles.right}>
                  <b>{money(o.outstanding)}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PayablesTab() {
  const { data, error } = useFetch<Payables>('/finance/payables');
  const supplier = useLookup('/suppliers', (r) => String(r.name));
  if (error) return <InlineError>{error}</InlineError>;
  if (!data) return <TableSkeleton />;
  if (data.orders.length === 0) return <EmptyState title="No approved purchase orders" hint="Payables are the unpaid part of approved purchase orders." />;
  return (
    <div className={tableStyles.tableWrap}>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>Purchase order</th>
            <th>Supplier</th>
            <th className={tableStyles.right}>Total</th>
            <th className={tableStyles.right}>Paid</th>
            <th className={tableStyles.right}>Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {data.orders.map((o) => (
            <tr key={o.purchaseOrderId}>
              <td className={tableStyles.mono}>{o.poNumber}</td>
              <td>{supplier(o.supplierId)}</td>
              <td className={tableStyles.right}>{money(o.total)}</td>
              <td className={tableStyles.right}>{money(o.paid)}</td>
              <td className={tableStyles.right}>
                <b>{money(o.outstanding)}</b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BatchCosting() {
  const [batches, setBatches] = useState<{ id: string; batchNumber: string; status: string }[]>([]);
  const [id, setId] = useState('');
  const [cost, setCost] = useState<BatchCost | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<typeof batches>('/production-batches').then(setBatches).catch(() => {});
  }, []);

  function pick(next: string) {
    setId(next);
    setError(null);
    setCost(null);
    if (!next) return;
    apiGet<BatchCost>(`/finance/batch-costs/${next}`)
      .then(setCost)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Failed to load'));
  }

  return (
    <div>
      <label className={styles.picker}>
        <span>Production batch</span>
        <select value={id} onChange={(e) => pick(e.target.value)}>
          <option value="">Select a batch…</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.batchNumber} · {b.status.toLowerCase().replace('_', ' ')}
            </option>
          ))}
        </select>
      </label>
      {error && <InlineError>{error}</InlineError>}
      {!cost && !error && <EmptyState title="Pick a batch" hint="Material cost is what the consumed raw-material lots cost on their purchase orders." />}
      {cost && (
        <div className={styles.stack}>
          <Panel title={cost.batchNumber} aside={<Badge value={cost.status} />}>
            <div className={styles.stats}>
              <Stat label="Material cost" value={money(cost.materialCost)} />
              <Stat label="Output" value={`${cost.outputKg.toLocaleString('en-IN')} kg`} />
              <Stat label="Material cost / kg" value={cost.materialCostPerKg == null ? '—' : money(cost.materialCostPerKg)} />
              <Stat label="Labour logged" value={`${cost.labourHours} h`} />
            </div>
            <p className={styles.caveat}>
              Material only. <b>Not costed:</b> {cost.notCosted.join(', ').toLowerCase()} — there’s no wage, machine-rate or overhead data yet, so true cost per kg is higher than shown.
            </p>
          </Panel>
          <div className={tableStyles.tableWrap}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Lot</th>
                  <th>Purchase order</th>
                  <th className={tableStyles.right}>Consumed (kg)</th>
                  <th className={tableStyles.right}>Unit price</th>
                  <th className={tableStyles.right}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {cost.lines.map((l) => (
                  <tr key={l.lotNumber}>
                    <td className={tableStyles.mono}>{l.lotNumber}</td>
                    <td className={tableStyles.mono}>{l.poNumber}</td>
                    <td className={tableStyles.right}>{l.quantityKg}</td>
                    <td className={tableStyles.right}>{money(l.unitPrice)}</td>
                    <td className={tableStyles.right}>{money(l.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

export function FinancePage() {
  const costCentre = useLookup('/cost-centres', (r) => String(r.name));
  const salesOrder = useLookup('/sales-orders', (r) => String(r.orderNumber));
  const purchaseOrder = useLookup('/purchase-orders', (r) => String(r.poNumber));

  return (
    <section>
      <PageHeader
        title="Finance"
        description="Operational finance only — expenses, payments, receivables and batch costing. The general ledger lives in the central IGO ERP and isn’t duplicated here."
      />
      <Tabs
        tabs={[
          { label: 'Overview', content: <Overview /> },
          {
            label: 'Expenses',
            content: (
              <ResourceListPage<Expense>
                title="Expenses"
                description="You can’t approve or reject an expense you submitted yourself."
                listPath="/expenses"
                createPath="/expenses"
                createLabel="Submit expense"
                createFields={[
                  { name: 'category', label: 'Category', type: 'select', required: true, options: ['RAW_MATERIAL', 'LABOUR', 'UTILITIES', 'MAINTENANCE', 'LOGISTICS', 'PACKAGING', 'OTHER'].map((c) => ({ value: c, label: c.replace('_', ' ').toLowerCase() })) },
                  { name: 'amount', label: 'Amount', type: 'number', step: 0.01, min: 0, required: true },
                  { name: 'expenseDate', label: 'Date', type: 'date', required: true, defaultValue: today() },
                  { name: 'costCentreId', label: 'Cost centre', type: 'reference', endpoint: '/cost-centres', labelKey: 'name' },
                  { name: 'description', label: 'Description', type: 'textarea', required: true },
                ]}
                columns={[
                  { key: 'expenseNumber', label: 'Number', mono: true },
                  { key: 'category', label: 'Category', render: (r) => r.category.replace('_', ' ').toLowerCase() },
                  { key: 'description', label: 'Description' },
                  { key: 'costCentreId', label: 'Cost centre', render: (r) => costCentre(r.costCentreId) },
                  { key: 'expenseDate', label: 'Date' },
                  { key: 'amount', label: 'Amount', align: 'right', render: (r) => money(r.amount) },
                  { key: 'status', label: 'Status' },
                ]}
                rowActions={(r, reload) =>
                  r.status === 'SUBMITTED' ? (
                    <>
                      <ActionButton label="Approve" tone="primary" ask={{ placeholder: 'Reason (optional)' }} run={(n) => apiPost(`/expenses/${r.id}/approve`, { reason: n || undefined })} onDone={reload} />
                      <ActionButton label="Reject" tone="danger" ask={{ placeholder: 'Reason (optional)' }} run={(n) => apiPost(`/expenses/${r.id}/reject`, { reason: n || undefined })} onDone={reload} />
                    </>
                  ) : null
                }
              />
            ),
          },
          {
            label: 'Payments',
            content: (
              <ResourceListPage<Payment>
                title="Payments"
                description="Incoming payments settle a confirmed sales order, outgoing ones an approved purchase order. A payment can’t exceed what’s still outstanding."
                listPath="/payments"
                createPath="/payments"
                createLabel="Record payment"
                createFields={[
                  { name: 'direction', label: 'Direction', type: 'select', required: true, options: [{ value: 'INCOMING', label: 'Incoming (from a customer)' }, { value: 'OUTGOING', label: 'Outgoing (to a supplier)' }] },
                  { name: 'salesOrderId', label: 'Sales order', type: 'reference', endpoint: '/sales-orders', labelKey: 'orderNumber', filter: (o) => o.status === 'CONFIRMED', hint: 'For incoming' },
                  { name: 'purchaseOrderId', label: 'Purchase order', type: 'reference', endpoint: '/purchase-orders', labelKey: 'poNumber', filter: (o) => ['APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(String(o.status)), hint: 'For outgoing' },
                  { name: 'amount', label: 'Amount', type: 'number', step: 0.01, min: 0, required: true },
                  { name: 'method', label: 'Method', type: 'text', defaultValue: 'BANK_TRANSFER' },
                  { name: 'reference', label: 'Reference', type: 'text', hint: 'UTR / cheque number' },
                ]}
                columns={[
                  { key: 'paymentNumber', label: 'Number', mono: true },
                  { key: 'direction', label: 'Direction', badge: true },
                  { key: 'against', label: 'Against', mono: true, render: (r) => (r.salesOrderId ? salesOrder(r.salesOrderId) : purchaseOrder(r.purchaseOrderId)) },
                  { key: 'amount', label: 'Amount', align: 'right', render: (r) => money(r.amount) },
                  { key: 'method', label: 'Method' },
                  { key: 'paidAt', label: 'Paid', render: (r) => new Date(r.paidAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) },
                ]}
              />
            ),
          },
          { label: 'Receivables', content: <ReceivablesTab /> },
          { label: 'Payables', content: <PayablesTab /> },
          { label: 'Batch costing', content: <BatchCosting /> },
          {
            label: 'Cost centres',
            content: (
              <ResourceListPage<CostCentre>
                title="Cost centres"
                listPath="/cost-centres"
                createPath="/cost-centres"
                createLabel="New cost centre"
                createFields={[
                  { name: 'code', label: 'Code', type: 'text', required: true },
                  { name: 'name', label: 'Name', type: 'text', required: true },
                ]}
                columns={[
                  { key: 'code', label: 'Code', mono: true },
                  { key: 'name', label: 'Name' },
                ]}
              />
            ),
          },
        ]}
      />
    </section>
  );
}
