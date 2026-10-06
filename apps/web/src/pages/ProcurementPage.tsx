import { PageHeader } from '../components/ui';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, ApiError } from '../lib/api';
import { Badge } from '../components/Badge';
import { ResourceListPage } from '../components/ResourceListPage';
import { Tabs } from '../components/Tabs';
import listStyles from '../components/ResourceListPage.module.css';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  status: string;
}

interface RefOption {
  value: string;
  label: string;
}

/**
 * Purchase Orders can't use the generic ResourceListPage — approve/reject
 * are per-row actions gated by a *different* permission
 * (procurement.purchase_order.approve) than create
 * (procurement.purchase_order.write), and the approval workflow (see
 * docs/permissions.md) is exactly the kind of real business logic that
 * justified keeping this module out of the generic component.
 */
function PurchaseOrdersPanel() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [suppliers, setSuppliers] = useState<RefOption[]>([]);
  const [products, setProducts] = useState<RefOption[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    // Initial state is already loading=true; reloads after an action keep showing the current rows.
    try {
      setOrders(await apiGet<PurchaseOrder[]>('/purchase-orders'));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // load() only sets state after its await resolves, never synchronously inside this effect.
    // oxlint-disable-next-line react/set-state-in-effect
    load();
    apiGet<{ id: string; name: string }[]>('/suppliers')
      .then((data) => setSuppliers(data.map((s) => ({ value: s.id, label: s.name }))))
      .catch(() => {});
    apiGet<{ id: string; sku: string }[]>('/products')
      .then((data) => setProducts(data.map((p) => ({ value: p.id, label: p.sku }))))
      .catch(() => {});
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await apiPost('/purchase-orders', {
        supplierId,
        productId,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
      });
      setSupplierId('');
      setProductId('');
      setQuantity('');
      setUnitPrice('');
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecision(id: string, decision: 'approve' | 'reject') {
    setActionError(null);
    try {
      await apiPost(`/purchase-orders/${id}/${decision}`, {});
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : `Failed to ${decision}`);
    }
  }

  return (
    <section>
      <div className={listStyles.header}>
        <div>
          <h2>Purchase Orders</h2>
          <p className={listStyles.description}>
            Orders over ₹100,000 require approval (a separate permission from creating one) before they can be received against.
          </p>
        </div>
        <button type="button" onClick={() => setShowForm((v) => !v)} className={listStyles.newButton}>
          {showForm ? 'Cancel' : '+ New'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className={listStyles.form}>
          <label className={listStyles.formField}>
            Supplier
            <select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">— select —</option>
              {suppliers.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className={listStyles.formField}>
            Product
            <select required value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">— select —</option>
              {products.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className={listStyles.formField}>
            Quantity
            <input type="number" step="0.01" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
          <label className={listStyles.formField}>
            Unit Price
            <input type="number" step="0.01" required value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          </label>
          {formError && (
            <p role="alert" className={listStyles.formError}>
              {formError}
            </p>
          )}
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </form>
      )}

      {actionError && (
        <p role="alert" className={listStyles.formError}>
          {actionError}
        </p>
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
              <th>PO Number</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((po) => (
              <tr key={po.id}>
                <td>{po.poNumber}</td>
                <td>{po.quantity}</td>
                <td>{po.unitPrice}</td>
                <td>{po.totalAmount}</td>
                <td><Badge value={po.status} /></td>
                <td>
                  {po.status === 'PENDING_APPROVAL' && (
                    <>
                      <button type="button" onClick={() => handleDecision(po.id, 'approve')}>
                        Approve
                      </button>{' '}
                      <button type="button" onClick={() => handleDecision(po.id, 'reject')}>
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function ProcurementPage() {
  return (
    <section>
      <PageHeader title="Procurement" description="Purchase orders over the approval threshold wait for a manager decision; goods receipts record what actually arrived." />
      <Tabs
        tabs={[
          { label: 'Purchase Orders', content: <PurchaseOrdersPanel /> },
          {
            label: 'Goods Receipts',
            content: (
              <ResourceListPage
                title="Goods Receipts"
                description="Requires the linked Purchase Order to be APPROVED."
                listPath="/goods-receipts"
                createPath="/goods-receipts"
                columns={[
                  { key: 'grnNumber', label: 'GRN Number' },
                  { key: 'purchaseOrderId', label: 'Purchase Order' },
                  { key: 'receivedQuantity', label: 'Received Qty' },
                ]}
                createFields={[
                  { name: 'purchaseOrderId', label: 'Purchase Order', type: 'reference', endpoint: '/purchase-orders', labelKey: 'poNumber', required: true },
                  { name: 'weighmentId', label: 'Weighment (optional)', type: 'reference', endpoint: '/weighments', labelKey: 'id' },
                  { name: 'receivedQuantity', label: 'Received Quantity', type: 'number', step: 0.01, required: true },
                ]}
              />
            ),
          },
        ]}
      />
    </section>
  );
}
