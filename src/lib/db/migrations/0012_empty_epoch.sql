DO $$ BEGIN
 CREATE TYPE "public"."event_state" AS ENUM('submitted', 'rejected', 'waiting-luma-edit', 'published', 'deleted');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "Events" ALTER COLUMN "company_website" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Events" ALTER COLUMN "submitted_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "Events" ALTER COLUMN "submitted_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Events" ADD COLUMN "state" "event_state" DEFAULT 'submitted' NOT NULL;--> statement-breakpoint
ALTER TABLE "Events" ADD COLUMN "waiting_luma_edit_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "Events" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "Events" ADD COLUMN "deleted_at" timestamp with time zone;