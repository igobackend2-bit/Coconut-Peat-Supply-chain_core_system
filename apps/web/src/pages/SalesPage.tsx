import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { apiGet, apiPost, ApiError } from '../lib/api';
import { Badge } from '../components/Badge';
import listStyles from '../components/ResourceListPage.module.css';

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  totalAmount: string;
}

interface SalesOrderItem {
  id: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

interface RefOption {
  value: string;
  label: string;
}

/**
 * Like Production Batches and Packing Orders, Sales Orders have real
 * workflow logic (DRAFT build-up, a credit-limit check only enforced at
 * confirm(), not create()) — custom page, not ResourceListPage. See
 * ProductionPage.tsx for the same reasoning.
 */
export function SalesPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<RefOption[]>([]);
  const [products, setProducts] = useState<RefOption[]>([]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<SalesOrderItem[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const [itemProductId, setItemProductId] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemPrice, setItemPrice] = useState('');

  async function loadOrders() {
    // Initial state is already loading=true; reloads after an action keep showing the current rows.
    try {
      setOrders(await apiGet<SalesOrder[]>('/sales-orders'));
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
    apiGet<{ id: string; code: string }[]>('/customers')
      .then((data) => setCustomers(data.map((c) => ({ value: c.id, label: c.code }))))
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
      await apiPost('/sales-orders', { customerId: newCustomerId });
      setNewCustomerId('');
      setShowCreateForm(false);
      await loadOrders();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  }

  async function loadItems(orderId: string) {
    try {
      setItems(await apiGet<SalesOrderItem[]>(`/sales-orders/${orderId}/items`));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to load items');
    }
  }

  function selectOrder(id: string) {
    const next = id === selectedId ? null : id;
    setSelectedId(next);
    setActionError(null);
    if (next) {
      loadItems(next);
    }
  }

  async function runAction(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      await loadOrders();
      if (selectedId) {
        await loadItems(selectedId);
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed');
    }
  }

  const selected = orders.find((o) => o.id === selectedId) ?? null;
  const skuFor = (id: string) => products.find((p) => p.value === id)?.label ?? id.slice(0, 8);
  const customerCodeFor = (id: string) => customers.find((c) => c.value === id)?.label ?? id.slice(0, 8);

  return (
    <section>
      <div className={listStyles.header}>
        <div>
          <h1>Sales</h1>
          <p className={listStyles.description}>
            Order lifecycle: DRAFT (add items freely) → CONFIRMED (checked against the customer's credit limit at this point,
            not before) or CANCELLED.
          </p>
        </div>
        <button type="button" onClick={() => setShowCreateForm((v) => !v)} className={listStyles.newButton}>
          {showCreateForm ? 'Cancel' : '+ New Sales Order'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateOrder} className={listStyles.form}>
          <label className={listStyles.formField}>
            Customer
            <select required value={newCustomerId} onChange={(e) => setNewCustomerId(e.target.value)}>
              <option value="">— select —</option>
              {customers.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
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
              <th>Order Number</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.orderNumber}</td>
                <td>{customerCodeFor(o.customerId)}</td>
                <td><Badge value={o.status} /></td>
                <td>{o.totalAmount}</td>
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
            {selected.orderNumber} — <Badge value={selected.status} />
          </h2>
          {actionError && (
            <p role="alert" className={listStyles.formError}>
              {actionError}
            </p>
          )}

          {selected.status === 'DRAFT' && (
            <>
              <h3>Add Line Item</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <select value={itemProductId} onChange={(e) => setItemProductId(e.target.value)}>
                  <option value="">— select product —</option>
                  {products.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <input type="number" step="0.01" placeholder="Quantity" value={itemQty} onChange={(e) => setItemQty(e.target.value)} />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Unit Price"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() =>
                    runAction(() =>
                      apiPost(`/sales-orders/${selected.id}/items`, {
                        productId: itemProductId,
                        quantity: Number(itemQty),
                        unitPrice: Number(itemPrice),
                      }),
                    )
                  }
                >
                  Add Item
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" disabled={items.length === 0} onClick={() => runAction(() => apiPost(`/sales-orders/${selected.id}/confirm`))}>
                  Confirm Order
                </button>
                <button type="button" onClick={() => runAction(() => apiPost(`/sales-orders/${selected.id}/cancel`))}>
                  Cancel Order
                </button>
              </div>
            </>
          )}

          {selected.status === 'CONFIRMED' && (
            <button type="button" onClick={() => runAction(() => apiPost(`/sales-orders/${selected.id}/cancel`))}>
              Cancel Order
            </button>
          )}

          <h3>Line Items</h3>
          {items.length === 0 && <p className={listStyles.description}>No items recorded yet.</p>}
          {items.length > 0 && (
            <table className={listStyles.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>{skuFor(i.productId)}</td>
                    <td>{i.quantity}</td>
                    <td>{i.unitPrice}</td>
                    <td>{i.lineTotal}</td>
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
