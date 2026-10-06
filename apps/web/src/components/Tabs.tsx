import type { ReactNode } from 'react';
import { useState } from 'react';
import styles from './Tabs.module.css';

interface Tab {
  label: string;
  content: ReactNode;
}

/** Tab panels are only mounted while active, so each tab's data loads when first opened, not up front. */
export function Tabs({ tabs, initial = 0 }: { tabs: Tab[]; initial?: number }) {
  const [active, setActive] = useState(initial);
  return (
    <div>
      <div className={styles.tabBar} role="tablist">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={i === active ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" key={active} className={styles.panel}>
        {tabs[active].content}
      </div>
    </div>
  );
}
