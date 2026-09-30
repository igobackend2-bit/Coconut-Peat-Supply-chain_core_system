import styles from './Badge.module.css';

const TONE_BY_VALUE: Record<string, 'positive' | 'warning' | 'negative' | 'neutral' | 'info'> = {
  ACTIVE: 'positive',
  APPROVED: 'positive',
  RELEASED: 'positive',
  COMPLETED: 'positive',
  RECEIVED: 'positive',
  PASS: 'positive',

  PENDING_APPROVAL: 'warning',
  ON_HOLD: 'warning',
  AT_GATE: 'warning',
  WEIGHED: 'warning',
  PARTIALLY_RECEIVED: 'warning',
  IN_PROGRESS: 'info',
  DRAFT: 'neutral',
  RECEIVED_PARTIAL: 'warning',

  INACTIVE: 'neutral',
  SUSPENDED: 'neutral',
  CANCELLED: 'neutral',
  CLOSED: 'neutral',

  REJECTED: 'negative',
  FAILED: 'negative',
  FAIL: 'negative',
};

/** Color-codes a status/enum value consistently everywhere it appears — the same status string always renders the same tone across every page. */
export function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className={styles.badge}>—</span>;
  const tone = TONE_BY_VALUE[value] ?? 'neutral';
  return <span className={`${styles.badge} ${styles[tone]}`}>{value.replaceAll('_', ' ')}</span>;
}
