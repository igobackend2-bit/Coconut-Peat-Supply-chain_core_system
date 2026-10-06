import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, ApiError } from '../lib/api';
import { setSession, setToken } from '../lib/auth';
import styles from './Login.module.css';

interface LoginResponse {
  token: string;
  expiresAt: string;
}

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { token } = await apiPost<LoginResponse>('/auth/login', { email, password });
      // /auth/login doesn't return the user profile — fetch it via the now-authenticated /auth/me.
      // Temporarily stash the token so apiGet('/auth/me') can use it before setSession is called.
      setToken(token);
      const user = await apiGet<{ id: string; email: string; fullName: string; roles: string[]; permissions: string[] }>('/auth/me');
      setSession(token, user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <aside className={styles.brandPanel}>
        <div className={styles.brandTop}>
          <img src="/favicon.svg" alt="" width={36} height={36} />
          <span>Coco Pith Factory</span>
        </div>
        <div>
          <h1 className={styles.headline}>From raw husk to export container, on one record.</h1>
          <ul className={styles.facts}>
            <li>Every stock movement is written to an append-only ledger.</li>
            <li>Nobody can approve their own expense or release a held batch without the right permission.</li>
            <li>Any batch traces back to its supplier, vehicle and weighbridge reading.</li>
          </ul>
        </div>
        <div className={styles.rings} aria-hidden="true" />
      </aside>

      <main className={styles.formPanel}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <h2>Sign in</h2>
          <p className={styles.sub}>Use your factory account.</p>
          <label>
            <span>Email</span>
            <input type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className={styles.submit}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </main>
    </div>
  );
}
