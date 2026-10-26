CREATE TABLE "rooms" (
	"id" text PRIMARY KEY,
	"status" text DEFAULT 'LOBBY' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"data" jsonb NOT NULL,
	"presence" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rooms_lobby_idx" ON "rooms" ("is_public","status");--> statement-breakpoint
CREATE INDEX "rooms_updated_idx" ON "rooms" ("updated_at");