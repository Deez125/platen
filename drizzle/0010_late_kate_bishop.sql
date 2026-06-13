ALTER TABLE "distributor_product_variants" ADD COLUMN "case_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "distributor_product_variants" ADD COLUMN "case_size" integer;--> statement-breakpoint
ALTER TABLE "distributor_products" ADD COLUMN "color_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "distributor_products" ADD COLUMN "min_price" numeric(10, 2);