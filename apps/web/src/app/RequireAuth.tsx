import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../lib/auth';

/** Redirects to /login if there's no session token. No token-expiry check beyond what the API itself enforces (a 401 clears the session — see lib/api.ts). */
export function RequireAuth() {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
