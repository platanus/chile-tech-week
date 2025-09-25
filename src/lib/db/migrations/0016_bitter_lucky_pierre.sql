CREATE TABLE IF NOT EXISTS "EventAudienceRelations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"audience_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "EventAudiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "EventAudiences_name_unique" UNIQUE("name"),
	CONSTRAINT "EventAudiences_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "EventAudienceRelations" ADD CONSTRAINT "EventAudienceRelations_event_id_Events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."Events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "EventAudienceRelations" ADD CONSTRAINT "EventAudienceRelations_audience_id_EventAudiences_id_fk" FOREIGN KEY ("audience_id") REFERENCES "public"."EventAudiences"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
