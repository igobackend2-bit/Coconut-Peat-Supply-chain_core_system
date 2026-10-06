import type { ReactNode } from 'react';
import { useEffect } from 'react';
import styles from './ui.module.css';

/** Page title block used by every screen so headings, descriptions and primary actions line up. */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · Coco Pith Factory`;
  }, [title]);
  return (
    <header className={styles.pageHeader}>
      <div>
        <h1>{title}</h1>
        {description && <p className={styles.pageDescription}>{description}</p>}
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </header>
  );
}

/** Loading placeholder shaped like the table it stands in for, instead of a spinner or bare "Loading…". */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className={styles.skeletonTable} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className={styles.skeletonRow} style={{ animationDelay: `${r * 70}ms` }}>
          {Array.from({ length: cols }, (_, c) => (
            <span key={c} className={styles.skeletonCell} style={{ width: `${55 + ((r * 7 + c * 13) % 40)}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyTitle}>{title}</div>
      {hint && <p className={styles.emptyHint}>{hint}</p>}
      {action}
    </div>
  );
}

export function InlineError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className={styles.inlineError}>
      {children}
    </p>
  );
}

/** Key/value stat used inside panels. Numbers are tabular so columns of them align. */
export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'negative' | 'warning' | 'positive' }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statLabel}>{label}</div>
      <div className={`${styles.statValue} ${tone ? styles[tone] : ''}`}>{value}</div>
    </div>
  );
}

export function Panel({ title, aside, children }: { title?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.panel}>
      {(title || aside) && (
        <div className={styles.panelHead}>
          {title && <h2>{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
