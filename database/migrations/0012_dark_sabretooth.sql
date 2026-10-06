CREATE TYPE "public"."ai_agent_status" AS ENUM('ENABLED', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."ai_finding_severity" AS ENUM('INFO', 'WARNING', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."ai_finding_status" AS ENUM('PROPOSED', 'ACKNOWLEDGED', 'DISMISSED');--> statement-breakpoint
CREATE TYPE "public"."ai_run_status" AS ENUM('COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY');--> statement-breakpoint
CREATE TYPE "public"."breakdown_status" AS ENUM('OPEN', 'IN_REPAIR', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "public"."commercial_invoice_status" AS ENUM('ISSUED', 'PAID', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."container_status" AS ENUM('BOOKED', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('RAW_MATERIAL', 'LABOUR', 'UTILITIES', 'MAINTENANCE', 'LOGISTICS', 'PACKAGING', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."expense_status" AS ENUM('SUBMITTED', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."memory_sensitivity" AS ENUM('PUBLIC', 'INTERNAL', 'CONFIDENTIAL');--> statement-breakpoint
CREATE TYPE "public"."memory_status" AS ENUM('ACTIVE', 'ARCHIVED', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "public"."memory_type" AS ENUM('FACT', 'DECISION', 'INSTRUCTION', 'PREFERENCE', 'CONFIGURATION', 'SOP', 'PRODUCT_KNOWLEDGE', 'SUPPLIER_KNOWLEDGE', 'CUSTOMER_KNOWLEDGE', 'INCIDENT', 'LESSON', 'ASSUMPTION', 'OBSERVATION', 'OPEN_ISSUE', 'TASK_CONTEXT');--> statement-breakpoint
CREATE TYPE "public"."payment_direction" AS ENUM('INCOMING', 'OUTGOING');--> statement-breakpoint
CREATE TYPE "public"."proforma_status" AS ENUM('DRAFT', 'ISSUED', 'CONVERTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."work_order_status" AS ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."work_order_type" AS ENUM('PREVENTIVE', 'CORRECTIVE');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"purpose" text NOT NULL,
	"permission_level" text DEFAULT 'READ' NOT NULL,
	"analyzer_key" text,
	"status" "ai_agent_status" DEFAULT 'ENABLED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_agents_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"severity" "ai_finding_severity" NOT NULL,
	"title" text NOT NULL,
	"detail" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"status" "ai_finding_status" DEFAULT 'PROPOSED' NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"triggered_by" uuid,
	"status" "ai_run_status" NOT NULL,
	"summary" text,
	"finding_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "commercial_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"invoice_number" text NOT NULL,
	"proforma_invoice_id" uuid NOT NULL,
	"export_customer_id" uuid NOT NULL,
	"currency" text NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"status" "commercial_invoice_status" DEFAULT 'ISSUED' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "commercial_invoices_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "containers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"container_number" text NOT NULL,
	"commercial_invoice_id" uuid NOT NULL,
	"seal_number" text,
	"destination_port" text,
	"status" "container_status" DEFAULT 'BOOKED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "containers_container_number_unique" UNIQUE("container_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "export_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "export_customers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proforma_invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proforma_invoice_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"line_total" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proforma_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"invoice_number" text NOT NULL,
	"export_customer_id" uuid NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" "proforma_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proforma_invoices_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shipment_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"container_id" uuid NOT NULL,
	"milestone" text NOT NULL,
	"notes" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cost_centres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cost_centres_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"expense_number" text NOT NULL,
	"cost_centre_id" uuid,
	"category" "expense_category" NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"expense_date" date NOT NULL,
	"status" "expense_status" DEFAULT 'SUBMITTED' NOT NULL,
	"submitted_by" uuid NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"decision_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_number_unique" UNIQUE("expense_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"payment_number" text NOT NULL,
	"direction" "payment_direction" NOT NULL,
	"sales_order_id" uuid,
	"purchase_order_id" uuid,
	"amount" numeric(14, 2) NOT NULL,
	"method" text DEFAULT 'BANK_TRANSFER' NOT NULL,
	"reference" text,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by" uuid,
	CONSTRAINT "payments_number_unique" UNIQUE("payment_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "breakdowns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"machine_id" uuid NOT NULL,
	"description" text NOT NULL,
	"severity" "severity" DEFAULT 'MEDIUM' NOT NULL,
	"status" "breakdown_status" DEFAULT 'OPEN' NOT NULL,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolution_notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"machine_id" uuid NOT NULL,
	"title" text NOT NULL,
	"frequency_days" integer NOT NULL,
	"next_due_date" date NOT NULL,
	"status" "entity_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spare_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"quantity_on_hand" integer DEFAULT 0 NOT NULL,
	"reorder_level" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spare_parts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"work_order_number" text NOT NULL,
	"machine_id" uuid NOT NULL,
	"type" "work_order_type" NOT NULL,
	"title" text NOT NULL,
	"breakdown_id" uuid,
	"maintenance_plan_id" uuid,
	"assigned_to_employee_id" uuid,
	"status" "work_order_status" DEFAULT 'OPEN' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "work_orders_number_unique" UNIQUE("work_order_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"shift_id" uuid,
	"work_date" date NOT NULL,
	"status" "attendance_status" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_employee_day_unique" UNIQUE("employee_id","work_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "labour_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"hours" numeric(5, 2) NOT NULL,
	"task" text NOT NULL,
	"production_batch_id" uuid,
	"machine_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shifts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "memory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"memory_type" "memory_type" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"status" "memory_status" DEFAULT 'ACTIVE' NOT NULL,
	"sensitivity" "memory_sensitivity" DEFAULT 'INTERNAL' NOT NULL,
	"source_type" text DEFAULT 'MANUAL' NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '1.00' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"linked_entity_type" text,
	"linked_entity_id" uuid,
	"valid_until" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"supersedes_memory_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_findings" ADD CONSTRAINT "ai_findings_run_id_ai_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_findings" ADD CONSTRAINT "ai_findings_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_findings" ADD CONSTRAINT "ai_findings_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_agent_id_ai_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."ai_agents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commercial_invoices" ADD CONSTRAINT "commercial_invoices_proforma_invoice_id_proforma_invoices_id_fk" FOREIGN KEY ("proforma_invoice_id") REFERENCES "public"."proforma_invoices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "commercial_invoices" ADD CONSTRAINT "commercial_invoices_export_customer_id_export_customers_id_fk" FOREIGN KEY ("export_customer_id") REFERENCES "public"."export_customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "containers" ADD CONSTRAINT "containers_commercial_invoice_id_commercial_invoices_id_fk" FOREIGN KEY ("commercial_invoice_id") REFERENCES "public"."commercial_invoices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proforma_invoice_items" ADD CONSTRAINT "proforma_invoice_items_proforma_invoice_id_proforma_invoices_id_fk" FOREIGN KEY ("proforma_invoice_id") REFERENCES "public"."proforma_invoices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proforma_invoice_items" ADD CONSTRAINT "proforma_invoice_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proforma_invoices" ADD CONSTRAINT "proforma_invoices_export_customer_id_export_customers_id_fk" FOREIGN KEY ("export_customer_id") REFERENCES "public"."export_customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shipment_milestones" ADD CONSTRAINT "shipment_milestones_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."containers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expenses" ADD CONSTRAINT "expenses_cost_centre_id_cost_centres_id_fk" FOREIGN KEY ("cost_centre_id") REFERENCES "public"."cost_centres"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expenses" ADD CONSTRAINT "expenses_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expenses" ADD CONSTRAINT "expenses_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "breakdowns" ADD CONSTRAINT "breakdowns_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_breakdown_id_breakdowns_id_fk" FOREIGN KEY ("breakdown_id") REFERENCES "public"."breakdowns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_maintenance_plan_id_maintenance_plans_id_fk" FOREIGN KEY ("maintenance_plan_id") REFERENCES "public"."maintenance_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigned_to_employee_id_employees_id_fk" FOREIGN KEY ("assigned_to_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance" ADD CONSTRAINT "attendance_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "labour_allocations" ADD CONSTRAINT "labour_allocations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "labour_allocations" ADD CONSTRAINT "labour_allocations_production_batch_id_production_batches_id_fk" FOREIGN KEY ("production_batch_id") REFERENCES "public"."production_batches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "labour_allocations" ADD CONSTRAINT "labour_allocations_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "memory_items" ADD CONSTRAINT "memory_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_findings_status_idx" ON "ai_findings" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_findings_run_idx" ON "ai_findings" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_runs_agent_idx" ON "ai_runs" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "commercial_invoices_proforma_idx" ON "commercial_invoices" USING btree ("proforma_invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "containers_invoice_idx" ON "containers" USING btree ("commercial_invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proforma_invoice_items_invoice_idx" ON "proforma_invoice_items" USING btree ("proforma_invoice_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proforma_invoices_customer_idx" ON "proforma_invoices" USING btree ("export_customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shipment_milestones_container_idx" ON "shipment_milestones" USING btree ("container_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_status_idx" ON "expenses" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_sales_order_idx" ON "payments" USING btree ("sales_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_purchase_order_idx" ON "payments" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "breakdowns_machine_idx" ON "breakdowns" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "maintenance_plans_machine_idx" ON "maintenance_plans" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_orders_machine_idx" ON "work_orders" USING btree ("machine_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_date_idx" ON "attendance" USING btree ("work_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "labour_allocations_employee_day_idx" ON "labour_allocations" USING btree ("employee_id","work_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memory_items_status_idx" ON "memory_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memory_items_type_idx" ON "memory_items" USING btree ("memory_type");