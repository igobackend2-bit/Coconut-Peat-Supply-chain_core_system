import { Lock, Plus, X } from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ActionButton } from '../components/ActionButton';
import { Badge } from '../components/Badge';
import { EmptyState, InlineError, PageHeader, TableSkeleton } from '../components/ui';
import { day, when } from '../lib/format';
import { ApiError, apiGet, apiPost } from '../lib/api';
import { hasPermission } from '../lib/auth';
import formStyles from '../components/ResourceListPage.module.css';
import styles from './Memory.module.css';

interface Memory {
  id: string;
  memoryType: string;
  title: string;
  content: string;
  status: string;
  sensitivity: string;
  confidence: string;
  tags: string[];
  version: number;
  validUntil: string | null;
  expired: boolean;
  createdAt: string;
}

const TYPES = [
  'FACT', 'DECISION', 'INSTRUCTION', 'PREFERENCE', 'CONFIGURATION', 'SOP', 'PRODUCT_KNOWLEDGE', 'SUPPLIER_KNOWLEDGE',
  'CUSTOMER_KNOWLEDGE', 'INCIDENT', 'LESSON', 'ASSUMPTION', 'OBSERVATION', 'OPEN_ISSUE', 'TASK_CONTEXT',
];
const label = (s: string) => s.replaceAll('_', ' ').toLowerCase();

function Card({ m, canWrite, onChanged }: { m: Memory; canWrite: boolean; onChanged: () => void }) {
  const [revising, setRevising] = useState(false);
  const [draft, setDraft] = useState(m.content);
  const [revError, setRevError] = useState<string | null>(null);
  const [history, setHistory] = useState<Memory[] | null>(null);

  async function saveRevision() {
    setRevError(null);
    try {
      await apiPost(`/memory/${m.id}/revise`, { content: draft });
      setRevising(false);
      onChanged();
    } catch (e) {
      setRevError(e instanceof ApiError ? e.message : 'Failed to save');
    }
  }

  async function toggleHistory() {
    if (history) return setHistory(null);
    try {
      setHistory(await apiGet<Memory[]>(`/memory/${m.id}/history`));
    } catch {
      setHistory([]);
    }
  }

  return (
    <article className={`${styles.card} ${m.status !== 'ACTIVE' ? styles.inactive : ''}`}>
      <div className={styles.meta}>
        <span className={styles.type}>{label(m.memoryType)}</span>
        {m.sensitivity === 'CONFIDENTIAL' && (
          <span className={styles.lock}>
            <Lock size={12} weight="fill" aria-hidden="true" /> confidential
          </span>
        )}
        {m.status !== 'ACTIVE' && <Badge value={m.status} />}
        {m.expired && <Badge value="OVERDUE" />}
        <span className={styles.spacer} />
        <span className={`${styles.ver} num`}>v{m.version}</span>
      </div>
      <h2>{m.title}</h2>
      {revising ? (
        <div>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} className={styles.edit} aria-label="Revised content" />
          {revError && <InlineError>{revError}</InlineError>}
          <div className={styles.row}>
            <button type="button" className="btn-sm btn-primary" disabled={!draft.trim() || draft === m.content} onClick={saveRevision}>Save as v{m.version + 1}</button>
            <button type="button" className="btn-sm btn-ghost" onClick={() => (setRevising(false), setDraft(m.content))}>Cancel</button>
          </div>
        </div>
      ) : (
        <p className={styles.content}>{m.content}</p>
      )}
      <div className={styles.foot}>
        <div className={styles.tags}>
          {m.tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
          <span className="muted num">{Math.round(Number(m.confidence) * 100)}% confidence</span>
          {m.validUntil && <span className="muted">valid until {day(m.validUntil)}</span>}
        </div>
        <div className={styles.row}>
          <button type="button" className="btn-sm btn-ghost" onClick={toggleHistory}>{history ? 'Hide history' : 'History'}</button>
          {canWrite && m.status === 'ACTIVE' && !revising && (
            <>
              <button type="button" className="btn-sm" onClick={() => setRevising(true)}>Revise</button>
              <ActionButton label="Archive" tone="danger" run={() => apiPost(`/memory/${m.id}/archive`)} onDone={onChanged} />
            </>
          )}
        </div>
      </div>
      {history && (
        <ol className={styles.history}>
          {history.map((h) => (
            <li key={h.id} className={h.id === m.id ? styles.current : undefined}>
              <span className={`${styles.ver} num`}>v{h.version}</span>
              <span className="muted">{when(h.createdAt)}</span>
              <Badge value={h.status} />
              <span className={styles.histText}>{h.content}</span>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

export function MemoryPage() {
  const canWrite = hasPermission('memory.item.write');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [items, setItems] = useState<Memory[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ memoryType: 'FACT', title: '', content: '', sensitivity: 'INTERNAL', confidence: '1', tags: '', validUntil: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ status });
    if (type) params.set('type', type);
    if (debouncedQ) params.set('q', debouncedQ);
    try {
      setItems(await apiGet<Memory[]>(`/memory?${params}`));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load');
      setItems([]);
    }
  }, [type, status, debouncedQ]);

  useEffect(() => {
    // Every setState inside load() happens after an await, not synchronously in this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await apiPost('/memory', {
        memoryType: form.memoryType,
        title: form.title,
        content: form.content,
        sensitivity: form.sensitivity,
        confidence: Number(form.confidence),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        validUntil: form.validUntil || undefined,
      });
      setForm({ memoryType: 'FACT', title: '', content: '', sensitivity: 'INTERNAL', confidence: '1', tags: '', validUntil: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <section>
      <PageHeader
        title="Memory"
        description="Durable company knowledge: decisions, SOPs, lessons, standing instructions. Edits never overwrite — they create a new version and keep the old one."
        actions={
          canWrite && (
            <button type="button" className="btn-primary" onClick={() => setShowForm((v) => !v)}>
              {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} weight="bold" /> New memory</>}
            </button>
          )
        }
      />

      {showForm && (
        <form onSubmit={create} className={formStyles.form}>
          <label className={formStyles.formField}>
            <span>Type</span>
            <select value={form.memoryType} onChange={set('memoryType')}>{TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select>
          </label>
          <label className={formStyles.formField}>
            <span>Sensitivity</span>
            <select value={form.sensitivity} onChange={set('sensitivity')}>
              <option value="PUBLIC">public</option>
              <option value="INTERNAL">internal</option>
              <option value="CONFIDENTIAL">confidential (restricted readers only)</option>
            </select>
          </label>
          <label className={`${formStyles.formField} ${formStyles.wide}`}>
            <span>Title <span className={formStyles.req}>*</span></span>
            <input required value={form.title} onChange={set('title')} />
          </label>
          <label className={`${formStyles.formField} ${formStyles.wide}`}>
            <span>Content <span className={formStyles.req}>*</span></span>
            <textarea required value={form.content} onChange={set('content')} />
          </label>
          <label className={formStyles.formField}>
            <span>Tags</span>
            <input value={form.tags} onChange={set('tags')} placeholder="qc, approval" />
            <span className={formStyles.hint}>Comma-separated</span>
          </label>
          <label className={formStyles.formField}>
            <span>Confidence (0–1)</span>
            <input type="number" min="0" max="1" step="0.05" value={form.confidence} onChange={set('confidence')} />
          </label>
          <label className={formStyles.formField}>
            <span>Valid until</span>
            <input type="date" value={form.validUntil} onChange={set('validUntil')} />
            <span className={formStyles.hint}>Leave empty if it doesn’t expire</span>
          </label>
          {formError && <InlineError>{formError}</InlineError>}
          <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save memory'}</button>
        </form>
      )}

      <div className={styles.filters}>
        <input type="search" placeholder="Search title or content…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search memory" className={styles.search} />
        <select value={type} onChange={(e) => (setItems(null), setType(e.target.value))} aria-label="Type">
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
        </select>
        <select value={status} onChange={(e) => (setItems(null), setStatus(e.target.value))} aria-label="Status">
          <option value="ACTIVE">Active</option>
          <option value="SUPERSEDED">Superseded</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {error && <InlineError>{error}</InlineError>}
      {!items && <TableSkeleton rows={3} cols={3} />}
      {items && items.length === 0 && !error && (
        <EmptyState title={q || type ? 'No memory matches' : 'No memory recorded yet'} hint={q || type ? 'Try a different search or type.' : 'Record the decisions and standing rules your team keeps re-explaining.'} />
      )}
      <div className={styles.list}>
        {items?.map((m) => <Card key={m.id} m={m} canWrite={canWrite} onChanged={load} />)}
      </div>
    </section>
  );
}
