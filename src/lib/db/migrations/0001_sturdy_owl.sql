DO $$ BEGIN
 CREATE TYPE "public"."event_format" AS ENUM('breakfast_brunch_lunch', 'dinner', 'experiential', 'hackathon', 'happy_hour', 'matchmaking', 'networking', 'panel_fireside_chat', 'pitch_event_demo_day', 'roundtable_workshop');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "EventCohosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"primary_contact_name" varchar(255) NOT NULL,
	"primary_contact_email" varchar(255) NOT NULL,
	"primary_contact_phone_number" varchar(50),
	"primary_contact_website" varchar(500),
	"primary_contact_linkedin" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "EventThemeRelations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"theme_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "EventThemes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "EventThemes_name_unique" UNIQUE("name"),
	CONSTRAINT "EventThemes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_email" varchar(255) NOT NULL,
	"author_name" varchar(255) NOT NULL,
	"author_phone_number" varchar(50),
	"title" varchar(500) NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"address" text NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"format" "event_format" NOT NULL,
	"luma_link" varchar(500),
	"company_logo_url" varchar(500),
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "EventCohosts" ADD CONSTRAINT "EventCohosts_event_id_Events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."Events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "EventThemeRelations" ADD CONSTRAINT "EventThemeRelations_event_id_Events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."Events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "EventThemeRelations" ADD CONSTRAINT "EventThemeRelations_theme_id_EventThemes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."EventThemes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
