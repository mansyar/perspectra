ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "ip_address" text;
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "user_agent" text;
