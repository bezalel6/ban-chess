CREATE TABLE "admin_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"target_id" varchar(255),
	"details" jsonb,
	"reason" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"event_data" jsonb NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"white_player_id" uuid,
	"black_player_id" uuid,
	"pgn" text,
	"fen_initial" varchar(150) DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 b:ban',
	"fen_final" varchar(100),
	"result" varchar(10),
	"time_control" jsonb,
	"is_solo_game" boolean DEFAULT false NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"total_moves" integer DEFAULT 0 NOT NULL,
	"total_bans" integer DEFAULT 0 NOT NULL,
	"ban_moves" jsonb DEFAULT '[]'::jsonb,
	"final_position" jsonb
);
--> statement-breakpoint
CREATE TABLE "move_buffer" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"move_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moves" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_id" uuid NOT NULL,
	"move_number" integer NOT NULL,
	"color" varchar(5) NOT NULL,
	"notation" varchar(10) NOT NULL,
	"uci" varchar(10),
	"fen_after" varchar(100) NOT NULL,
	"clock_white" integer,
	"clock_black" integer,
	"is_ban" boolean DEFAULT false NOT NULL,
	"evaluation" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"last_modified" timestamp DEFAULT now() NOT NULL,
	"modified_by" uuid
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(255),
	"rating" integer DEFAULT 1500 NOT NULL,
	"games_played" integer DEFAULT 0 NOT NULL,
	"games_won" integer DEFAULT 0 NOT NULL,
	"games_lost" integer DEFAULT 0 NOT NULL,
	"games_drawn" integer DEFAULT 0 NOT NULL,
	"role" varchar(20) DEFAULT 'player' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"banned_until" timestamp,
	"ban_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_white_player_id_users_id_fk" FOREIGN KEY ("white_player_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_black_player_id_users_id_fk" FOREIGN KEY ("black_player_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moves" ADD CONSTRAINT "moves_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_modified_by_users_id_fk" FOREIGN KEY ("modified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_admin_actions_admin" ON "admin_actions" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "idx_admin_actions_timestamp" ON "admin_actions" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_admin_actions_action" ON "admin_actions" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_game_events_game_id" ON "game_events" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "idx_game_events_timestamp" ON "game_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_games_white_player" ON "games" USING btree ("white_player_id");--> statement-breakpoint
CREATE INDEX "idx_games_black_player" ON "games" USING btree ("black_player_id");--> statement-breakpoint
CREATE INDEX "idx_games_started_at" ON "games" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_games_completed_at" ON "games" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "idx_games_result" ON "games" USING btree ("result");--> statement-breakpoint
CREATE INDEX "idx_move_buffer_game_id" ON "move_buffer" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "idx_move_buffer_created_at" ON "move_buffer" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_moves_game_id" ON "moves" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "idx_moves_game_moves" ON "moves" USING btree ("game_id","move_number");--> statement-breakpoint
CREATE INDEX "idx_system_settings_modified" ON "system_settings" USING btree ("last_modified");--> statement-breakpoint
CREATE INDEX "idx_users_username" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_users_rating" ON "users" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_users_active" ON "users" USING btree ("is_active");