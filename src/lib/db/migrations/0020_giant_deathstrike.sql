DO $$ BEGIN
 CREATE TYPE "public"."outbound_email_status" AS ENUM('queued', 'pending', 'sent', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "OutboundEmails" ADD COLUMN "queued_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "OutboundEmails" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "OutboundEmails" ALTER COLUMN "status" SET DATA TYPE outbound_email_status USING status::outbound_email_status;--> statement-breakpoint
ALTER TABLE "OutboundEmails" ALTER COLUMN "status" SET DEFAULT 'queued';