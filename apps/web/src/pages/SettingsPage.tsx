import type { FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { ActionButton } from '../components/ActionButton';
import { Badge } from '../components/Badge';
import { Tabs } from '../components/Tabs';
import { EmptyState, InlineError, Panel, PageHeader, TableSkeleton } from '../components/ui';
import { when } from '../lib/format';
import { ApiError, apiDelete, apiGet, apiPost } from '../lib/api';
import { getUser, hasPermission } from '../lib/auth';
import tableStyles from '../components/ResourceListPage.module.css';
import styles from './Settings.module.css';

interface UserRow { id: string; email: string; fullName: string; status: string; lastLoginAt: string | null; roles: { id: string; code: string }[] }
interface Role { id: string; code: string; name: string; description: string | null; isSystem: boolean; permissions: string[] }
interface Permission { id: string; code: string; module: string; description: string | null }

const groupByModule = (codes: string[]) => {
  const out: Record<string, string[]> = {};
  for (const c of [...codes].sort()) (out[c.split('.')[0]] ??= []).push(c);
  return out;
};

function ProfileTab() {
  const user = getUser();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (form.newPassword.length < 8) return setError('New password must be at least 8 characters.');
    if (form.newPassword !== form.confirm) return setError('The two new passwords don’t match.');
    setBusy(true);
    try {
      await apiPost('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change password');
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;
  const grouped = groupByModule(user.permissions);
  const mods = Object.keys(grouped);

  return (
    <div className={styles.two}>
      <div className={styles.col}>
        <Panel title="Your account">
          <dl className={styles.dl}>
            <div><dt>Name</dt><dd>{user.fullName}</dd></div>
            <div><dt>Email</dt><dd>{user.email}</dd></div>
            <div><dt>Roles</dt><dd>{user.roles.length ? user.roles.map((r) => <Badge key={r} value={r} />) : <span className="muted">none assigned</span>}</dd></div>
          </dl>
        </Panel>
        <Panel title="Change password" aside={<span className="muted">Other sessions are signed out</span>}>
          <form onSubmit={submit} className={styles.pwForm}>
            <label><span>Current password</span><input type="password" autoComplete="current-password" required value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))} /></label>
            <label><span>New password</span><input type="password" autoComplete="new-password" required minLength={8} value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))} /></label>
            <label><span>Confirm new password</span><input type="password" autoComplete="new-password" required value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} /></label>
            {error && <InlineError>{error}</InlineError>}
            {done && <p className={styles.ok} role="status">Password changed. Your other sessions have been signed out.</p>}
            <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
          </form>
        </Panel>
      </div>
      <Panel title="What you can do" aside={<span className="muted">{user.permissions.length} permissions</span>}>
        {mods.length === 0 ? (
          <p className="muted">No permissions — ask an administrator to assign you a role.</p>
        ) : (
          mods.map((m) => (
            <div key={m} className={styles.permGroup}>
              <div className={styles.permModule}>{m.replaceAll('_', ' ')}</div>
              <div className={styles.chips}>
                {grouped[m].map((c) => <code key={c} className={styles.perm}>{c.slice(m.length + 1)}</code>)}
              </div>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}

function RoleAdder({ user, roles, onDone }: { user: UserRow; roles: Role[]; onDone: () => void }) {
  const [roleId, setRoleId] = useState('');
  const available = roles.filter((r) => !user.roles.some((u) => u.id === r.id));
  if (available.length === 0) return null;
  return (
    <span className={styles.adder}>
      <select value={roleId} onChange={(e) => setRoleId(e.target.value)} aria-label={`Add role to ${user.email}`}>
        <option value="">Add role…</option>
        {available.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
      {roleId && <ActionButton label="Assign" tone="primary" run={() => apiPost(`/users/${user.id}/roles`, { roleId })} onDone={() => (setRoleId(''), onDone())} />}
    </span>
  );
}

function AddUser({ roles, onDone }: { roles: Role[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', roleId: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPost('/users', {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        roleIds: form.roleId ? [form.roleId] : [],
      });
      setForm({ fullName: '', email: '', password: '', roleId: '' });
      setOpen(false);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the user');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className={styles.addRow}>
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>Add user</button>
        <span className="muted">Accounts are created here — there is no public sign-up.</span>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className={styles.addForm}>
      <label><span>Full name</span><input required value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} /></label>
      <label><span>Email</span><input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></label>
      <label>
        <span>Temporary password</span>
        <input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        <small className="muted">At least 8 characters. Ask them to change it on first sign-in.</small>
      </label>
      <label>
        <span>Role</span>
        <select value={form.roleId} onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}>
          <option value="">No role (no access yet)</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </label>
      {error && <InlineError>{error}</InlineError>}
      <div className={styles.addActions}>
        <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create user'}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

function UsersTab() {
  const canManage = hasPermission('identity.user.manage');
  const me = getUser();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([apiGet<UserRow[]>('/users'), apiGet<Role[]>('/roles')]);
      setUsers(u);
      setRoles(r);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? (e.status === 403 ? 'You don’t have permission to view users.' : e.message) : 'Failed to load');
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    // Every setState inside load() happens after an await, not synchronously in this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  async function removeRole(userId: string, roleId: string) {
    setRowError(null);
    try {
      await apiDelete(`/users/${userId}/roles/${roleId}`);
      load();
    } catch (e) {
      setRowError(e instanceof ApiError ? e.message : 'Could not remove role');
    }
  }

  if (error) return <InlineError>{error}</InlineError>;
  if (!users) return <TableSkeleton />;
  if (users.length === 0) return <EmptyState title="No users" />;

  return (
    <div>
      {canManage && <AddUser roles={roles} onDone={load} />}
      {rowError && <InlineError>{rowError}</InlineError>}
      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table}>
          <thead>
            <tr><th>User</th><th>Roles</th><th>Status</th><th>Last sign-in</th>{canManage && <th aria-label="Actions" />}</tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className={styles.userName}>{u.fullName}{u.id === me?.id && <span className={styles.you}>you</span>}</div>
                  <div className="muted">{u.email}</div>
                </td>
                <td>
                  <div className={styles.roleChips}>
                    {u.roles.length === 0 && <span className="muted">none</span>}
                    {u.roles.map((r) => (
                      <span key={r.id} className={styles.roleChip}>
                        {r.code}
                        {canManage && (
                          <button type="button" className={styles.x} aria-label={`Remove ${r.code} from ${u.email}`} onClick={() => removeRole(u.id, r.id)}>
                            <X size={11} weight="bold" />
                          </button>
                        )}
                      </span>
                    ))}
                    {canManage && <RoleAdder user={u} roles={roles} onDone={load} />}
                  </div>
                </td>
                <td><Badge value={u.status} /></td>
                <td className="muted">{u.lastLoginAt ? when(u.lastLoginAt) : 'never'}</td>
                {canManage && (
                  <td className={tableStyles.actions}>
                    {u.id !== me?.id && (
                      <ActionButton
                        label={u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        tone={u.status === 'ACTIVE' ? 'danger' : 'default'}
                        run={() => apiPost(`/users/${u.id}/status`, { status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
                        onDone={load}
                      />
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RolesTab() {
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([apiGet<Role[]>('/roles'), apiGet<Permission[]>('/permissions')])
      .then(([r, p]) => (setRoles(r), setPerms(p)))
      .catch((e) => (setError(e instanceof ApiError ? (e.status === 403 ? 'You don’t have permission to view roles.' : e.message) : 'Failed to load'), setRoles([])));
  }, []);

  if (error) return <InlineError>{error}</InlineError>;
  if (!roles) return <TableSkeleton rows={3} />;

  const byModule: Record<string, Permission[]> = {};
  for (const p of perms) (byModule[p.module] ??= []).push(p);

  return (
    <div className={styles.col}>
      {roles.map((r) => (
        <Panel key={r.id} title={r.name} aside={<span className="muted">{r.code}{r.isSystem ? ' · system role' : ''} · {r.permissions.length} permissions</span>}>
          {r.description && <p className="muted" style={{ marginTop: 0 }}>{r.description}</p>}
          {Object.entries(groupByModule(r.permissions)).map(([m, codes]) => (
            <div key={m} className={styles.permGroup}>
              <div className={styles.permModule}>{m.replaceAll('_', ' ')}</div>
              <div className={styles.chips}>{codes.map((c) => <code key={c} className={styles.perm}>{c.slice(m.length + 1)}</code>)}</div>
            </div>
          ))}
        </Panel>
      ))}
      <Panel title="Permission catalog" aside={<span className="muted">{perms.length} defined</span>}>
        {Object.entries(byModule).map(([m, list]) => (
          <div key={m} className={styles.permGroup}>
            <div className={styles.permModule}>{m.replaceAll('_', ' ').toLowerCase()}</div>
            <ul className={styles.catalog}>
              {list.map((p) => (
                <li key={p.id}><code className={styles.perm}>{p.code}</code><span className="muted">{p.description}</span></li>
              ))}
            </ul>
          </div>
        ))}
      </Panel>
    </div>
  );
}

export function SettingsPage() {
  return (
    <section>
      <PageHeader title="Settings" description="Your account, who else can sign in, and what each role is allowed to do." />
      <Tabs
        tabs={[
          { label: 'Profile & security', content: <ProfileTab /> },
          { label: 'Users', content: <UsersTab /> },
          { label: 'Roles & permissions', content: <RolesTab /> },
        ]}
      />
    </section>
  );
}
