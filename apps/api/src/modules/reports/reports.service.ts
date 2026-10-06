import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../db/drizzle.provider';

type Row = Record<string, unknown>;

@Injectable()
export class ReportsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  private async rows(query: ReturnType<typeof sql>): Promise<Row[]> {
    return (await this.db.execute(query)) as unknown as Row[];
  }

  /** One round trip: every KPI the dashboard needs, computed from live tables. */
  async overview() {
    const [{ data }] = await this.rows(sql`
      SELECT json_build_object(
        'sales', json_build_object(
          'confirmedOrders', (SELECT count(*) FROM sales_orders WHERE status = 'CONFIRMED'),
          'confirmedValue', (SELECT COALESCE(SUM(total_amount), 0) FROM sales_orders WHERE status = 'CONFIRMED'),
          'draftOrders', (SELECT count(*) FROM sales_orders WHERE status = 'DRAFT')
        ),
        'production', (SELECT COALESCE(json_object_agg(status, n), '{}'::json) FROM (SELECT status, count(*) n FROM production_batches GROUP BY status) s),
        'quality', json_build_object(
          'results', (SELECT count(*) FROM qc_results),
          'failed', (SELECT count(*) FROM qc_results WHERE passed = false)
        ),
        'inventory', json_build_object(
          'ledgerEntries', (SELECT count(*) FROM stock_ledger),
          'negativeProducts', (SELECT count(*) FROM (SELECT 1 FROM stock_ledger GROUP BY product_id HAVING SUM(quantity_kg) < 0) n),
          'totalKg', (SELECT COALESCE(SUM(quantity_kg), 0) FROM stock_ledger)
        ),
        'packing', (SELECT COALESCE(json_object_agg(status, n), '{}'::json) FROM (SELECT status, count(*) n FROM packing_orders GROUP BY status) s),
        'dispatch', (SELECT COALESCE(json_object_agg(status, n), '{}'::json) FROM (SELECT status, count(*) n FROM dispatches GROUP BY status) s),
        'procurement', json_build_object(
          'pendingApproval', (SELECT count(*) FROM purchase_orders WHERE status = 'PENDING_APPROVAL'),
          'openOrders', (SELECT count(*) FROM purchase_orders WHERE status IN ('APPROVED', 'PARTIALLY_RECEIVED'))
        ),
        'maintenance', json_build_object(
          'openBreakdowns', (SELECT count(*) FROM breakdowns WHERE status <> 'RESOLVED'),
          'overduePlans', (SELECT count(*) FROM maintenance_plans WHERE status = 'ACTIVE' AND next_due_date < CURRENT_DATE),
          'lowStockParts', (SELECT count(*) FROM spare_parts WHERE reorder_level > 0 AND quantity_on_hand <= reorder_level),
          'suspendedMachines', (SELECT count(*) FROM machines WHERE status = 'SUSPENDED')
        ),
        'workforce', (SELECT COALESCE(json_object_agg(status, n), '{}'::json) FROM (SELECT status, count(*) n FROM attendance WHERE work_date = CURRENT_DATE GROUP BY status) s),
        'finance', json_build_object(
          'receivablesOutstanding',
            (SELECT COALESCE(SUM(total_amount), 0) FROM sales_orders WHERE status = 'CONFIRMED')
            - (SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN sales_orders o ON o.id = p.sales_order_id WHERE p.direction = 'INCOMING' AND o.status = 'CONFIRMED'),
          'expensesPending', (SELECT count(*) FROM expenses WHERE status = 'SUBMITTED'),
          'expensesApprovedValue', (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE status = 'APPROVED')
        ),
        'export', (SELECT COALESCE(json_object_agg(status, n), '{}'::json) FROM (SELECT status, count(*) n FROM containers GROUP BY status) s),
        'ai', json_build_object(
          'proposed', (SELECT count(*) FROM ai_findings WHERE status = 'PROPOSED'),
          'critical', (SELECT count(*) FROM ai_findings WHERE status = 'PROPOSED' AND severity = 'CRITICAL')
        )
      ) AS data
    `);
    return data;
  }

  async productionYield() {
    const rows = await this.rows(sql`
      SELECT b.id, b.batch_number AS "batchNumber", b.status,
        COALESCE((SELECT SUM(quantity_consumed_kg) FROM batch_inputs WHERE production_batch_id = b.id), 0) AS "inputKg",
        COALESCE((SELECT SUM(quantity_kg) FROM batch_outputs WHERE production_batch_id = b.id), 0) AS "outputKg"
      FROM production_batches b ORDER BY b.started_at DESC LIMIT 100`);
    return rows.map((r) => {
      const input = Number(r.inputKg);
      const output = Number(r.outputKg);
      return { ...r, inputKg: input, outputKg: output, yieldPercent: input > 0 ? +((output / input) * 100).toFixed(1) : null };
    });
  }

  async salesByCustomer() {
    return this.rows(sql`
      SELECT c.id, c.code, c.name, c.credit_limit AS "creditLimit",
        count(o.id)::int AS orders, COALESCE(SUM(o.total_amount), 0) AS value
      FROM customers c LEFT JOIN sales_orders o ON o.customer_id = c.id AND o.status = 'CONFIRMED'
      GROUP BY c.id ORDER BY value DESC`);
  }

  /** Raw-material provenance of one production batch: supplier → vehicle/driver → weighment → PO → receipt → lot. */
  private backwardOf(batchId: string) {
    return this.rows(sql`
      SELECT bi.quantity_consumed_kg AS "quantityKg", l.lot_number AS "lotNumber",
        s.code AS "supplierCode", s.name AS "supplierName",
        po.po_number AS "poNumber", gr.grn_number AS "grnNumber",
        w.net_weight_kg AS "netWeightKg", w.weighed_at AS "weighedAt",
        v.registration_number AS "vehicle", d.full_name AS "driver"
      FROM batch_inputs bi
      JOIN raw_material_lots l ON l.id = bi.raw_material_lot_id
      LEFT JOIN suppliers s ON s.id = l.supplier_id
      LEFT JOIN goods_receipts gr ON gr.id = l.goods_receipt_id
      LEFT JOIN purchase_orders po ON po.id = gr.purchase_order_id
      LEFT JOIN weighments w ON w.id = gr.weighment_id
      LEFT JOIN gate_entries ge ON ge.id = w.gate_entry_id
      LEFT JOIN vehicles v ON v.id = ge.vehicle_id
      LEFT JOIN drivers d ON d.id = ge.driver_id
      WHERE bi.production_batch_id = ${batchId}`);
  }

  /**
   * One production batch, both directions. Backward: supplier → vehicle →
   * weighment → PO → goods receipt → lot → batch. Forward: batch → QC →
   * packing lots → the dispatch each lot shipped on → sales order → customer.
   * A lot only reaches a customer once it has been added to a (non-cancelled)
   * dispatch; until then `customer` is null, which means "packed, not shipped".
   */
  async traceBatch(batchId: string) {
    const [batch] = await this.rows(sql`SELECT id, batch_number AS "batchNumber", status, product_id AS "productId", started_at AS "startedAt", completed_at AS "completedAt" FROM production_batches WHERE id = ${batchId}`);
    if (!batch) throw new NotFoundException(`Production batch ${batchId} not found`);
    const backward = await this.backwardOf(batchId);
    const quality = await this.rows(sql`
      SELECT qp.code AS parameter, r.measured_value AS "measuredValue", r.passed
      FROM qc_samples s JOIN qc_results r ON r.qc_sample_id = s.id JOIN qc_parameters qp ON qp.id = r.qc_parameter_id
      WHERE s.production_batch_id = ${batchId}`);
    const forward = await this.rows(sql`
      SELECT o.id AS "packingOrderId", o.status AS "orderStatus", pt.code AS "packagingType",
        l.lot_number AS "lotNumber", l.quantity_units AS "quantityUnits", l.qc_status AS "qcStatus",
        so.order_number AS "salesOrderNumber", c.code AS "customerCode", c.name AS "customerName",
        d.status AS "dispatchStatus", d.dispatched_at AS "dispatchedAt", d.delivered_at AS "deliveredAt"
      FROM packing_orders o
      JOIN packaging_types pt ON pt.id = o.packaging_type_id
      LEFT JOIN packing_lots l ON l.packing_order_id = o.id
      -- Only live dispatches: a lot cancelled off one dispatch and re-shipped has two link rows,
      -- and joining the cancelled one separately would emit a second, empty row for the lot.
      LEFT JOIN (
        SELECT dl.packing_lot_id, d.id, d.status, d.dispatched_at, d.delivered_at, d.sales_order_id
        FROM dispatch_lots dl JOIN dispatches d ON d.id = dl.dispatch_id
        WHERE d.status <> 'CANCELLED'
      ) d ON d.packing_lot_id = l.id
      LEFT JOIN sales_orders so ON so.id = d.sales_order_id
      LEFT JOIN customers c ON c.id = so.customer_id
      WHERE o.production_batch_id = ${batchId}
      ORDER BY l.lot_number`);
    return {
      batch,
      backward,
      quality,
      forward,
      limits:
        'A packed lot reaches a customer only after it has been added to a dispatch. Dispatches created before lots were tracked have none, so goods shipped then cannot be traced.',
    };
  }

  /**
   * Recall view: start from a sales order and walk back to every supplier
   * whose material is in the goods that shipped on it (customer → dispatch →
   * lots → packing order → batch → raw-material lots → supplier).
   */
  async traceSalesOrder(salesOrderId: string) {
    const [order] = await this.rows(sql`
      SELECT so.id, so.order_number AS "orderNumber", so.status, so.total_amount AS "totalAmount",
        c.code AS "customerCode", c.name AS "customerName"
      FROM sales_orders so JOIN customers c ON c.id = so.customer_id WHERE so.id = ${salesOrderId}`);
    if (!order) throw new NotFoundException(`Sales order ${salesOrderId} not found`);
    const lots = await this.rows(sql`
      SELECT l.lot_number AS "lotNumber", l.quantity_units AS "quantityUnits", pt.code AS "packagingType",
        b.id AS "batchId", b.batch_number AS "batchNumber", d.status AS "dispatchStatus"
      FROM dispatches d
      JOIN dispatch_lots dl ON dl.dispatch_id = d.id
      JOIN packing_lots l ON l.id = dl.packing_lot_id
      JOIN packing_orders o ON o.id = l.packing_order_id
      JOIN packaging_types pt ON pt.id = o.packaging_type_id
      JOIN production_batches b ON b.id = o.production_batch_id
      WHERE d.sales_order_id = ${salesOrderId} AND d.status <> 'CANCELLED'
      ORDER BY l.lot_number`);
    const batchIds = [...new Set(lots.map((l) => String(l.batchId)))];
    const batches = [];
    for (const id of batchIds) {
      const lot = lots.find((l) => l.batchId === id)!;
      batches.push({ batchId: id, batchNumber: lot.batchNumber, backward: await this.backwardOf(id) });
    }
    const suppliers = [...new Set(batches.flatMap((b) => b.backward.map((r) => `${r.supplierCode ?? '?'} — ${r.supplierName ?? 'unknown'}`)))];
    return {
      order,
      lots,
      batches,
      suppliers,
      limits: lots.length === 0 ? 'No lots are recorded on this order’s dispatches, so nothing can be traced back from it.' : null,
    };
  }
}
