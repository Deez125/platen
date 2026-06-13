ALTER TABLE "organizations" ALTER COLUMN "quote_number_pad_length" SET DEFAULT 5;--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "invoice_number_pad_length" SET DEFAULT 5;--> statement-breakpoint

-- Bump existing orgs still on the old 4-digit default up to 5. Numbers already
-- allocated keep their stored 4-digit string; only future numbers get 5 digits.
UPDATE "organizations" SET "quote_number_pad_length" = 5 WHERE "quote_number_pad_length" = 4;--> statement-breakpoint
UPDATE "organizations" SET "invoice_number_pad_length" = 5 WHERE "invoice_number_pad_length" = 4;