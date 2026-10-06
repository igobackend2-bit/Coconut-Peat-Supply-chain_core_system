import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { isAuthenticated, updateUser, type SessionUser } from '../lib/auth';

/**
 * Redirects to /login without a session token. With one, it re-reads the
 * profile from /auth/me once per page load before rendering anything:
 * the roles/permissions cached at login go stale when an admin changes
 * them, and this also catches a revoked/expired token up front (the API
 * client clears the session on a 401, which sends the user to login).
 * A network failure is not treated as logout — the cached profile is used.
 */
export function RequireAuth() {
  const location = useLocation();
  const [checked, setChecked] = useState(false);
  const hasToken = isAuthenticated();

  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;
    apiGet<SessionUser>('/auth/me')
      .then((user) => updateUser(user))
      .catch(() => {})
      .finally(() => !cancelled && setChecked(true));
    return () => {
      cancelled = true;
    };
  }, [hasToken]);

  if (!hasToken || !isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!checked) return null;
  return <Outlet />;
}
