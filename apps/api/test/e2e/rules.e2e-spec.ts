import { Ctx, adminToken, authed, createApp, createRole, createUser, expectDbRejects, uniq } from './helpers';

/** Business rules that must hold server-side regardless of what the UI does. */
describe('business rules', () => {
  let ctx: Ctx;
  let admin: string;
  let a: ReturnType<typeof authed>;

  beforeAll(async () => {
    ctx = await createApp();
    admin = await adminToken(ctx);
    a = authed(ctx, admin);
  });
  afterAll(async () => {
    await ctx.app.close();
  });

  const product = async (category = 'FINISHED_GOOD') => (await a.post('/products', { sku: uniq('SKU'), name: 'Pith block', category })).body.id as string;
  const customer = async (creditLimit?: number) => (await a.post('/customers', { code: uniq('C'), name: 'Buyer', ...(creditLimit ? { creditLimit } : {}) })).body.id as string;
  async function confirmedOrder(customerId: string, productId: string, qty: number, price: number) {
    const so = (await a.post('/sales-orders', { customerId })).body.id as string;
    await a.post(`/sales-orders/${so}/items`, { productId, quantity: qty, unitPrice: price });
    const res = await a.post(`/sales-orders/${so}/confirm`);
    return { so, res };
  }

  describe('sales, credit and dispatch', () => {
    it('refuses to confirm an order that would push a customer past their credit limit', async () => {
      const c = await customer(1000);
      const p = await product();
      expect((await confirmedOrder(c, p, 6, 100)).res.status).toBe(201);
      const second = await confirmedOrder(c, p, 6, 100);
      expect(second.res.status).toBe(409);
      expect(second.res.body.message).toMatch(/credit limit/);
    });

    it('only dispatches confirmed orders, one active dispatch at a time, and allows redispatch after a cancel', async () => {
      const c = await customer();
      const p = await product();
      const draft = (await a.post('/sales-orders', { customerId: c })).body.id;
      const vehicle = (await a.post('/vehicles', { registrationNumber: uniq('KL07') })).body.id;
      expect((await a.post('/dispatches', { salesOrderId: draft, vehicleId: vehicle })).status).toBe(409);

      const { so } = await confirmedOrder(c, p, 1, 10);
      const first = await a.post('/dispatches', { salesOrderId: so, vehicleId: vehicle });
      expect(first.status).toBe(201);
      expect((await a.post('/dispatches', { salesOrderId: so, vehicleId: vehicle })).status).toBe(409);
      expect((await a.post(`/dispatches/${first.body.id}/cancel`)).status).toBe(201);
      // regression: a hard UNIQUE(sales_order_id) used to make this impossible
      expect((await a.post('/dispatches', { salesOrderId: so, vehicleId: vehicle })).status).toBe(201);
    });
  });

  describe('finance', () => {
    it('refuses to let the submitter approve their own expense, and lets someone else', async () => {
      const exp = await a.post('/expenses', { category: 'UTILITIES', description: 'Power', amount: 5000, expenseDate: '2026-10-01' });
      expect(exp.status).toBe(201);
      expect((await a.post(`/expenses/${exp.body.id}/approve`)).status).toBe(403);

      const approver = await createUser(ctx, admin, [await createRole(ctx, ['finance.expense.approve', 'finance.read'])]);
      expect((await authed(ctx, approver.token).post(`/expenses/${exp.body.id}/approve`)).status).toBe(201);
      expect((await authed(ctx, approver.token).post(`/expenses/${exp.body.id}/approve`)).status).toBe(409);
    });

    it('never lets payments exceed what is outstanding', async () => {
      const { so } = await confirmedOrder(await customer(), await product(), 10, 100); // total 1000
      const pay = (amount: number) => a.post('/payments', { direction: 'INCOMING', salesOrderId: so, amount });
      expect((await pay(600)).status).toBe(201);
      const over = await pay(500);
      expect(over.status).toBe(409);
      expect(over.body.message).toMatch(/outstanding amount of 400/);
      expect((await pay(400)).status).toBe(201);
      expect((await pay(1)).status).toBe(409);
      expect((await a.post('/payments', { direction: 'INCOMING', amount: 10 })).status).toBe(400);
    });
  });

  describe('export', () => {
    it('gates the chain: no empty issue, no double conversion, milestones only forward', async () => {
      const buyer = (await a.post('/export-customers', { code: uniq('X'), name: 'Hamburg Garden', country: 'Germany' })).body.id;
      const pi = (await a.post('/proforma-invoices', { exportCustomerId: buyer, currency: 'eur' })).body;
      expect(pi.currency).toBe('EUR');
      expect((await a.post(`/proforma-invoices/${pi.id}/issue`)).status).toBe(400);
      expect((await a.post(`/proforma-invoices/${pi.id}/convert`)).status).toBe(409);

      await a.post(`/proforma-invoices/${pi.id}/items`, { productId: await product(), quantity: 100, unitPrice: 12.5 });
      expect((await a.post(`/proforma-invoices/${pi.id}/issue`)).status).toBe(201);
      expect((await a.post(`/proforma-invoices/${pi.id}/items`, { productId: await product(), quantity: 1, unitPrice: 1 })).status).toBe(409);
      const ci = await a.post(`/proforma-invoices/${pi.id}/convert`);
      expect(ci.status).toBe(201);
      expect(ci.body.totalAmount).toBe('1250.00');
      expect((await a.post(`/proforma-invoices/${pi.id}/convert`)).status).toBe(409);

      const ct = (await a.post('/containers', { commercialInvoiceId: ci.body.id, containerNumber: uniq('MSKU') })).body.id;
      expect((await a.post(`/containers/${ct}/milestones`, { milestone: 'DEPARTED' })).status).toBe(201);
      expect((await a.post(`/containers/${ct}/milestones`, { milestone: 'LOADED' })).status).toBe(409);
      expect((await a.post(`/containers/${ct}/milestones`, { milestone: 'DELIVERED' })).status).toBe(201);
      expect((await a.post(`/containers/${ct}/milestones`, { milestone: 'DELIVERED' })).status).toBe(409);
    });
  });

  describe('maintenance and workforce', () => {
    it('suspends a machine on breakdown and restores it when the last breakdown is resolved', async () => {
      const m = (await a.post('/machines', { code: uniq('M'), name: 'Pith press' })).body.id;
      const status = async () => (await a.get('/machines')).body.find((x: { id: string }) => x.id === m).status;
      const b1 = (await a.post('/breakdowns', { machineId: m, description: 'Leak', severity: 'HIGH' })).body.id;
      const b2 = (await a.post('/breakdowns', { machineId: m, description: 'Belt' })).body.id;
      expect(await status()).toBe('SUSPENDED');
      await a.post(`/breakdowns/${b1}/resolve`, {});
      expect(await status()).toBe('SUSPENDED'); // another is still open
      await a.post(`/breakdowns/${b2}/resolve`, {});
      expect(await status()).toBe('ACTIVE');
    });

    it('advances a plan by its frequency when its preventive work order completes, one open order at a time', async () => {
      const m = (await a.post('/machines', { code: uniq('M'), name: 'Dryer' })).body.id;
      const plan = (await a.post('/maintenance-plans', { machineId: m, title: 'Lubricate', frequencyDays: 30, nextDueDate: '2026-01-01' })).body.id;
      const wo = await a.post(`/maintenance-plans/${plan}/generate-work-order`);
      expect(wo.status).toBe(201);
      expect((await a.post(`/maintenance-plans/${plan}/generate-work-order`)).status).toBe(409);
      await a.post(`/work-orders/${wo.body.id}/complete`, {});
      const next = (await a.get('/maintenance-plans')).body.find((p: { id: string }) => p.id === plan).nextDueDate;
      const expected = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      expect(next).toBe(expected);
    });

    it('will not take spare-part stock below zero', async () => {
      const sp = (await a.post('/spare-parts', { code: uniq('SP'), name: 'Seal', quantityOnHand: 3 })).body.id;
      expect((await a.post(`/spare-parts/${sp}/adjust`, { delta: -5 })).status).toBe(409);
      expect((await a.post(`/spare-parts/${sp}/adjust`, { delta: -3 })).status).toBe(201);
    });

    it('allocates labour only to people who attended, within the daily cap', async () => {
      const emp = (await a.post('/employees', { employeeCode: uniq('E'), fullName: 'Anitha' })).body.id;
      const day = '2026-10-02';
      const alloc = (hours: number) => a.post('/labour-allocations', { employeeId: emp, workDate: day, hours, task: 'Sorting' });
      expect((await alloc(2)).status).toBe(409); // no attendance yet
      expect((await a.post('/attendance', { employeeId: emp, workDate: day, status: 'PRESENT' })).status).toBe(201);
      expect((await a.post('/attendance', { employeeId: emp, workDate: day, status: 'ABSENT' })).status).toBe(409);
      expect((await alloc(8)).status).toBe(201);
      expect((await alloc(5)).status).toBe(409); // 13h > 12h
      expect((await alloc(4)).status).toBe(201);
    });
  });

  describe('memory and AI', () => {
    it('versions memory instead of overwriting it', async () => {
      const v1 = (await a.post('/memory', { memoryType: 'DECISION', title: 'Release policy', content: 'QC approves.' })).body;
      const v2 = await a.post(`/memory/${v1.id}/revise`, { content: 'QC and Production approve.' });
      expect(v2.status).toBe(201);
      expect(v2.body.version).toBe(2);
      expect((await a.post(`/memory/${v1.id}/revise`, { content: 'again' })).status).toBe(409); // v1 is SUPERSEDED
      expect((await a.get(`/memory/${v2.body.id}/history`)).body.map((m: { version: number }) => m.version)).toEqual([1, 2]);
    });

    it('lets only implemented agents run, and does not re-propose a pending finding', async () => {
      const agents = (await a.get('/ai-agents')).body as { id: string; code: string }[];
      const id = (code: string) => agents.find((x) => x.code === code)!.id;
      expect((await a.post(`/ai-agents/${id('A01')}/run`)).status).toBe(409); // specified, no implementation

      const first = await a.post(`/ai-agents/${id('A10')}/run`);
      expect(first.status).toBe(201);
      expect(first.body.status).toBe('COMPLETED');
      const again = await a.post(`/ai-agents/${id('A10')}/run`);
      expect(again.body.findingCount).toBe(0);
      const restricted = await createUser(ctx, admin, [await createRole(ctx, ['master_data.product.write'])]);
      expect((await authed(ctx, restricted.token).post(`/ai-agents/${id('A10')}/run`)).status).toBe(403);
    });
  });

  describe('database-level guarantees', () => {
    it('keeps the stock ledger append-only', async () => {
      const { sql } = require('drizzle-orm'); // eslint-disable-line @typescript-eslint/no-require-imports
      const p = await product('RAW_MATERIAL');
      await ctx.db.execute(sql`INSERT INTO stock_ledger (product_id, movement_type, quantity_kg) VALUES (${p}::uuid, 'ADJUSTMENT', 10)`);
      await expectDbRejects(ctx.db.execute(sql`UPDATE stock_ledger SET quantity_kg = 999`), /append-only/);
      await expectDbRejects(ctx.db.execute(sql`DELETE FROM stock_ledger`), /append-only/);
    });
  });
});
