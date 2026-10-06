import styles from './Badge.module.css';

type Tone = 'positive' | 'warning' | 'negative' | 'neutral' | 'info';

const TONE_BY_VALUE: Record<string, Tone> = {
  // done / healthy
  ACTIVE: 'positive',
  APPROVED: 'positive',
  RELEASED: 'positive',
  COMPLETED: 'positive',
  RECEIVED: 'positive',
  DELIVERED: 'positive',
  RESOLVED: 'positive',
  PAID: 'positive',
  PASS: 'positive',
  PASSED: 'positive',
  PRESENT: 'positive',
  ENABLED: 'positive',
  ACKNOWLEDGED: 'positive',
  CONFIRMED: 'positive',
  INCOMING: 'positive',
  LOW: 'neutral',

  // needs attention
  PENDING_APPROVAL: 'warning',
  PENDING: 'warning',
  ON_HOLD: 'warning',
  AT_GATE: 'warning',
  WEIGHED: 'warning',
  PARTIALLY_RECEIVED: 'warning',
  RECEIVED_PARTIAL: 'warning',
  SUBMITTED: 'warning',
  PROPOSED: 'warning',
  WARNING: 'warning',
  MEDIUM: 'warning',
  HALF_DAY: 'warning',
  LEAVE: 'warning',
  BOOKED: 'warning',
  OPEN: 'warning',
  SUSPENDED: 'warning',

  // in motion
  IN_PROGRESS: 'info',
  IN_REPAIR: 'info',
  IN_TRANSIT: 'info',
  DISPATCHED: 'info',
  ISSUED: 'info',
  LOADED: 'info',
  ARRIVED: 'info',
  INFO: 'info',
  OUTGOING: 'info',
  CONVERTED: 'info',
  PREVENTIVE: 'info',

  // neutral / inactive
  DRAFT: 'neutral',
  INACTIVE: 'neutral',
  CANCELLED: 'neutral',
  CLOSED: 'neutral',
  DISMISSED: 'neutral',
  DISABLED: 'neutral',
  ARCHIVED: 'neutral',
  SUPERSEDED: 'neutral',
  COMPLETE: 'neutral',

  // problems
  REJECTED: 'negative',
  FAILED: 'negative',
  FAIL: 'negative',
  CRITICAL: 'negative',
  HIGH: 'negative',
  ABSENT: 'negative',
  CORRECTIVE: 'negative',
  OVERDUE: 'negative',
};

/** Colour-codes a status/enum value consistently: the same string always renders the same tone on every page. */
export function Badge({ value }: { value: string | null | undefined }) {
  if (!value) return <span className={styles.empty}>—</span>;
  const tone = TONE_BY_VALUE[value] ?? 'neutral';
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.text}>{value.replaceAll('_', ' ').toLowerCase()}</span>
    </span>
  );
}
