import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  linkTo?: string;
  linkLabel?: string;
}

export function StatCard({ label, value, hint, linkTo, linkLabel }: StatCardProps) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {hint && <span className={styles.hint}>{hint}</span>}
      {linkTo && (
        <Link to={linkTo} className={styles.link}>
          {linkLabel ?? 'View →'}
        </Link>
      )}
    </div>
  );
}
