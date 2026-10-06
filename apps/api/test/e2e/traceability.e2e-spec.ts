import { Ctx, adminToken, authed, createApp, uniq } from './helpers';

/** Supplier → … → batch → packing lot → dispatch → customer, in both directions. */
describe('traceability', () => {
  let ctx: Ctx;
  let a: ReturnType<typeof authed>;

  beforeAll(async () => {
    ctx = await createApp();
    a = authed(ctx, await adminToken(ctx));
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  async function chain() {
    const supplierCode = uniq('SUP').toUpperCase();
    const supplier = (await a.post('/suppliers', { code: supplierCode, name: 'Kerala Husk Traders' })).body.id;
    const raw = (await a.post('/products', { sku: uniq('HUSK'), name: 'Husk', category: 'RAW_MATERIAL' })).body.id;
    const fg = (await a.post('/products', { sku: uniq('CPB'), name: 'Pith block', category: 'FINISHED_GOOD' })).body.id;
    const po = (await a.post('/purchase-orders', { supplierId: supplier, productId: raw, quantity: 500, unitPrice: 10 })).body.id;
    const gr = (await a.post('/goods-receipts', { purchaseOrderId: po, receivedQuantity: 500 })).body.id;
    const lot = (await a.post('/raw-material-lots', { goodsReceiptId: gr, quantityKg: 500 })).body.id;
    const batch = (await a.post('/production-batches', { productId: fg, plannedQuantityKg: 400 })).body.id;
    await a.post(`/production-batches/${batch}/inputs`, { rawMaterialLotId: lot, quantityConsumedKg: 500 });
    await a.post(`/production-batches/${batch}/outputs`, { productId: fg, quantityKg: 400 });
    await a.post(`/production-batches/${batch}/complete`);
    await a.post(`/production-batches/${batch}/release`, {});
    const pkgType = (await a.post('/packaging-types', { code: uniq('BAG'), name: '5kg bag' })).body.id;
    const order = (await a.post('/packing-orders', { productionBatchId: batch, packagingTypeId: pkgType })).body.id;
    const packLot = (await a.post(`/packing-orders/${order}/lots`, { productId: fg, quantityUnits: 80 })).body;
    return { supplierCode, fg, batch, order, packLot };
  }

  async function dispatchFor(fg: string) {
    const customerCode = uniq('CUST').toUpperCase();
    const customer = (await a.post('/customers', { code: customerCode, name: 'Hamburg Garden Supplies' })).body.id;
    const so = (await a.post('/sales-orders', { customerId: customer })).body.id;
    await a.post(`/sales-orders/${so}/items`, { productId: fg, quantity: 80, unitPrice: 50 });
    await a.post(`/sales-orders/${so}/confirm`);
    const vehicle = (await a.post('/vehicles', { registrationNumber: uniq('KL07') })).body.id;
    const dispatch = (await a.post('/dispatches', { salesOrderId: so, vehicleId: vehicle })).body.id;
    return { customerCode, so, dispatch };
  }

  it('traces a batch forward to the customer it shipped to, and a customer back to the supplier', async () => {
    const c = await chain();
    const d = await dispatchFor(c.fg);

    // A lot from a packing order that is still open cannot ship yet.
    expect((await a.post(`/dispatches/${d.dispatch}/lots`, { packingLotId: c.packLot.id })).status).toBe(409);
    expect((await a.post(`/packing-orders/${c.order}/complete`)).status).toBe(201);

    // Before it ships, the lot is "packed, not shipped".
    const before = await a.get(`/reports/traceability/batch/${c.batch}`);
    expect(before.body.forward[0].lotNumber).toBe(c.packLot.lotNumber);
    expect(before.body.forward[0].customerCode).toBeNull();

    expect((await a.get(`/dispatches/${d.dispatch}/available-lots`)).body.map((l: { id: string }) => l.id)).toContain(c.packLot.id);
    expect((await a.post(`/dispatches/${d.dispatch}/lots`, { packingLotId: c.packLot.id })).status).toBe(201);
    expect((await a.get(`/dispatches/${d.dispatch}/available-lots`)).body.map((l: { id: string }) => l.id)).not.toContain(c.packLot.id);

    const after = await a.get(`/reports/traceability/batch/${c.batch}`);
    expect(after.body.forward[0].customerCode).toBe(d.customerCode);
    expect(after.body.forward[0].salesOrderNumber).toBeTruthy();
    expect(after.body.backward[0].supplierCode).toBe(c.supplierCode);

    // The recall question: this customer's order → which suppliers' material is in it?
    const recall = await a.get(`/reports/traceability/sales-order/${d.so}`);
    expect(recall.status).toBe(200);
    expect(recall.body.order.customerCode).toBe(d.customerCode);
    expect(recall.body.lots.map((l: { lotNumber: string }) => l.lotNumber)).toEqual([c.packLot.lotNumber]);
    expect(recall.body.suppliers.join(' ')).toContain(c.supplierCode);
  });

  it('keeps a lot off two live dispatches, off orders that do not contain its product, and frees it on cancel', async () => {
    const c = await chain();
    await a.post(`/packing-orders/${c.order}/complete`);
    const one = await dispatchFor(c.fg);
    const two = await dispatchFor(c.fg);
    const other = await dispatchFor((await a.post('/products', { sku: uniq('OTHER'), name: 'Other', category: 'FINISHED_GOOD' })).body.id);

    expect((await a.post(`/dispatches/${other.dispatch}/lots`, { packingLotId: c.packLot.id })).status).toBe(409); // product not on that order
    expect((await a.post(`/dispatches/${one.dispatch}/lots`, { packingLotId: c.packLot.id })).status).toBe(201);
    expect((await a.post(`/dispatches/${two.dispatch}/lots`, { packingLotId: c.packLot.id })).status).toBe(409); // already on a live dispatch

    // Regression-by-design: cancelling frees the lot (no hard UNIQUE on packing_lot_id).
    expect((await a.post(`/dispatches/${one.dispatch}/cancel`)).status).toBe(201);
    expect((await a.post(`/dispatches/${two.dispatch}/lots`, { packingLotId: c.packLot.id })).status).toBe(201);
    const trace = await a.get(`/reports/traceability/batch/${c.batch}`);
    expect(trace.body.forward[0].salesOrderNumber).not.toBeNull();
  });

  it('locks the lot list once the dispatch has left, and can remove a lot while pending', async () => {
    const c = await chain();
    await a.post(`/packing-orders/${c.order}/complete`);
    const d = await dispatchFor(c.fg);
    await a.post(`/dispatches/${d.dispatch}/lots`, { packingLotId: c.packLot.id });
    expect((await a.del(`/dispatches/${d.dispatch}/lots/${c.packLot.id}`)).status).toBe(200);
    expect((await a.del(`/dispatches/${d.dispatch}/lots/${c.packLot.id}`)).status).toBe(404);
    await a.post(`/dispatches/${d.dispatch}/lots`, { packingLotId: c.packLot.id });
    await a.post(`/dispatches/${d.dispatch}/dispatch`);
    expect((await a.del(`/dispatches/${d.dispatch}/lots/${c.packLot.id}`)).status).toBe(409);
  });

  it('answers honestly for an order with nothing traceable', async () => {
    const d = await dispatchFor((await a.post('/products', { sku: uniq('NOLOT'), name: 'X', category: 'FINISHED_GOOD' })).body.id);
    const res = await a.get(`/reports/traceability/sales-order/${d.so}`);
    expect(res.status).toBe(200);
    expect(res.body.lots).toEqual([]);
    expect(res.body.limits).toMatch(/nothing can be traced/);
  });
});
