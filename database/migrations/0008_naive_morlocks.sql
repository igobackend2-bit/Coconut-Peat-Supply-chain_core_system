CREATE TYPE "public"."packing_lot_qc_status" AS ENUM('PENDING', 'PASSED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."packing_order_status" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "packing_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"packing_order_id" uuid NOT NULL,
	"lot_number" text NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_units" numeric(12, 2) NOT NULL,
	"net_weight_kg" numeric(12, 2),
	"qc_status" "packing_lot_qc_status" DEFAULT 'PENDING' NOT NULL,
	"packed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packing_lots_lot_number_unique" UNIQUE("lot_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "packing_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"production_batch_id" uuid NOT NULL,
	"packaging_type_id" uuid NOT NULL,
	"planned_quantity_units" numeric(12, 2),
	"status" "packing_order_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "packing_lots" ADD CONSTRAINT "packing_lots_packing_order_id_packing_orders_id_fk" FOREIGN KEY ("packing_order_id") REFERENCES "public"."packing_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "packing_lots" ADD CONSTRAINT "packing_lots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "packing_orders" ADD CONSTRAINT "packing_orders_production_batch_id_production_batches_id_fk" FOREIGN KEY ("production_batch_id") REFERENCES "public"."production_batches"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "packing_orders" ADD CONSTRAINT "packing_orders_packaging_type_id_packaging_types_id_fk" FOREIGN KEY ("packaging_type_id") REFERENCES "public"."packaging_types"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "packing_lots_order_idx" ON "packing_lots" USING btree ("packing_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "packing_orders_batch_idx" ON "packing_orders" USING btree ("production_batch_id");