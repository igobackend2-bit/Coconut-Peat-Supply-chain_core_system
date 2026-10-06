import { CaretRight } from '@phosphor-icons/react';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { Badge } from '../components/Badge';
import { EmptyState, InlineError, PageHeader, TableSkeleton } from '../components/ui';
import { when } from '../lib/format';
import { ApiError, apiGet } from '../lib/api';
import tableStyles from '../components/ResourceListPage.module.css';
import styles from './AuditActivity.module.css';

interface AuditEvent {
  id: string;
  actorId: string | null;
  actorType: string;
  actorName: string | null;
  actionType: string;
  module: string;
  entityType: string;
  entityId: string | null;
  operation: string | null;
  status: string;
  requestId: string | null;
  reason: string | null;
  beforeState: unknown;
  afterState: unknown;
  createdAt: string;
}
interface Meta { modules: string[]; actionTypes: string[]; statuses: string[] }

const PAGE = 50;

export function AuditActivityPage() {
  const [meta, setMeta] = useState<Meta>({ modules: [], actionTypes: [], statuses: [] });
  const [filters, setFilters] = useState({ module: '', actionType: '', status: '', entityType: '', from: '', to: '' });
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    apiGet<Meta>('/audit-events/meta').then(setMeta).catch(() => {});
    // Resolving ids to names needs identity.user.read; without it the table falls back to a short id.
    apiGet<{ id: string; fullName: string }[]>('/users')
      .then((u) => setNames(new Map(u.map((x) => [x.id, x.fullName]))))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
    for (const [k, v] of Object.entries(filters)) if (v) q.set(k, k === 'to' ? `${v}T23:59:59` : v);
    try {
      setRows(await apiGet<AuditEvent[]>(`/audit-events?${q}`));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? (e.status === 403 ? 'You don’t have permission to read the audit log.' : e.message) : 'Failed to load');
      setRows([]);
    }
  }, [filters, offset]);

  useEffect(() => {
    // Every setState inside load() happens after an await, not synchronously in this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  function set(key: keyof typeof filters, value: string) {
    setRows(null);
    setOffset(0);
    setOpen(null);
    setFilters((f) => ({ ...f, [key]: value }));
  }

  const active = Object.values(filters).some(Boolean);

  return (
    <section>
      <PageHeader title="Audit & Activity" description="Every change, approval, rejection and denied access attempt. The log is append-only — the database itself refuses edits and deletes." />

      <div className={styles.filters}>
        <label>
          <span>Module</span>
          <select value={filters.module} onChange={(e) => set('module', e.target.value)}>
            <option value="">All</option>
            {meta.modules.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <label>
          <span>Action</span>
          <select value={filters.actionType} onChange={(e) => set('actionType', e.target.value)}>
            <option value="">All</option>
            {meta.actionTypes.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <label>
          <span>Outcome</span>
          <select value={filters.status} onChange={(e) => set('status', e.target.value)}>
            <option value="">All</option>
            {meta.statuses.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <label>
          <span>Entity</span>
          <input type="text" placeholder="e.g. sales_order" value={filters.entityType} onChange={(e) => set('entityType', e.target.value)} />
        </label>
        <label>
          <span>From</span>
          <input type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} />
        </label>
        <label>
          <span>To</span>
          <input type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} />
        </label>
        {active && (
          <button type="button" className="btn-ghost" onClick={() => (setRows(null), setOffset(0), setFilters({ module: '', actionType: '', status: '', entityType: '', from: '', to: '' }))}>
            Clear
          </button>
        )}
      </div>

      {error && <InlineError>{error}</InlineError>}
      {!rows && <TableSkeleton cols={6} />}
      {rows && rows.length === 0 && !error && <EmptyState title="No matching events" hint={active ? 'Try widening the filters.' : 'Nothing has been recorded yet.'} />}
      {rows && rows.length > 0 && (
        <>
          <div className={tableStyles.tableWrap}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th aria-label="Expand" />
                  <th>When</th>
                  <th>Who</th>
                  <th>Module</th>
                  <th>What</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isOpen = open === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr className={isOpen ? tableStyles.rowOpen : styles.clickable} onClick={() => setOpen(isOpen ? null : r.id)}>
                        <td style={{ width: 28 }}>
                          <button type="button" className="btn-ghost btn-sm" aria-expanded={isOpen} aria-label={isOpen ? 'Collapse' : 'Expand'} onClick={(e) => (e.stopPropagation(), setOpen(isOpen ? null : r.id))}>
                            <CaretRight size={12} weight="bold" style={{ transform: isOpen ? 'rotate(90deg)' : undefined, transition: 'transform .15s' }} />
                          </button>
                        </td>
                        <td className={styles.when}>{when(r.createdAt)}</td>
                        <td>{r.actorName ?? (r.actorId ? (names.get(r.actorId) ?? <span className={tableStyles.mono}>{r.actorId.slice(0, 8)}</span>) : <span className="muted">{r.actorType.toLowerCase()}</span>)}</td>
                        <td className={tableStyles.mono}>{r.module}</td>
                        <td>
                          <span className={styles.action}>{r.actionType.toLowerCase()}</span> {r.entityType.replaceAll('_', ' ')}
                          {r.operation && !/^(GET|POST|PUT|PATCH|DELETE) /.test(r.operation) && <span className="muted"> · {r.operation.replaceAll('_', ' ')}</span>}
                        </td>
                        <td><Badge value={r.status} /></td>
                      </tr>
                      {isOpen && (
                        <tr className={tableStyles.detailRow}>
                          <td colSpan={6}>
                            <div className={tableStyles.detail}>
                              <dl className={styles.meta}>
                                <div><dt>Event</dt><dd className={tableStyles.mono}>{r.id}</dd></div>
                                {r.entityId && <div><dt>Entity id</dt><dd className={tableStyles.mono}>{r.entityId}</dd></div>}
                                {r.requestId && <div><dt>Request id</dt><dd className={tableStyles.mono}>{r.requestId}</dd></div>}
                                {r.reason && <div className={styles.reason}><dt>Reason</dt><dd>{r.reason}</dd></div>}
                              </dl>
                              {r.beforeState != null && (
                                <>
                                  <h3>Before</h3>
                                  <pre className={styles.json}>{JSON.stringify(r.beforeState, null, 2)}</pre>
                                </>
                              )}
                              {r.afterState != null && (
                                <>
                                  <h3>After</h3>
                                  <pre className={styles.json}>{JSON.stringify(r.afterState, null, 2)}</pre>
                                </>
                              )}
                              {r.beforeState == null && r.afterState == null && <p className="muted">No state was captured for this event.</p>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={styles.pager}>
            <span className="muted">
              Showing {offset + 1}–{offset + rows.length}
            </span>
            <div>
              <button type="button" disabled={offset === 0} onClick={() => (setRows(null), setOffset(Math.max(0, offset - PAGE)))}>Newer</button>{' '}
              <button type="button" disabled={rows.length < PAGE} onClick={() => (setRows(null), setOffset(offset + PAGE))}>Older</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
