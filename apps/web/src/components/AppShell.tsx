import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { navigationItems } from '../app/navigation';
import { clearSession, getUser } from '../lib/auth';
import styles from './AppShell.module.css';

/**
 * Desktop application shell per docs/design.md §2: left navigation, main
 * workspace. Top bar / search / notifications / AI Copilot from that
 * spec are not implemented yet beyond the user/logout corner added here
 * — this is the skeleton to build the rest into, not the finished shell.
 */
export function AppShell() {
  const navigate = useNavigate();
  const user = getUser();

  function handleLogout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar} aria-label="Main navigation">
        <div className={styles.brand}>Coco Pith Factory</div>
        <ul className={styles.navList}>
          {navigationItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={`/${item.path}`}
                end={item.path === ''}
                className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink)}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        {user && (
          <div className={styles.userBox}>
            <div className={styles.userEmail}>{user.email}</div>
            <div className={styles.userRoles}>{user.roles.join(', ') || 'no roles'}</div>
            <button type="button" onClick={handleLogout} className={styles.logoutButton}>
              Log out
            </button>
          </div>
        )}
      </nav>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
