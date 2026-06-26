ALTER TABLE "member_repo_month" ADD COLUMN "additions" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "member_repo_month" ADD COLUMN "deletions" integer DEFAULT 0 NOT NULL;