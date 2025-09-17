ALTER TABLE "Events" ADD COLUMN "public_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "Events" ADD COLUMN "rejection_reason" text;