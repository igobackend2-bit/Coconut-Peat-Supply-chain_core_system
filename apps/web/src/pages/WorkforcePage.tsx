import { useEffect, useState } from 'react';
import { ResourceListPage } from '../components/ResourceListPage';
import { Tabs } from '../components/Tabs';
import { PageHeader, Panel, Stat } from '../components/ui';
import { apiGet } from '../lib/api';
import { useLookup } from '../lib/useLookup';
import styles from './Workforce.module.css';

interface Attendance { id: string; employeeId: string; shiftId: string | null; workDate: string; status: string; notes: string | null }
interface Allocation { id: string; employeeId: string; workDate: string; hours: string; task: string; productionBatchId: string | null; machineId: string | null }
interface Shift { id: string; code: string; name: string; startTime: string; endTime: string }
interface Summary { date: string; attendance: Record<string, number>; allocatedHours: string }

const today = () => new Date().toISOString().slice(0, 10);

function DateFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className={styles.dateFilter}>
      <span>Date</span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function AttendanceTab({ employee, shift }: { employee: (id: string | null | undefined) => string; shift: (id: string | null | undefined) => string }) {
  const [date, setDate] = useState(today());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    apiGet<Summary>(`/attendance/summary?date=${date}`)
      .then((s) => !cancelled && setSummary(s))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [date, tick]);

  const count = (s: string) => summary?.attendance[s] ?? 0;

  return (
    <div>
      {date && (
        <Panel>
          <div className={styles.summary}>
            <Stat label="Present" value={count('PRESENT')} tone="positive" />
            <Stat label="Half day" value={count('HALF_DAY')} tone="warning" />
            <Stat label="Leave" value={count('LEAVE')} />
            <Stat label="Absent" value={count('ABSENT')} tone={count('ABSENT') > 0 ? 'negative' : undefined} />
            <Stat label="Hours allocated" value={summary ? Number(summary.allocatedHours).toFixed(1) : '—'} />
          </div>
        </Panel>
      )}
      <div className={styles.gap} />
      <ResourceListPage<Attendance>
        title="Attendance"
        description="One record per employee per day. Labour can only be allocated to someone marked present or half day."
        listPath={date ? `/attendance?date=${date}` : '/attendance'}
        createPath="/attendance"
        createLabel="Mark attendance"
        onChanged={() => setTick((t) => t + 1)}
        toolbarExtra={<DateFilter value={date} onChange={setDate} />}
        emptyHint={date ? `Nobody has been marked for ${date}.` : undefined}
        createFields={[
          { name: 'employeeId', label: 'Employee', type: 'reference', endpoint: '/employees', labelKey: 'fullName', labelFn: (e) => `${e.employeeCode} — ${e.fullName}`, required: true },
          { name: 'workDate', label: 'Date', type: 'date', required: true, defaultValue: date || today() },
          { name: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'PRESENT', options: ['PRESENT', 'HALF_DAY', 'LEAVE', 'ABSENT'].map((s) => ({ value: s, label: s.replace('_', ' ').toLowerCase() })) },
          { name: 'shiftId', label: 'Shift', type: 'reference', endpoint: '/shifts', labelKey: 'name' },
          { name: 'notes', label: 'Notes', type: 'text' },
        ]}
        columns={[
          { key: 'employeeId', label: 'Employee', render: (r) => employee(r.employeeId) },
          { key: 'workDate', label: 'Date' },
          { key: 'shiftId', label: 'Shift', render: (r) => shift(r.shiftId) },
          { key: 'status', label: 'Status' },
          { key: 'notes', label: 'Notes' },
        ]}
      />
    </div>
  );
}

function AllocationTab({ employee, batch, machine }: { employee: (id: string | null | undefined) => string; batch: (id: string | null | undefined) => string; machine: (id: string | null | undefined) => string }) {
  const [date, setDate] = useState(today());
  return (
    <ResourceListPage<Allocation>
      title="Labour allocation"
      description="Hours are capped at 12 per employee per day (6 on a half day), and only for people who attended."
      listPath={date ? `/labour-allocations?date=${date}` : '/labour-allocations'}
      createPath="/labour-allocations"
      createLabel="Allocate labour"
      toolbarExtra={<DateFilter value={date} onChange={setDate} />}
      createFields={[
        { name: 'employeeId', label: 'Employee', type: 'reference', endpoint: '/employees', labelKey: 'fullName', labelFn: (e) => `${e.employeeCode} — ${e.fullName}`, required: true },
        { name: 'workDate', label: 'Date', type: 'date', required: true, defaultValue: date || today() },
        { name: 'hours', label: 'Hours', type: 'number', step: 0.25, min: 0, required: true },
        { name: 'task', label: 'Task', type: 'text', required: true },
        { name: 'productionBatchId', label: 'Production batch', type: 'reference', endpoint: '/production-batches', labelKey: 'batchNumber' },
        { name: 'machineId', label: 'Machine', type: 'reference', endpoint: '/machines', labelKey: 'name' },
      ]}
      columns={[
        { key: 'employeeId', label: 'Employee', render: (r) => employee(r.employeeId) },
        { key: 'workDate', label: 'Date' },
        { key: 'hours', label: 'Hours', align: 'right', render: (r) => Number(r.hours).toFixed(2) },
        { key: 'task', label: 'Task' },
        { key: 'productionBatchId', label: 'Batch', mono: true, render: (r) => batch(r.productionBatchId) },
        { key: 'machineId', label: 'Machine', render: (r) => machine(r.machineId) },
      ]}
    />
  );
}

export function WorkforcePage() {
  const employee = useLookup('/employees', (r) => String(r.fullName));
  const shift = useLookup('/shifts', (r) => String(r.name));
  const batch = useLookup('/production-batches', (r) => String(r.batchNumber));
  const machine = useLookup('/machines', (r) => String(r.name));

  return (
    <section>
      <PageHeader title="Workforce" description="Who was in, on which shift, and where their hours went." />
      <Tabs
        tabs={[
          { label: 'Attendance', content: <AttendanceTab employee={employee} shift={shift} /> },
          { label: 'Labour allocation', content: <AllocationTab employee={employee} batch={batch} machine={machine} /> },
          {
            label: 'Shifts',
            content: (
              <ResourceListPage<Shift>
                title="Shifts"
                listPath="/shifts"
                createPath="/shifts"
                createLabel="New shift"
                createFields={[
                  { name: 'code', label: 'Code', type: 'text', required: true },
                  { name: 'name', label: 'Name', type: 'text', required: true },
                  { name: 'startTime', label: 'Starts (HH:MM)', type: 'text', required: true, defaultValue: '06:00' },
                  { name: 'endTime', label: 'Ends (HH:MM)', type: 'text', required: true, defaultValue: '14:00' },
                ]}
                columns={[
                  { key: 'code', label: 'Code', mono: true },
                  { key: 'name', label: 'Name' },
                  { key: 'startTime', label: 'Starts' },
                  { key: 'endTime', label: 'Ends' },
                ]}
              />
            ),
          },
        ]}
      />
    </section>
  );
}
