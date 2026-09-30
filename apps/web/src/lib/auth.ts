/** Simple localStorage-backed session — no refresh tokens, matches the backend's single opaque-token session model. */
const TOKEN_KEY = 'cpf_token';
const USER_KEY = 'cpf_user';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

/** Stashes just the token, before the user profile is known — see Login.tsx, which needs an authenticated request (GET /auth/me) to learn who logged in. */
export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function setSession(token: string, user: SessionUser): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // localStorage unavailable (private window etc.) — session just won't persist across reloads
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
