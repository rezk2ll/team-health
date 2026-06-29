CREATE TABLE "signal_snapshot" (
	"scope" text NOT NULL,
	"signal_id" text NOT NULL,
	"day" text NOT NULL,
	"level" text NOT NULL,
	"value" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signal_snapshot_scope_signal_id_day_pk" PRIMARY KEY("scope","signal_id","day")
);
--> statement-breakpoint
CREATE INDEX "signal_snapshot_lookup_idx" ON "signal_snapshot" USING btree ("scope","day");