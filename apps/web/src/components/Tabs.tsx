import type { ReactNode } from 'react';
import { useState } from 'react';
import styles from './Tabs.module.css';

export function Tabs({ tabs }: { tabs: { label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className={styles.tabBar}>
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActive(i)}
            className={i === active ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{tabs[active].content}</div>
    </div>
  );
}
