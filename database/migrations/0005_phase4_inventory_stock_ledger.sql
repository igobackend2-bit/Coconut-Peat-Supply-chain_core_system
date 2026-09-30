CREATE TYPE "public"."stock_movement_type" AS ENUM('RAW_MATERIAL_CONSUMPTION', 'PRODUCTION_OUTPUT', 'ADJUSTMENT');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"product_id" uuid NOT NULL,
	"location_id" uuid,
	"movement_type" "stock_movement_type" NOT NULL,
	"quantity_kg" numeric(14, 3) NOT NULL,
	"reference_type" text,
	"reference_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_ledger_product_idx" ON "stock_ledger" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_ledger_reference_idx" ON "stock_ledger" USING btree ("reference_type","reference_id");