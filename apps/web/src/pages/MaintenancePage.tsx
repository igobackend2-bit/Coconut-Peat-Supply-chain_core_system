import { useEffect, useState } from 'react';
import { ActionButton } from '../components/ActionButton';
import { Badge } from '../components/Badge';
import { ResourceListPage } from '../components/ResourceListPage';
import { Tabs } from '../components/Tabs';
import { EmptyState, InlineError, Panel, PageHeader } from '../components/ui';
import { when } from '../lib/format';
import { ApiError, apiGet, apiPost } from '../lib/api';
import { useLookup } from '../lib/useLookup';
import styles from './Maintenance.module.css';

interface Breakdown { id: string; machineId: string; description: string; severity: string; status: string; reportedAt: string; resolvedAt: string | null }
interface WorkOrder { id: string; workOrderNumber: string; machineId: string; type: string; title: string; status: string; assignedToEmployeeId: string | null }
interface Plan { id: string; machineId: string; title: string; frequencyDays: number; nextDueDate: string; status: string }
interface Part { id: string; code: string; name: string; quantityOnHand: number; reorderLevel: number }
interface Machine { id: string; code: string; name: string; status: string }
interface HistoryEvent { kind: string; at: string; title: string; status: string; severity: string | null; id: string }

const today = () => new Date().toISOString().slice(0, 10);
const machineLabel = (r: Record<string, unknown>) => `${r.code} — ${r.name}`;

function MachineHistory() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineId, setMachineId] = useState('');
  const [data, setData] = useState<{ machine: Machine; events: HistoryEvent[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Machine[]>('/machines').then(setMachines).catch(() => {});
  }, []);

  function pick(id: string) {
    setMachineId(id);
    setError(null);
    if (!id) {
      setData(null);
      return;
    }
    apiGet<{ machine: Machine; events: HistoryEvent[] }>(`/machines/${id}/history`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load history'));
  }

  return (
    <div>
      <label className={styles.picker}>
        <span>Machine</span>
        <select value={machineId} onChange={(e) => pick(e.target.value)}>
          <option value="">Select a machine…</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
          ))}
        </select>
      </label>
      {error && <InlineError>{error}</InlineError>}
      {!data && !error && <EmptyState title="Pick a machine" hint="Its breakdowns and work orders appear here as one timeline, newest first." />}
      {data && (
        <Panel title={`${data.machine.code} — ${data.machine.name}`} aside={<Badge value={data.machine.status} />}>
          {data.events.length === 0 ? (
            <p className="muted">No breakdowns or work orders recorded for this machine.</p>
          ) : (
            <ol className={styles.timeline}>
              {data.events.map((e) => (
                <li key={`${e.kind}-${e.id}`}>
                  <span className={styles.when}>{when(e.at)}</span>
                  <span className={styles.kind}>{e.kind.replaceAll('_', ' ').toLowerCase()}</span>
                  <span className={styles.title}>{e.title}</span>
                  {e.severity && <Badge value={e.severity} />}
                  <Badge value={e.status} />
                </li>
              ))}
            </ol>
          )}
        </Panel>
      )}
    </div>
  );
}

export function MaintenancePage() {
  const machine = useLookup('/machines', machineLabel);
  const employee = useLookup('/employees', (r) => String(r.fullName));

  return (
    <section>
      <PageHeader
        title="Maintenance"
        description="Reporting a breakdown suspends the machine; resolving the last open one restores it. Completing a preventive work order pushes its plan’s next due date out."
      />
      <Tabs
        tabs={[
          {
            label: 'Breakdowns',
            content: (
              <ResourceListPage<Breakdown>
                title="Breakdowns"
                listPath="/breakdowns"
                createPath="/breakdowns"
                createLabel="Report breakdown"
                createFields={[
                  { name: 'machineId', label: 'Machine', type: 'reference', endpoint: '/machines', labelKey: 'name', labelFn: machineLabel, required: true },
                  { name: 'severity', label: 'Severity', type: 'select', defaultValue: 'MEDIUM', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => ({ value: s, label: s.toLowerCase() })) },
                  { name: 'description', label: 'What happened', type: 'textarea', required: true },
                ]}
                columns={[
                  { key: 'machineId', label: 'Machine', render: (r) => machine(r.machineId) },
                  { key: 'description', label: 'Description' },
                  { key: 'severity', label: 'Severity', badge: true },
                  { key: 'status', label: 'Status' },
                  { key: 'reportedAt', label: 'Reported', render: (r) => when(r.reportedAt) },
                ]}
                rowActions={(r, reload) => (
                  <>
                    {r.status === 'OPEN' && <ActionButton label="Start repair" run={() => apiPost(`/breakdowns/${r.id}/start-repair`)} onDone={reload} />}
                    {r.status !== 'RESOLVED' && (
                      <ActionButton label="Resolve" tone="primary" ask={{ placeholder: 'Resolution notes (optional)' }} run={(n) => apiPost(`/breakdowns/${r.id}/resolve`, { notes: n || undefined })} onDone={reload} />
                    )}
                  </>
                )}
              />
            ),
          },
          {
            label: 'Work orders',
            content: (
              <ResourceListPage<WorkOrder>
                title="Work orders"
                description="A corrective order must reference a breakdown and a preventive one a plan. Completing a corrective order resolves its breakdown."
                listPath="/work-orders"
                createPath="/work-orders"
                createLabel="New work order"
                createFields={[
                  { name: 'machineId', label: 'Machine', type: 'reference', endpoint: '/machines', labelKey: 'name', labelFn: machineLabel, required: true },
                  { name: 'type', label: 'Type', type: 'select', required: true, options: [{ value: 'CORRECTIVE', label: 'Corrective (fix a breakdown)' }, { value: 'PREVENTIVE', label: 'Preventive (planned)' }] },
                  { name: 'title', label: 'Title', type: 'text', required: true },
                  { name: 'breakdownId', label: 'Breakdown', type: 'reference', endpoint: '/breakdowns', labelKey: 'description', filter: (b) => b.status !== 'RESOLVED', hint: 'Required for corrective' },
                  { name: 'maintenancePlanId', label: 'Plan', type: 'reference', endpoint: '/maintenance-plans', labelKey: 'title', hint: 'Required for preventive' },
                  { name: 'assignedToEmployeeId', label: 'Assign to', type: 'reference', endpoint: '/employees', labelKey: 'fullName' },
                ]}
                columns={[
                  { key: 'workOrderNumber', label: 'Number', mono: true },
                  { key: 'machineId', label: 'Machine', render: (r) => machine(r.machineId) },
                  { key: 'type', label: 'Type', badge: true },
                  { key: 'title', label: 'Title' },
                  { key: 'assignedToEmployeeId', label: 'Assigned', render: (r) => employee(r.assignedToEmployeeId) },
                  { key: 'status', label: 'Status' },
                ]}
                rowActions={(r, reload) => (
                  <>
                    {r.status === 'OPEN' && <ActionButton label="Start" run={() => apiPost(`/work-orders/${r.id}/start`)} onDone={reload} />}
                    {(r.status === 'OPEN' || r.status === 'IN_PROGRESS') && (
                      <>
                        <ActionButton label="Complete" tone="primary" ask={{ placeholder: 'Completion notes (optional)' }} run={(n) => apiPost(`/work-orders/${r.id}/complete`, { notes: n || undefined })} onDone={reload} />
                        <ActionButton label="Cancel" tone="danger" run={() => apiPost(`/work-orders/${r.id}/cancel`)} onDone={reload} />
                      </>
                    )}
                  </>
                )}
              />
            ),
          },
          {
            label: 'Plans',
            content: (
              <ResourceListPage<Plan>
                title="Maintenance plans"
                description="Recurring preventive maintenance. Generating a work order is allowed once at a time per plan."
                listPath="/maintenance-plans"
                createPath="/maintenance-plans"
                createLabel="New plan"
                createFields={[
                  { name: 'machineId', label: 'Machine', type: 'reference', endpoint: '/machines', labelKey: 'name', labelFn: machineLabel, required: true },
                  { name: 'title', label: 'Title', type: 'text', required: true },
                  { name: 'frequencyDays', label: 'Repeat every (days)', type: 'number', required: true, min: 1, step: 1 },
                  { name: 'nextDueDate', label: 'Next due', type: 'date', required: true, defaultValue: today() },
                ]}
                columns={[
                  { key: 'machineId', label: 'Machine', render: (r) => machine(r.machineId) },
                  { key: 'title', label: 'Title' },
                  { key: 'frequencyDays', label: 'Every', align: 'right', render: (r) => `${r.frequencyDays} d` },
                  {
                    key: 'nextDueDate',
                    label: 'Next due',
                    render: (r) => (
                      <span className={styles.due}>
                        {r.nextDueDate}
                        {r.status === 'ACTIVE' && r.nextDueDate < today() && <Badge value="OVERDUE" />}
                      </span>
                    ),
                  },
                  { key: 'status', label: 'Status' },
                ]}
                rowActions={(r, reload) =>
                  r.status === 'ACTIVE' ? <ActionButton label="Generate work order" run={() => apiPost(`/maintenance-plans/${r.id}/generate-work-order`)} onDone={reload} /> : null
                }
              />
            ),
          },
          {
            label: 'Spare parts',
            content: (
              <ResourceListPage<Part>
                title="Spare parts"
                description="Adjustments can’t take a part below zero."
                listPath="/spare-parts"
                createPath="/spare-parts"
                createLabel="New part"
                createFields={[
                  { name: 'code', label: 'Code', type: 'text', required: true },
                  { name: 'name', label: 'Name', type: 'text', required: true },
                  { name: 'quantityOnHand', label: 'On hand', type: 'number', step: 1, min: 0 },
                  { name: 'reorderLevel', label: 'Reorder level', type: 'number', step: 1, min: 0 },
                ]}
                columns={[
                  { key: 'code', label: 'Code', mono: true },
                  { key: 'name', label: 'Name' },
                  {
                    key: 'quantityOnHand',
                    label: 'On hand',
                    align: 'right',
                    render: (r) => (
                      <span className={r.reorderLevel > 0 && r.quantityOnHand <= r.reorderLevel ? styles.low : undefined}>{r.quantityOnHand}</span>
                    ),
                  },
                  { key: 'reorderLevel', label: 'Reorder at', align: 'right' },
                ]}
                rowActions={(r, reload) => (
                  <ActionButton
                    label="Adjust"
                    ask={{ placeholder: '+5 or -2', type: 'number', required: true }}
                    run={(d) => apiPost(`/spare-parts/${r.id}/adjust`, { delta: Number(d) })}
                    onDone={reload}
                  />
                )}
              />
            ),
          },
          { label: 'Machine history', content: <MachineHistory /> },
        ]}
      />
    </section>
  );
}
