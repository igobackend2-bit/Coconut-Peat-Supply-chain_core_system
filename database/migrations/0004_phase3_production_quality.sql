CREATE TYPE "public"."production_batch_status" AS ENUM('IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'RELEASED', 'REJECTED', 'CLOSED');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"production_batch_id" uuid NOT NULL,
	"raw_material_lot_id" uuid NOT NULL,
	"quantity_consumed_kg" numeric(12, 2) NOT NULL,
	"consumed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "batch_inputs_raw_material_lot_unique" UNIQUE("raw_material_lot_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"production_batch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_grade_id" uuid,
	"quantity_kg" numeric(12, 2) NOT NULL,
	"produced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "production_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"batch_number" text NOT NULL,
	"product_id" uuid NOT NULL,
	"product_grade_id" uuid,
	"planned_quantity_kg" numeric(12, 2),
	"status" "production_batch_status" DEFAULT 'IN_PROGRESS' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_batches_batch_number_unique" UNIQUE("batch_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "qc_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"qc_sample_id" uuid NOT NULL,
	"qc_parameter_id" uuid NOT NULL,
	"measured_value" numeric(12, 4) NOT NULL,
	"passed" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "qc_samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"production_batch_id" uuid NOT NULL,
	"sampled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "batch_inputs" ADD CONSTRAINT "batch_inputs_production_batch_id_production_batches_id_fk" FOREIGN KEY ("production_batch_id") REFERENCES "public"."production_batches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "batch_inputs" ADD CONSTRAINT "batch_inputs_raw_material_lot_id_raw_material_lots_id_fk" FOREIGN KEY ("raw_material_lot_id") REFERENCES "public"."raw_material_lots"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "batch_outputs" ADD CONSTRAINT "batch_outputs_production_batch_id_production_batches_id_fk" FOREIGN KEY ("production_batch_id") REFERENCES "public"."production_batches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "batch_outputs" ADD CONSTRAINT "batch_outputs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "batch_outputs" ADD CONSTRAINT "batch_outputs_product_grade_id_product_grades_id_fk" FOREIGN KEY ("product_grade_id") REFERENCES "public"."product_grades"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_product_grade_id_product_grades_id_fk" FOREIGN KEY ("product_grade_id") REFERENCES "public"."product_grades"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "qc_results" ADD CONSTRAINT "qc_results_qc_sample_id_qc_samples_id_fk" FOREIGN KEY ("qc_sample_id") REFERENCES "public"."qc_samples"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "qc_results" ADD CONSTRAINT "qc_results_qc_parameter_id_qc_parameters_id_fk" FOREIGN KEY ("qc_parameter_id") REFERENCES "public"."qc_parameters"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "qc_samples" ADD CONSTRAINT "qc_samples_production_batch_id_production_batches_id_fk" FOREIGN KEY ("production_batch_id") REFERENCES "public"."production_batches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_inputs_batch_idx" ON "batch_inputs" USING btree ("production_batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_outputs_batch_idx" ON "batch_outputs" USING btree ("production_batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "production_batches_product_idx" ON "production_batches" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qc_results_sample_idx" ON "qc_results" USING btree ("qc_sample_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qc_samples_batch_idx" ON "qc_samples" USING btree ("production_batch_id");