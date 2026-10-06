CREATE TABLE "dispatch_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispatch_id" uuid NOT NULL,
	"packing_lot_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dispatch_lots" ADD CONSTRAINT "dispatch_lots_dispatch_id_dispatches_id_fk" FOREIGN KEY ("dispatch_id") REFERENCES "public"."dispatches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatch_lots" ADD CONSTRAINT "dispatch_lots_packing_lot_id_packing_lots_id_fk" FOREIGN KEY ("packing_lot_id") REFERENCES "public"."packing_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dispatch_lots_dispatch_idx" ON "dispatch_lots" USING btree ("dispatch_id");--> statement-breakpoint
CREATE INDEX "dispatch_lots_packing_lot_idx" ON "dispatch_lots" USING btree ("packing_lot_id");