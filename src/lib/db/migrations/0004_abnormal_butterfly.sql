ALTER TABLE "Events" RENAME COLUMN "address" TO "commune";--> statement-breakpoint
ALTER TABLE "Events" ALTER COLUMN "commune" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "Events" ADD COLUMN "author_company_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "Events" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "Events" ADD COLUMN "rejected_at" timestamp with time zone;