-- Migration: Unified Auth and Redis Integration
-- Purpose: Redesign database to properly integrate with NextAuth and Redis

-- 1. Enhanced users table with OAuth provider tracking
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "provider" varchar(20) DEFAULT 'guest',
ADD COLUMN IF NOT EXISTS "provider_id" varchar(255),
ADD COLUMN IF NOT EXISTS "provider_data" jsonb,
ADD COLUMN IF NOT EXISTS "display_name" varchar(100),
ADD COLUMN IF NOT EXISTS "avatar_url" text,
ADD COLUMN IF NOT EXISTS "preferences" jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "stats" jsonb DEFAULT '{"totalPlayTime": 0, "winStreak": 0, "lossStreak": 0}',
ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

-- Add unique constraint for provider + provider_id combination
ALTER TABLE "users" 
ADD CONSTRAINT "users_provider_unique" UNIQUE("provider", "provider_id");

-- Add indexes for provider lookups
CREATE INDEX IF NOT EXISTS "idx_users_provider" ON "users" ("provider");
CREATE INDEX IF NOT EXISTS "idx_users_provider_id" ON "users" ("provider_id");
CREATE INDEX IF NOT EXISTS "idx_users_updated" ON "users" ("updated_at");

-- 2. Sessions table for auth persistence and Redis sync
CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "session_token" varchar(255) UNIQUE NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "provider" varchar(20) NOT NULL,
  "ip_address" inet,
  "user_agent" text,
  "last_activity" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "metadata" jsonb DEFAULT '{}'
);

-- Session indexes for fast lookups
CREATE INDEX IF NOT EXISTS "idx_sessions_user" ON "sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_sessions_token" ON "sessions" ("session_token");
CREATE INDEX IF NOT EXISTS "idx_sessions_expires" ON "sessions" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_sessions_active" ON "sessions" ("is_active", "expires_at");

-- 3. OAuth accounts linking table
CREATE TABLE IF NOT EXISTS "oauth_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider" varchar(20) NOT NULL,
  "provider_account_id" varchar(255) NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "token_type" varchar(50),
  "scope" text,
  "id_token" text,
  "session_state" text,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "oauth_unique" UNIQUE("provider", "provider_account_id")
);

CREATE INDEX IF NOT EXISTS "idx_oauth_user" ON "oauth_accounts" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_oauth_provider" ON "oauth_accounts" ("provider", "provider_account_id");

-- 4. Enhanced games table with better Redis sync tracking
ALTER TABLE "games" 
ADD COLUMN IF NOT EXISTS "redis_sync_status" varchar(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "redis_sync_at" timestamp,
ADD COLUMN IF NOT EXISTS "archived" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS "spectator_count" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "rating_change_white" integer,
ADD COLUMN IF NOT EXISTS "rating_change_black" integer;

-- Add index for Redis sync management
CREATE INDEX IF NOT EXISTS "idx_games_redis_sync" ON "games" ("redis_sync_status", "redis_sync_at");
CREATE INDEX IF NOT EXISTS "idx_games_archived" ON "games" ("archived", "completed_at");

-- 5. Player presence table (syncs with Redis online status)
CREATE TABLE IF NOT EXISTS "player_presence" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "status" varchar(20) NOT NULL DEFAULT 'offline', -- online, in_game, away, offline
  "current_game_id" uuid REFERENCES "games"("id") ON DELETE SET NULL,
  "last_heartbeat" timestamp DEFAULT now() NOT NULL,
  "client_info" jsonb DEFAULT '{}',
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_presence_status" ON "player_presence" ("status");
CREATE INDEX IF NOT EXISTS "idx_presence_heartbeat" ON "player_presence" ("last_heartbeat");

-- 6. Matchmaking queue table (persistent queue state)
CREATE TABLE IF NOT EXISTS "matchmaking_queue" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "joined_at" timestamp DEFAULT now() NOT NULL,
  "time_control" jsonb NOT NULL DEFAULT '{"initial": 600, "increment": 0}',
  "rating_range" jsonb DEFAULT '{"min": null, "max": null}',
  "preferences" jsonb DEFAULT '{}',
  "matched" boolean DEFAULT false,
  "matched_at" timestamp,
  CONSTRAINT "queue_unique_user" UNIQUE("user_id", "matched")
);

CREATE INDEX IF NOT EXISTS "idx_queue_joined" ON "matchmaking_queue" ("joined_at") WHERE matched = false;
CREATE INDEX IF NOT EXISTS "idx_queue_user" ON "matchmaking_queue" ("user_id");

-- 7. Game cache metadata (tracks Redis cache state)
CREATE TABLE IF NOT EXISTS "game_cache" (
  "game_id" uuid PRIMARY KEY REFERENCES "games"("id") ON DELETE CASCADE,
  "cached_at" timestamp DEFAULT now() NOT NULL,
  "cache_ttl" integer NOT NULL DEFAULT 14400, -- 4 hours default
  "access_count" integer DEFAULT 0,
  "last_accessed" timestamp DEFAULT now(),
  "cache_key" varchar(255) NOT NULL,
  "cache_version" integer DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "idx_cache_accessed" ON "game_cache" ("last_accessed");
CREATE INDEX IF NOT EXISTS "idx_cache_key" ON "game_cache" ("cache_key");

-- 8. Enhanced game events with proper structure
ALTER TABLE "game_events"
ADD COLUMN IF NOT EXISTS "player_id" uuid REFERENCES "users"("id"),
ADD COLUMN IF NOT EXISTS "move_number" integer,
ADD COLUMN IF NOT EXISTS "fen_after" varchar(150),
ADD COLUMN IF NOT EXISTS "time_remaining_white" integer,
ADD COLUMN IF NOT EXISTS "time_remaining_black" integer;

CREATE INDEX IF NOT EXISTS "idx_events_player" ON "game_events" ("player_id");
CREATE INDEX IF NOT EXISTS "idx_events_type" ON "game_events" ("event_type");

-- 9. Ban tracking improvements
CREATE TABLE IF NOT EXISTS "ban_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "banned_by" uuid REFERENCES "users"("id"),
  "ban_type" varchar(20) NOT NULL, -- 'temporary', 'permanent', 'chat', 'play'
  "reason" text NOT NULL,
  "evidence" jsonb DEFAULT '{}',
  "duration_hours" integer,
  "banned_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp,
  "lifted_at" timestamp,
  "lifted_by" uuid REFERENCES "users"("id"),
  "lift_reason" text
);

CREATE INDEX IF NOT EXISTS "idx_ban_user" ON "ban_history" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_ban_active" ON "ban_history" ("user_id", "expires_at") WHERE lifted_at IS NULL;

-- 10. Connection tracking for WebSocket management
CREATE TABLE IF NOT EXISTS "connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "session_id" uuid REFERENCES "sessions"("id") ON DELETE CASCADE,
  "socket_id" varchar(255) UNIQUE NOT NULL,
  "connected_at" timestamp DEFAULT now() NOT NULL,
  "disconnected_at" timestamp,
  "ip_address" inet,
  "transport" varchar(20), -- 'websocket', 'polling'
  "client_version" varchar(20)
);

CREATE INDEX IF NOT EXISTS "idx_conn_user" ON "connections" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_conn_socket" ON "connections" ("socket_id");
CREATE INDEX IF NOT EXISTS "idx_conn_active" ON "connections" ("user_id") WHERE disconnected_at IS NULL;

-- Update triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_oauth_accounts_updated_at
  BEFORE UPDATE ON oauth_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_player_presence_updated_at
  BEFORE UPDATE ON player_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE sessions 
  SET is_active = false 
  WHERE expires_at < NOW() AND is_active = true;
  
  DELETE FROM sessions 
  WHERE expires_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to update player presence from heartbeat
CREATE OR REPLACE FUNCTION update_player_heartbeat(p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO player_presence (user_id, status, last_heartbeat)
  VALUES (p_user_id, 'online', NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    last_heartbeat = NOW(),
    status = CASE 
      WHEN player_presence.status = 'in_game' THEN 'in_game'
      ELSE 'online'
    END;
END;
$$ LANGUAGE plpgsql;