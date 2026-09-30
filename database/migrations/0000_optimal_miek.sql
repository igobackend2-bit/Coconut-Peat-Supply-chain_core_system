CREATE TABLE IF NOT EXISTS "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"actor_id" uuid,
	"actor_type" text NOT NULL,
	"actor_name" text,
	"action_type" text NOT NULL,
	"module" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"operation" text,
	"status" text NOT NULL,
	"request_id" uuid,
	"correlation_id" uuid,
	"conversation_id" uuid,
	"session_id" uuid,
	"source" text,
	"reason" text,
	"before_state" jsonb,
	"after_state" jsonb,
	"diff" jsonb,
	"approval_id" uuid,
	"tool_name" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_events_actor_idx" ON "audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_events_created_at_idx" ON "audit_events" USING btree ("created_at");