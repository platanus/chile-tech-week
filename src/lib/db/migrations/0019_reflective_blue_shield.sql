CREATE TABLE IF NOT EXISTS "JobExecutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" text NOT NULL,
	"last_executed_at" timestamp with time zone,
	"last_status" varchar(20),
	"last_error" text,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "JobExecutions_job_id_unique" UNIQUE("job_id")
);
