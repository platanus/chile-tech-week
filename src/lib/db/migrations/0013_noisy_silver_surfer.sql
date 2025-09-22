-- First add the column as nullable
ALTER TABLE "Events" ADD COLUMN "description" text;--> statement-breakpoint
-- Update any existing records with a default description
UPDATE "Events" SET "description" = 'Event description will be added soon.' WHERE "description" IS NULL;--> statement-breakpoint
-- Now make the column NOT NULL
ALTER TABLE "Events" ALTER COLUMN "description" SET NOT NULL;