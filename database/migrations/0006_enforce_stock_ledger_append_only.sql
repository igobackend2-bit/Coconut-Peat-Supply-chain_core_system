-- stock_ledger is append-only — same reasoning as audit_events
-- (database/migrations/0001_enforce_audit_events_append_only.sql):
-- a stock ledger that can be silently edited after the fact isn't a
-- reliable source of truth for balances. Corrections are new offsetting
-- rows, not updates.

CREATE OR REPLACE FUNCTION prevent_stock_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'stock_ledger is append-only: % is not permitted (row id: %)', TG_OP, OLD.id;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER stock_ledger_no_update
  BEFORE UPDATE ON stock_ledger
  FOR EACH ROW EXECUTE FUNCTION prevent_stock_ledger_mutation();
--> statement-breakpoint
CREATE TRIGGER stock_ledger_no_delete
  BEFORE DELETE ON stock_ledger
  FOR EACH ROW EXECUTE FUNCTION prevent_stock_ledger_mutation();
