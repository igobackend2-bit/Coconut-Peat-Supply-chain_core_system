import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, ApiError } from '../lib/api';
import { Badge } from '../components/Badge';
import listStyles from '../components/ResourceListPage.module.css';

interface ProductionBatch {
  id: string;
  batchNumber: string;
  productId: string;
  status: string;
  plannedQuantityKg: string | null;
}

interface RefOption {
  value: string;
  label: string;
}

/**
 * Production Batches have real multi-step lifecycle logic (input
 * consumption, output recording, complete/release/reject/close, each
 * gated by status and, for release/reject, an approval) — exactly the
 * kind of workflow the generic ResourceListPage deliberately doesn't
 * try to cover. This page is fully custom, same reasoning as
 * ProcurementPage's Purchase Orders panel.
 */
export function ProductionPage() {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [products, setProducts] = useState<RefOption[]>([]);
  const [rawMaterialLots, setRawMaterialLots] = useState<RefOption[]>([]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProductId, setNewProductId] = useState('');
  const [newPlannedQty, setNewPlannedQty] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [inputLotId, setInputLotId] = useState('');
  const [inputQty, setInputQty] = useState('');
  const [outputProductId, setOutputProductId] = useState('');
  const [outputQty, setOutputQty] = useState('');

  async function loadBatches() {
    setLoading(true);
    setLoadError(null);
    try {
      setBatches(await apiGet<ProductionBatch[]>('/production-batches'));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBatches();
    apiGet<{ id: string; sku: string }[]>('/products')
      .then((data) => setProducts(data.map((p) => ({ value: p.id, label: p.sku }))))
      .catch(() => {});
    apiGet<{ id: string; lotNumber: string; status: string }[]>('/raw-material-lots')
      .then((data) =>
        setRawMaterialLots(data.filter((l) => l.status !== 'CONSUMED').map((l) => ({ value: l.id, label: l.lotNumber }))),
      )
      .catch(() => {});
  }, []);

  async function handleCreateBatch(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await apiPost('/production-batches', {
        productId: newProductId,
        plannedQuantityKg: newPlannedQty ? Number(newPlannedQty) : undefined,
      });
      setNewProductId('');
      setNewPlannedQty('');
      setShowCreateForm(false);
      await loadBatches();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  }

  async function runAction(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      await loadBatches();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed');
    }
  }

  const selected = batches.find((b) => b.id === selectedId) ?? null;

  return (
    <section>
      <div className={listStyles.header}>
        <div>
          <h1>Production</h1>
          <p className={listStyles.description}>
            Batch lifecycle: IN_PROGRESS → COMPLETED → (ON_HOLD if a QC result is out of spec →) RELEASED/REJECTED → CLOSED.
          </p>
        </div>
        <button type="button" onClick={() => setShowCreateForm((v) => !v)} className={listStyles.newButton}>
          {showCreateForm ? 'Cancel' : '+ New Batch'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateBatch} className={listStyles.form}>
          <label className={listStyles.formField}>
            Product
            <select required value={newProductId} onChange={(e) => setNewProductId(e.target.value)}>
              <option value="">— select —</option>
              {products.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className={listStyles.formField}>
            Planned Quantity (kg)
            <input type="number" step="0.01" value={newPlannedQty} onChange={(e) => setNewPlannedQty(e.target.value)} />
          </label>
          {createError && (
            <p role="alert" className={listStyles.formError}>
              {createError}
            </p>
          )}
          <button type="submit" disabled={creating}>
            {creating ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}

      {loading && <p>Loading…</p>}
      {loadError && (
        <p role="alert" className={listStyles.formError}>
          {loadError}
        </p>
      )}

      {!loading && !loadError && (
        <table className={listStyles.table}>
          <thead>
            <tr>
              <th>Batch Number</th>
              <th>Status</th>
              <th>Planned (kg)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id}>
                <td>{b.batchNumber}</td>
                <td><Badge value={b.status} /></td>
                <td>{b.plannedQuantityKg ?? '—'}</td>
                <td>
                  <button type="button" onClick={() => setSelectedId(b.id === selectedId ? null : b.id)}>
                    {b.id === selectedId ? 'Hide' : 'Manage'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className={listStyles.form} style={{ display: 'block', marginTop: 20 }}>
          <h2 style={{ marginTop: 0 }}>
            {selected.batchNumber} — <Badge value={selected.status} />
          </h2>
          {actionError && (
            <p role="alert" className={listStyles.formError}>
              {actionError}
            </p>
          )}

          {selected.status === 'IN_PROGRESS' && (
            <>
              <h3>Consume Raw Material Lot</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <select value={inputLotId} onChange={(e) => setInputLotId(e.target.value)}>
                  <option value="">— select lot —</option>
                  {rawMaterialLots.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Quantity (kg)"
                  value={inputQty}
                  onChange={(e) => setInputQty(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() =>
                    runAction(() =>
                      apiPost(`/production-batches/${selected.id}/inputs`, {
                        rawMaterialLotId: inputLotId,
                        quantityConsumedKg: Number(inputQty),
                      }),
                    )
                  }
                >
                  Add Input
                </button>
              </div>

              <h3>Record Output</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <select value={outputProductId} onChange={(e) => setOutputProductId(e.target.value)}>
                  <option value="">— select product —</option>
                  {products.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Quantity (kg)"
                  value={outputQty}
                  onChange={(e) => setOutputQty(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() =>
                    runAction(() =>
                      apiPost(`/production-batches/${selected.id}/outputs`, {
                        productId: outputProductId,
                        quantityKg: Number(outputQty),
                      }),
                    )
                  }
                >
                  Add Output
                </button>
              </div>

              <button type="button" onClick={() => runAction(() => apiPost(`/production-batches/${selected.id}/complete`))}>
                Mark Completed
              </button>
            </>
          )}

          {(selected.status === 'COMPLETED' || selected.status === 'ON_HOLD') && (
            <>
              <p>
                Go to <strong>Quality</strong> to sample this batch and record QC results — an out-of-spec result will
                automatically put it ON_HOLD.
              </p>
              <button type="button" onClick={() => runAction(() => apiPost(`/production-batches/${selected.id}/release`, {}))}>
                Release
              </button>{' '}
              <button type="button" onClick={() => runAction(() => apiPost(`/production-batches/${selected.id}/reject`, {}))}>
                Reject
              </button>
            </>
          )}

          {(selected.status === 'RELEASED' || selected.status === 'REJECTED') && (
            <button type="button" onClick={() => runAction(() => apiPost(`/production-batches/${selected.id}/close`))}>
              Close Batch
            </button>
          )}

          {selected.status === 'CLOSED' && <p>This batch is closed.</p>}
        </div>
      )}
    </section>
  );
}
