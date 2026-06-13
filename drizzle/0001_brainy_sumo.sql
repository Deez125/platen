ALTER TABLE "organizations" ADD COLUMN "brand_color_primary" text DEFAULT '#3B82F6' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "brand_color_accent" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "onboarding_complete" boolean DEFAULT false NOT NULL;