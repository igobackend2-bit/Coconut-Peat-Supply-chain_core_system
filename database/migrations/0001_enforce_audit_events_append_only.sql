-- audit_events is append-only per docs/actions.md §7:
--   "Audit events are append-only. Normal users cannot edit audit
--    events. AI agents cannot delete audit events. Corrections create
--    a new event."
-- This is enforced at the database level, not just in application code,
-- so it holds even if a future service connects directly to Postgres.

CREATE OR REPLACE FUNCTION prevent_audit_events_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only: % is not permitted (row id: %)', TG_OP, OLD.id;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER audit_events_no_update
  BEFORE UPDATE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_events_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_events_no_delete
  BEFORE DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_events_mutation();
