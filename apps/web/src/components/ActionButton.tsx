import { useState } from 'react';
import { ApiError } from '../lib/api';
import styles from './ActionButton.module.css';

interface ActionButtonProps {
  label: string;
  /** Runs the request. Receives the text entered when `ask` is set. */
  run: (input?: string) => Promise<unknown>;
  /** Called after a successful run — normally the owning list's reload. */
  onDone?: () => void;
  tone?: 'default' | 'danger' | 'primary';
  /** When set, clicking first reveals an input (e.g. a resolution note or a quantity) before running. */
  ask?: { placeholder: string; type?: 'text' | 'number'; required?: boolean };
}

/**
 * A row/toolbar action that owns its own pending and error state, so an
 * API rejection (e.g. "cannot approve your own expense") shows up right
 * next to the button that caused it instead of being swallowed.
 */
export function ActionButton({ label, run, onDone, tone = 'default', ask }: ActionButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [value, setValue] = useState('');

  async function execute() {
    setBusy(true);
    setError(null);
    try {
      await run(ask ? value : undefined);
      setAsking(false);
      setValue('');
      onDone?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  const toneClass = tone === 'danger' ? 'btn-danger' : tone === 'primary' ? 'btn-primary' : '';

  return (
    <span className={styles.wrap}>
      {asking ? (
        <span className={styles.ask}>
          <input
            autoFocus
            type={ask?.type ?? 'text'}
            placeholder={ask?.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (!ask?.required || value) && execute()}
            className={styles.input}
            aria-label={ask?.placeholder}
          />
          <button type="button" className={`btn-sm btn-primary`} disabled={busy || (ask?.required && !value)} onClick={execute}>
            {busy ? '…' : 'Confirm'}
          </button>
          <button type="button" className="btn-sm btn-ghost" onClick={() => (setAsking(false), setError(null))}>
            Cancel
          </button>
        </span>
      ) : (
        <button type="button" className={`btn-sm ${toneClass}`} disabled={busy} onClick={() => (ask ? setAsking(true) : execute())}>
          {busy ? '…' : label}
        </button>
      )}
      {error && (
        <span role="alert" className={styles.error}>
          {error}
        </span>
      )}
    </span>
  );
}
