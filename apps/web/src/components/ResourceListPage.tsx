import type { FormEvent, ReactNode } from 'react';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { CaretRight, Plus, X } from '@phosphor-icons/react';
import { apiGet, apiPost, ApiError } from '../lib/api';
import { Badge } from './Badge';
import { EmptyState, InlineError, PageHeader, TableSkeleton } from './ui';
import styles from './ResourceListPage.module.css';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  /** Right-align (use for numbers/amounts). */
  align?: 'right';
  /** Monospace (use for codes and identifiers). */
  mono?: boolean;
  /** Render the value as a status badge. `key === 'status'` does this automatically. */
  badge?: boolean;
}

interface FieldBase {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  defaultValue?: string;
}

export type FieldConfig =
  | (FieldBase & { type: 'text' | 'email' | 'date' | 'textarea' })
  | (FieldBase & { type: 'number'; step?: number; min?: number })
  | (FieldBase & { type: 'select'; options: { value: string; label: string }[] })
  | (FieldBase & {
      type: 'reference';
      endpoint: string;
      labelKey: string;
      /** Build the option label from the whole record instead of a single key. */
      labelFn?: (item: Record<string, unknown>) => string;
      /** Only offer records that pass (e.g. only CONFIRMED orders). */
      filter?: (item: Record<string, unknown>) => boolean;
    });

interface ResourceListPageProps<T extends { id: string }> {
  title: string;
  description?: ReactNode;
  listPath: string;
  createPath?: string;
  createFields?: FieldConfig[];
  columns: Column<T>[];
  /**
   * 'page'   — the whole screen (renders the page header).
   * 'tab'    — a section inside a tab or page (default; compact toolbar).
   * 'nested' — a child list inside a row's detail panel.
   */
  variant?: 'page' | 'tab' | 'nested';
  createLabel?: string;
  emptyHint?: ReactNode;
  /** Per-row buttons, rendered in a trailing column. `reload` refreshes this list. */
  rowActions?: (row: T, reload: () => void) => ReactNode;
  /** Adds a "Details" toggle per row that expands this panel under the row. */
  renderDetail?: (row: T, reload: () => void) => ReactNode;
  detailLabel?: string;
  /** Called after a successful create — lets a parent refresh derived data (e.g. an invoice total). */
  onChanged?: () => void;
  /** Extra controls placed beside the "New" button (filters, date pickers…). */
  toolbarExtra?: ReactNode;
}

const cellValue = <T,>(row: T, key: string) => {
  const v = (row as Record<string, unknown>)[key];
  return v == null ? '' : String(v);
};

/**
 * Generic list + create screen. Handles the shape shared by almost every
 * module: fetch a list, show it as a table, optionally create a record
 * with a small form, optionally act on rows. Modules with genuinely
 * multi-step workflows built their own pages (Production, Sales…); this
 * component now also covers workflow lists via `rowActions`, and
 * parent/child data via `renderDetail` + a nested instance.
 */
export function ResourceListPage<T extends { id: string }>({
  title,
  description,
  listPath,
  createPath,
  createFields,
  columns,
  variant = 'tab',
  createLabel,
  emptyHint,
  rowActions,
  renderDetail,
  detailLabel = 'Details',
  onChanged,
  toolbarExtra,
}: ResourceListPageProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);

  const [referenceOptions, setReferenceOptions] = useState<Record<string, { value: string; label: string }[]>>({});

  const load = useCallback(async () => {
    try {
      const data = await apiGet<T[]>(listPath);
      setItems(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [listPath]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const referenceFields = (createFields ?? []).filter((f): f is Extract<FieldConfig, { type: 'reference' }> => f.type === 'reference');
    referenceFields.forEach(async (field) => {
      try {
        const data = await apiGet<Record<string, unknown>[]>(field.endpoint);
        setReferenceOptions((prev) => ({
          ...prev,
          [field.name]: data
            .filter((item) => (field.filter ? field.filter(item) : true))
            .map((item) => ({
              value: String(item.id),
              label: field.labelFn ? field.labelFn(item) : String(item[field.labelKey] ?? item.id),
            })),
        }));
      } catch {
        // reference options failing to load shouldn't block the rest of the form — the select just stays empty
      }
    });
    // createFields is rebuilt inline on each parent render; depending on it would refetch constantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listPath, showForm]);

  function openForm() {
    const defaults: Record<string, string> = {};
    for (const f of createFields ?? []) if (f.defaultValue) defaults[f.name] = f.defaultValue;
    setFormValues(defaults);
    setFormError(null);
    setShowForm(true);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!createPath) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of createFields ?? []) {
        const raw = formValues[field.name];
        if (raw === undefined || raw === '') continue;
        payload[field.name] = field.type === 'number' ? Number(raw) : raw;
      }
      await apiPost(createPath, payload);
      setFormValues({});
      setShowForm(false);
      await load();
      onChanged?.();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  const reload = useCallback(() => {
    load();
    onChanged?.();
  }, [load, onChanged]);

  const hasTrailing = Boolean(rowActions || renderDetail);
  const colCount = columns.length + (hasTrailing ? 1 : 0);
  const newButton =
    createFields &&
    (showForm ? (
      <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
        <X size={14} aria-hidden="true" /> Cancel
      </button>
    ) : (
      <button type="button" onClick={openForm} className={`btn-primary ${styles.newButton}`}>
        <Plus size={14} weight="bold" aria-hidden="true" /> {createLabel ?? 'New'}
      </button>
    ));

  return (
    <section className={variant === 'nested' ? styles.nested : undefined}>
      {variant === 'page' ? (
        <PageHeader title={title} description={description} actions={<>{toolbarExtra}{newButton}</>} />
      ) : (
        <div className={styles.toolbar}>
          <div>
            {variant === 'nested' && <h3 className={styles.nestedTitle}>{title}</h3>}
            {description && <p className={styles.description}>{description}</p>}
          </div>
          <div className={styles.toolbarActions}>
            {toolbarExtra}
            {newButton}
          </div>
        </div>
      )}

      {showForm && createFields && (
        <form onSubmit={handleCreate} className={styles.form}>
          {createFields.map((field) => (
            <label key={field.name} className={`${styles.formField} ${field.type === 'textarea' ? styles.wide : ''}`}>
              <span>
                {field.label}
                {field.required && <span className={styles.req}> *</span>}
              </span>
              {field.type === 'select' || field.type === 'reference' ? (
                <select
                  required={field.required}
                  value={formValues[field.name] ?? ''}
                  onChange={(e) => setFormValues((v) => ({ ...v, [field.name]: e.target.value }))}
                >
                  <option value="">{field.required ? 'Select…' : 'None'}</option>
                  {(field.type === 'select' ? field.options : (referenceOptions[field.name] ?? [])).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  required={field.required}
                  value={formValues[field.name] ?? ''}
                  onChange={(e) => setFormValues((v) => ({ ...v, [field.name]: e.target.value }))}
                />
              ) : (
                <input
                  type={field.type}
                  step={field.type === 'number' ? (field.step ?? 'any') : undefined}
                  min={field.type === 'number' ? field.min : undefined}
                  required={field.required}
                  value={formValues[field.name] ?? ''}
                  onChange={(e) => setFormValues((v) => ({ ...v, [field.name]: e.target.value }))}
                />
              )}
              {field.hint && <span className={styles.hint}>{field.hint}</span>}
            </label>
          ))}
          {formError && <InlineError>{formError}</InlineError>}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}

      {loading && <TableSkeleton cols={Math.min(columns.length, 5)} />}
      {loadError && <InlineError>{loadError}</InlineError>}
      {!loading && !loadError && items.length === 0 && (
        <EmptyState
          title={`No ${title.toLowerCase()} yet`}
          hint={emptyHint ?? (createFields ? 'Create the first one to get started.' : 'Records appear here as the system records them.')}
          action={createFields && !showForm ? <button type="button" className="btn-primary" onClick={openForm}>{createLabel ?? 'Create the first one'}</button> : undefined}
        />
      )}
      {!loading && !loadError && items.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={col.align === 'right' ? styles.right : undefined}>
                    {col.label}
                  </th>
                ))}
                {hasTrailing && <th aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const open = openRow === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr className={open ? styles.rowOpen : undefined}>
                      {columns.map((col) => (
                        <td key={col.key} className={`${col.align === 'right' ? styles.right : ''} ${col.mono ? styles.mono : ''}`}>
                          {col.render ? col.render(row) : col.key === 'status' || col.badge ? <Badge value={cellValue(row, col.key)} /> : cellValue(row, col.key) || '—'}
                        </td>
                      ))}
                      {hasTrailing && (
                        <td className={styles.actions}>
                          <div className={styles.actionRow}>
                            {rowActions?.(row, reload)}
                            {renderDetail && (
                              <button type="button" className="btn-sm btn-ghost" aria-expanded={open} onClick={() => setOpenRow(open ? null : row.id)}>
                                {detailLabel}
                                <CaretRight size={12} weight="bold" className={open ? styles.caretOpen : styles.caret} aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                    {open && renderDetail && (
                      <tr className={styles.detailRow}>
                        <td colSpan={colCount}>
                          <div className={styles.detail}>{renderDetail(row, reload)}</div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
