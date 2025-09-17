ALTER TABLE "Events" ADD COLUMN "luma_event_api_id" varchar(255);--> statement-breakpoint
ALTER TABLE "Events" ADD COLUMN "luma_event_url" varchar(500);--> statement-breakpoint
ALTER TABLE "Events" ADD COLUMN "luma_event_created_at" timestamp with time zone;