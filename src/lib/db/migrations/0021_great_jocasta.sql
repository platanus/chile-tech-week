ALTER TABLE "EventCohosts" ADD COLUMN "logo_shown_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "Events" ADD COLUMN "logo_shown_at" timestamp with time zone;--> statement-breakpoint
UPDATE "Events" SET "logo_shown_at" = NOW() WHERE "logo_shown_at" IS NULL;--> statement-breakpoint
UPDATE "EventCohosts" SET "logo_shown_at" = NOW() WHERE "logo_shown_at" IS NULL;