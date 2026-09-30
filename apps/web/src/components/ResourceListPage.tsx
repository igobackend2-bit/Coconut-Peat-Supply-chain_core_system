import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, ApiError } from '../lib/api';
import { Badge } from './Badge';
import styles from './ResourceListPage.module.css';

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

export type FieldConfig =
  | { name: string; label: string; type: 'text' | 'email'; required?: boolean }
  | { name: string; label: string; type: 'number'; required?: boolean; step?: number }
  | { name: string; label: string; type: 'select'; required?: boolean; options: { value: string; label: string }[] }
  | { name: string; label: string; type: 'reference'; required?: boolean; endpoint: string; labelKey: string };

interface ResourceListPageProps<T extends { id: string }> {
  title: string;
  description?: string;
  listPath: string;
  createPath?: string;
  createFields?: FieldConfig[];
  columns: Column<T>[];
}

/**
 * Generic list + create screen, used by every module whose API is a
 * plain "list + create" resource (Products, Suppliers, Vehicles, Raw
 * Material Lots, ...). Modules with real workflow logic (Purchase
 * Orders' approve/reject, Production Batches' multi-step lifecycle) get
 * their own dedicated page instead of being forced through this — see
 * pages/ProcurementPage.tsx and pages/ProductionPage.tsx.
 *
 * A generic-CRUD-abstraction was deliberately deferred on the backend
 * until enough near-identical modules existed to justify it (see
 * apps/api's ProductsService et al.); on the frontend, with ~10 modules
 * sharing this exact "table + create form" shape, that threshold is
 * clearly crossed, so this component exists where the backend's
 * per-entity services still don't.
 */
export function ResourceListPage<T extends { id: string }>({
  title,
  description,
  listPath,
  createPath,
  createFields,
  columns,
}: ResourceListPageProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [referenceOptions, setReferenceOptions] = useState<Record<string, { value: string; label: string }[]>>({});

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiGet<T[]>(listPath);
      setItems(data);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listPath]);

  useEffect(() => {
    const referenceFields = (createFields ?? []).filter((f): f is Extract<FieldConfig, { type: 'reference' }> => f.type === 'reference');
    referenceFields.forEach(async (field) => {
      try {
        const data = await apiGet<Record<string, unknown>[]>(field.endpoint);
        setReferenceOptions((prev) => ({
          ...prev,
          [field.name]: data.map((item) => ({
            value: String(item.id),
            label: String(item[field.labelKey] ?? item.id),
          })),
        }));
      } catch {
        // reference options failing to load shouldn't block the rest of the form — the select just stays empty
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createFields]);

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
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <div className={styles.header}>
        <div>
          <h1>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {createFields && (
          <button type="button" onClick={() => setShowForm((v) => !v)} className={styles.newButton}>
            {showForm ? 'Cancel' : '+ New'}
          </button>
        )}
      </div>

      {showForm && createFields && (
        <form onSubmit={handleCreate} className={styles.form}>
          {createFields.map((field) => (
            <label key={field.name} className={styles.formField}>
              {field.label}
              {field.type === 'select' || field.type === 'reference' ? (
                <select
                  required={field.required}
                  value={formValues[field.name] ?? ''}
                  onChange={(e) => setFormValues((v) => ({ ...v, [field.name]: e.target.value }))}
                >
                  <option value="">— select —</option>
                  {(field.type === 'select' ? field.options : referenceOptions[field.name] ?? []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : field.type}
                  step={field.type === 'number' ? (field.step ?? 'any') : undefined}
                  required={field.required}
                  value={formValues[field.name] ?? ''}
                  onChange={(e) => setFormValues((v) => ({ ...v, [field.name]: e.target.value }))}
                />
              )}
            </label>
          ))}
          {formError && (
            <p role="alert" className={styles.formError}>
              {formError}
            </p>
          )}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}

      {loading && <p>Loading…</p>}
      {loadError && (
        <p role="alert" className={styles.formError}>
          {loadError}
        </p>
      )}
      {!loading && !loadError && items.length === 0 && <p className={styles.description}>No records yet.</p>}
      {!loading && !loadError && items.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render
                      ? col.render(row)
                      : col.key === 'status'
                        ? <Badge value={(row as Record<string, unknown>)[col.key] as string} />
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
