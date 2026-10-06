import { useCallback, useEffect, useState } from 'react';
import { ActionButton } from '../components/ActionButton';
import { ResourceListPage } from '../components/ResourceListPage';
import { InlineError, TableSkeleton } from '../components/ui';
import { ApiError, apiDelete, apiGet, apiPost } from '../lib/api';
import { useLookup } from '../lib/useLookup';
import tableStyles from '../components/ResourceListPage.module.css';
import styles from './Dispatch.module.css';

interface DispatchRecord {
  id: string;
  salesOrderId: string;
  vehicleId: string;
  driverId: string | null;
  status: string;
  deliveryNotes: string | null;
}
interface DispatchLot { id: string; packingLotId: string; lotNumber: string; quantityUnits: string; netWeightKg: string | null }
interface AvailableLot { id: string; lotNumber: string; quantityUnits: string }

/**
 * The packed lots that ship on a dispatch. This is the link that lets a
 * production batch be traced forward to a customer: until a lot is added
 * here, it is "packed, not shipped" as far as traceability can tell.
 */
function LotsPanel({ dispatch }: { dispatch: DispatchRecord }) {
  const editable = dispatch.status === 'PENDING';
  const [lots, setLots] = useState<DispatchLot[] | null>(null);
  const [available, setAvailable] = useState<AvailableLot[]>([]);
  const [pick, setPick] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [l, a] = await Promise.all([
        apiGet<DispatchLot[]>(`/dispatches/${dispatch.id}/lots`),
        editable ? apiGet<AvailableLot[]>(`/dispatches/${dispatch.id}/available-lots`) : Promise.resolve([]),
      ]);
      setLots(l);
      setAvailable(a);
      setPick('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load lots');
      setLots([]);
    }
  }, [dispatch.id, editable]);

  useEffect(() => {
    // Every setState inside load() happens after an await, not synchronously in this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    load();
  }, [load]);

  async function remove(packingLotId: string) {
    setError(null);
    try {
      await apiDelete(`/dispatches/${dispatch.id}/lots/${packingLotId}`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not remove lot');
    }
  }

  if (!lots) return <TableSkeleton rows={2} cols={3} />;

  return (
    <div>
      <h3 className={styles.title}>Lots on this dispatch</h3>
      {error && <InlineError>{error}</InlineError>}
      {lots.length === 0 && (
        <p className={styles.warn}>
          No lots linked. Goods on this dispatch can’t be traced back to a production batch or its suppliers
          {editable ? ' — add the packed lots that are being loaded.' : '.'}
        </p>
      )}
      {lots.length > 0 && (
        <div className={tableStyles.tableWrap} style={{ boxShadow: 'none', marginBottom: 12 }}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Lot</th>
                <th className={tableStyles.right}>Units</th>
                <th className={tableStyles.right}>Net kg</th>
                {editable && <th aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {lots.map((l) => (
                <tr key={l.id}>
                  <td className={tableStyles.mono}>{l.lotNumber}</td>
                  <td className={tableStyles.right}>{l.quantityUnits}</td>
                  <td className={tableStyles.right}>{l.netWeightKg ?? '—'}</td>
                  {editable && (
                    <td className={tableStyles.actions}>
                      <button type="button" className="btn-sm btn-danger" onClick={() => remove(l.packingLotId)}>Remove</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editable && (
        <div className={styles.adder}>
          <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Packed lot to add">
            <option value="">{available.length ? 'Choose a packed lot…' : 'No eligible lots'}</option>
            {available.map((l) => (
              <option key={l.id} value={l.id}>{l.lotNumber} · {l.quantityUnits} units</option>
            ))}
          </select>
          {pick && <ActionButton label="Add lot" tone="primary" run={() => apiPost(`/dispatches/${dispatch.id}/lots`, { packingLotId: pick })} onDone={load} />}
          <span className="muted">Only lots from a completed packing order, of a product on this sales order, not already shipping.</span>
        </div>
      )}
    </div>
  );
}

export function DispatchPage() {
  const order = useLookup('/sales-orders', (r) => String(r.orderNumber));
  const vehicle = useLookup('/vehicles', (r) => String(r.registrationNumber));
  const driver = useLookup('/drivers', (r) => String(r.fullName));

  return (
    <ResourceListPage<DispatchRecord>
      variant="page"
      title="Dispatch"
      description="A dispatch can only be created against a confirmed sales order, one active dispatch per order. Link the packed lots being loaded so what ships can be traced back to its batch and suppliers."
      listPath="/dispatches"
      createPath="/dispatches"
      createLabel="New dispatch"
      createFields={[
        { name: 'salesOrderId', label: 'Confirmed sales order', type: 'reference', endpoint: '/sales-orders', labelKey: 'orderNumber', filter: (o) => o.status === 'CONFIRMED', required: true },
        { name: 'vehicleId', label: 'Vehicle', type: 'reference', endpoint: '/vehicles', labelKey: 'registrationNumber', required: true },
        { name: 'driverId', label: 'Driver', type: 'reference', endpoint: '/drivers', labelKey: 'fullName' },
      ]}
      columns={[
        { key: 'salesOrderId', label: 'Sales order', mono: true, render: (r) => order(r.salesOrderId) },
        { key: 'vehicleId', label: 'Vehicle', mono: true, render: (r) => vehicle(r.vehicleId) },
        { key: 'driverId', label: 'Driver', render: (r) => driver(r.driverId) },
        { key: 'status', label: 'Status' },
        { key: 'deliveryNotes', label: 'Delivery notes' },
      ]}
      rowActions={(r, reload) => (
        <>
          {r.status === 'PENDING' && <ActionButton label="Dispatch" tone="primary" run={() => apiPost(`/dispatches/${r.id}/dispatch`)} onDone={reload} />}
          {r.status === 'DISPATCHED' && (
            <ActionButton
              label="Mark delivered"
              tone="primary"
              ask={{ placeholder: 'Delivery notes (optional)' }}
              run={(n) => apiPost(`/dispatches/${r.id}/deliver`, { deliveryNotes: n || undefined })}
              onDone={reload}
            />
          )}
          {(r.status === 'PENDING' || r.status === 'DISPATCHED') && (
            <ActionButton label="Cancel" tone="danger" run={() => apiPost(`/dispatches/${r.id}/cancel`)} onDone={reload} />
          )}
        </>
      )}
      detailLabel="Lots"
      renderDetail={(r) => <LotsPanel dispatch={r} />}
    />
  );
}
