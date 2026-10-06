/**
 * Fetch wrapper for the NestJS API (apps/api). Attaches the session's
 * bearer token (see lib/auth.ts) when present. Base URL is an env var,
 * not a Vite dev-server proxy, so the same code path works in dev and
 * prod.
 */
import { clearSession, getToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    // Session token is missing/expired/revoked — no refresh mechanism exists yet (see docs/security.md),
    // so the only correct move is to drop the stale session and send the user back to login.
    clearSession();
  }

  if (!response.ok) {
    let message = `${method} ${path} failed with ${response.status}`;
    let parsedBody: unknown;
    try {
      parsedBody = await response.json();
      if (parsedBody && typeof parsedBody === 'object' && 'message' in parsedBody) {
        message = String((parsedBody as { message: unknown }).message);
      }
    } catch {
      // body wasn't JSON — keep the generic message
    }
    throw new ApiError(response.status, message, parsedBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const apiGet = <T>(path: string) => request<T>('GET', path);
export const apiPost = <T>(path: string, body?: unknown) => request<T>('POST', path, body);
export const apiDelete = <T>(path: string) => request<T>('DELETE', path);
export const apiPatch = <T>(path: string, body?: unknown) => request<T>('PATCH', path, body);
