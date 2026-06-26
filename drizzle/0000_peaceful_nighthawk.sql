CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_sub" text NOT NULL,
	"action" text NOT NULL,
	"detail" jsonb,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_repo_month" (
	"login" text NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"month" text NOT NULL,
	"commits" integer NOT NULL,
	"merged_prs" integer NOT NULL,
	CONSTRAINT "member_repo_month_login_owner_repo_month_pk" PRIMARY KEY("login","owner","repo","month")
);
--> statement-breakpoint
CREATE TABLE "repo_month" (
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"month" text NOT NULL,
	"created" integer NOT NULL,
	"merged" integer NOT NULL,
	"closed" integer NOT NULL,
	"add_per_pr" double precision NOT NULL,
	"del_per_pr" double precision NOT NULL,
	"days_per_pr" double precision NOT NULL,
	"comments_per_pr" double precision NOT NULL,
	"reviews_per_pr" double precision NOT NULL,
	"bugs" integer NOT NULL,
	"issues" integer NOT NULL,
	"issues_open" integer NOT NULL,
	"bugs_open" integer NOT NULL,
	"prs_open" integer NOT NULL,
	"prs_stale" integer NOT NULL,
	"releases" integer NOT NULL,
	"resolution_days" double precision NOT NULL,
	"resolution_std" double precision NOT NULL,
	"resolution_rate" double precision NOT NULL,
	CONSTRAINT "repo_month_owner_repo_month_pk" PRIMARY KEY("owner","repo","month")
);
--> statement-breakpoint
CREATE TABLE "review_repo_month" (
	"reviewer" text NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"month" text NOT NULL,
	"reviews" integer NOT NULL,
	"comments" integer NOT NULL,
	CONSTRAINT "review_repo_month_reviewer_owner_repo_month_pk" PRIMARY KEY("reviewer","owner","repo","month")
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_sub" text NOT NULL,
	"name" text NOT NULL,
	"members" jsonb NOT NULL,
	"repos" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_log" USING btree ("user_sub");--> statement-breakpoint
CREATE INDEX "audit_ts_idx" ON "audit_log" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "team_owner_idx" ON "team" USING btree ("owner_sub");