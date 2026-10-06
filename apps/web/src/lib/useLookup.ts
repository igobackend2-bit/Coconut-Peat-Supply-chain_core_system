import { useEffect, useState } from 'react';
import { apiGet } from './api';

type Row = Record<string, unknown> & { id: string };

/**
 * Loads a list endpoint once and returns a function that turns an id into
 * a human label, so tables can show "CPB-FG-001" instead of a UUID. Falls
 * back to the first 8 characters of the id while loading or when the
 * lookup fails — never blocks the table that's using it.
 */
export function useLookup(endpoint: string, label: (row: Row) => string) {
  const [map, setMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    apiGet<Row[]>(endpoint)
      .then((rows) => {
        if (!cancelled) setMap(new Map(rows.map((r) => [r.id, label(r)])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // `label` is a stable inline function in every caller; re-fetching on its identity would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  return (id: string | null | undefined) => (id ? (map.get(id) ?? id.slice(0, 8)) : '—');
}
