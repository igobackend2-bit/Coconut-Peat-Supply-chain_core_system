import { List, SignOut, X } from '@phosphor-icons/react';
import { Suspense, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { navigationItems } from '../app/navigation';
import { clearSession, getUser } from '../lib/auth';
import { TableSkeleton } from './ui';
import styles from './AppShell.module.css';

/** Navigation entries bucketed by `group`, preserving the order they're declared in navigation.ts. */
function groupedNavigation() {
  const groups: { name: string; items: typeof navigationItems }[] = [];
  for (const item of navigationItems) {
    const last = groups[groups.length - 1];
    if (last && last.name === item.group) last.items.push(item);
    else groups.push({ name: item.group, items: [item] });
  }
  return groups;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/**
 * Desktop shell per docs/design.md §2: grouped left navigation, main
 * workspace. Search / notifications / AI copilot panel from that spec are
 * deliberately not stubbed — nothing is rendered for features that don't
 * exist.
 */
export function AppShell() {
  const navigate = useNavigate();
  const user = getUser();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <div className={styles.shell}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <nav className={styles.sidebar} aria-label="Main navigation" data-open={menuOpen}>
        <div className={styles.brand}>
          <img src="/favicon.svg" alt="" width={28} height={28} className={styles.brandMark} />
          <div>
            <div className={styles.brandName}>Coco Pith</div>
            <div className={styles.brandSub}>Factory OS</div>
          </div>
          <button
            type="button"
            className={`btn-ghost ${styles.menuToggle}`}
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={20} /> : <List size={20} />}
          </button>
        </div>
        <div className={styles.navScroll} id="main-nav">
          {groupedNavigation().map((group) => (
            <div key={group.name} className={styles.group}>
              <div className={styles.groupLabel}>{group.name}</div>
              <ul className={styles.navList}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={`/${item.path}`}
                        end={item.path === ''}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink)}
                      >
                        <Icon size={17} weight="regular" aria-hidden="true" />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        {user && (
          <div className={styles.userBox}>
            <div className={styles.avatar} aria-hidden="true">
              {initials(user.fullName || user.email)}
            </div>
            <div className={styles.userText}>
              <div className={styles.userName}>{user.fullName || user.email}</div>
              <div className={styles.userRoles}>{user.roles.join(', ') || 'no roles'}</div>
            </div>
            <button type="button" onClick={handleLogout} className={`btn-ghost ${styles.logoutButton}`} aria-label="Log out" title="Log out">
              <SignOut size={17} aria-hidden="true" />
            </button>
          </div>
        )}
      </nav>
      <main id="main" className={styles.content} tabIndex={-1}>
        <div className={styles.page}>
          <Suspense fallback={<TableSkeleton rows={6} />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
