/** Display formatters shared across screens (Indian digit grouping, medium dates). */
export const money = (v: number | string | null | undefined) =>
  v == null || v === ''
    ? '—'
    : new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v));

export const when = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const day = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—');
