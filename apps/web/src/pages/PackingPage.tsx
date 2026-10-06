import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, ApiError } from '../lib/api';
import { Badge } from '../components/Badge';
import listStyles from '../components/ResourceListPage.module.css';

interface PackingOrder {
  id: string;
  productionBatchId: string;
  packagingTypeId: string;
  plannedQuantityUnits: string | null;
  status: string;
}

interface PackingLot {
  id: string;
  lotNumber: string;
  productId: string;
  quantityUnits: string;
  netWeightKg: string | null;
  qcStatus: string;
}

interface RefOption {
  value: string;
  label: string;
}

/**
 * Like Production Batches, Packing Orders have real workflow logic
 * (RELEASED-batch-only creation, PENDING→IN_PROGRESS→COMPLETED lifecycle,
 * nested lots) — custom page, not ResourceListPage. See
 * ProductionPage.tsx for the same reasoning.
 */
export function PackingPage() {
  const [orders, setOrders] = useState<PackingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [releasedBatches, setReleasedBatches] = useState<RefOption[]>([]);
  const [packagingTypes, setPackagingTypes] = useState<RefOption[]>([]);
  const [products, setProducts] = useState<RefOption[]>([]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBatchId, setNewBatchId] = useState('');
  const [newPackagingTypeId, setNewPackagingTypeId] = useState('');
  const [newPlannedQty, setNewPlannedQty] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lots, setLots] = useState<PackingLot[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const [lotProductId, setLotProductId] = useState('');
  const [lotQty, setLotQty] = useState('');
  const [lotNetWeight, setLotNetWeight] = useState('');

  async function loadOrders() {
    // Initial state is already loading=true; reloads after an action keep showing the current rows.
    try {
      setOrders(await apiGet<PackingOrder[]>('/packing-orders'));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // loadOrders() only sets state after its await resolves, never synchronously inside this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    loadOrders();
    apiGet<{ id: string; batchNumber: string; status: string }[]>('/production-batches')
      .then((data) =>
        setReleasedBatches(data.filter((b) => b.status === 'RELEASED').map((b) => ({ value: b.id, label: b.batchNumber }))),
      )
      .catch(() => {});
    apiGet<{ id: string; code: string }[]>('/packaging-types')
      .then((data) => setPackagingTypes(data.map((p) => ({ value: p.id, label: p.code }))))
      .catch(() => {});
    apiGet<{ id: string; sku: string }[]>('/products')
      .then((data) => setProducts(data.map((p) => ({ value: p.id, label: p.sku }))))
      .catch(() => {});
  }, []);

  async function handleCreateOrder(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await apiPost('/packing-orders', {
        productionBatchId: newBatchId,
        packagingTypeId: newPackagingTypeId,
        plannedQuantityUnits: newPlannedQty ? Number(newPlannedQty) : undefined,
      });
      setNewBatchId('');
      setNewPackagingTypeId('');
      setNewPlannedQty('');
      setShowCreateForm(false);
      await loadOrders();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  }

  async function loadLots(orderId: string) {
    try {
      setLots(await apiGet<PackingLot[]>(`/packing-orders/${orderId}/lots`));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to load lots');
    }
  }

  function selectOrder(id: string) {
    const next = id === selectedId ? null : id;
    setSelectedId(next);
    setActionError(null);
    if (next) {
      loadLots(next);
    }
  }

  async function runAction(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      await loadOrders();
      if (selectedId) {
        await loadLots(selectedId);
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed');
    }
  }

  const selected = orders.find((o) => o.id === selectedId) ?? null;
  const skuFor = (id: string) => products.find((p) => p.value === id)?.label ?? id.slice(0, 8);
  const packagingCodeFor = (id: string) => packagingTypes.find((p) => p.value === id)?.label ?? id.slice(0, 8);

  return (
    <section>
      <div className={listStyles.header}>
        <div>
          <h1>Packing</h1>
          <p className={listStyles.description}>
            A packing order can only be created against a RELEASED production batch — packing what hasn't cleared QC would
            defeat the Quality gate. Order lifecycle: PENDING → IN_PROGRESS (on first lot) → COMPLETED.
          </p>
        </div>
        <button type="button" onClick={() => setShowCreateForm((v) => !v)} className={listStyles.newButton}>
          {showCreateForm ? 'Cancel' : '+ New Packing Order'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateOrder} className={listStyles.form}>
          <label className={listStyles.formField}>
            Released Production Batch
            <select required value={newBatchId} onChange={(e) => setNewBatchId(e.target.value)}>
              <option value="">— select —</option>
              {releasedBatches.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <label className={listStyles.formField}>
            Packaging Type
            <select required value={newPackagingTypeId} onChange={(e) => setNewPackagingTypeId(e.target.value)}>
              <option value="">— select —</option>
              {packagingTypes.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className={listStyles.formField}>
            Planned Quantity (units)
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
              <th>Batch</th>
              <th>Packaging Type</th>
              <th>Status</th>
              <th>Planned (units)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{releasedBatches.find((b) => b.value === o.productionBatchId)?.label ?? o.productionBatchId.slice(0, 8)}</td>
                <td>{packagingCodeFor(o.packagingTypeId)}</td>
                <td><Badge value={o.status} /></td>
                <td>{o.plannedQuantityUnits ?? '—'}</td>
                <td>
                  <button type="button" onClick={() => selectOrder(o.id)}>
                    {o.id === selectedId ? 'Hide' : 'Manage'}
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
            {packagingCodeFor(selected.packagingTypeId)} — <Badge value={selected.status} />
          </h2>
          {actionError && (
            <p role="alert" className={listStyles.formError}>
              {actionError}
            </p>
          )}

          {(selected.status === 'PENDING' || selected.status === 'IN_PROGRESS') && (
            <>
              <h3>Add Packing Lot</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <select value={lotProductId} onChange={(e) => setLotProductId(e.target.value)}>
                  <option value="">— select product —</option>
                  {products.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <input type="number" step="0.01" placeholder="Quantity (units)" value={lotQty} onChange={(e) => setLotQty(e.target.value)} />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Net Weight (kg)"
                  value={lotNetWeight}
                  onChange={(e) => setLotNetWeight(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() =>
                    runAction(() =>
                      apiPost(`/packing-orders/${selected.id}/lots`, {
                        productId: lotProductId,
                        quantityUnits: Number(lotQty),
                        netWeightKg: lotNetWeight ? Number(lotNetWeight) : undefined,
                      }),
                    )
                  }
                >
                  Add Lot
                </button>
              </div>

              <button type="button" disabled={lots.length === 0} onClick={() => runAction(() => apiPost(`/packing-orders/${selected.id}/complete`))}>
                Mark Completed
              </button>
            </>
          )}

          <h3>Lots</h3>
          {lots.length === 0 && <p className={listStyles.description}>No lots recorded yet.</p>}
          {lots.length > 0 && (
            <table className={listStyles.table}>
              <thead>
                <tr>
                  <th>Lot Number</th>
                  <th>Product</th>
                  <th>Quantity (units)</th>
                  <th>Net Weight (kg)</th>
                  <th>QC Status</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((l) => (
                  <tr key={l.id}>
                    <td>{l.lotNumber}</td>
                    <td>{skuFor(l.productId)}</td>
                    <td>{l.quantityUnits}</td>
                    <td>{l.netWeightKg ?? '—'}</td>
                    <td><Badge value={l.qcStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
