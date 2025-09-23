ALTER TABLE "OutboundEmails" DROP CONSTRAINT "OutboundEmails_sent_by_user_id_User_id_fk";
--> statement-breakpoint
ALTER TABLE "OutboundEmails" DROP COLUMN IF EXISTS "sent_by_user_id";