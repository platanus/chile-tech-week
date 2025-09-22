-- Update any existing NULL values to a default website
UPDATE "Events" SET "company_website" = 'https://example.com' WHERE "company_website" IS NULL;--> statement-breakpoint
-- Make the column NOT NULL
ALTER TABLE "Events" ALTER COLUMN "company_website" SET NOT NULL;