-- Production Migration Script for 2ban-2chess
-- Run this directly in PostgreSQL terminal
-- Tables are created in dependency order

-- First, add columns to existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'guest' NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_data JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{"totalPlayTime": 0, "winStreak": 0, "lossStreak": 0}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'player' NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP DEFAULT NOW() NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;

ALTER TABLE games ADD COLUMN IF NOT EXISTS redis_sync_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE games ADD COLUMN IF NOT EXISTS redis_sync_at TIMESTAMP;
ALTER TABLE games ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE games ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE games ADD COLUMN IF NOT EXISTS spectator_count INTEGER DEFAULT 0;
ALTER TABLE games ADD COLUMN IF NOT EXISTS rating_change_white INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS rating_change_black INTEGER;

-- Create sessions table FIRST (since connections depends on it)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    provider VARCHAR(20) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    last_activity TIMESTAMP DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- Create oauth_accounts table
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at TIMESTAMP,
    token_type VARCHAR(50),
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create player_presence table
CREATE TABLE IF NOT EXISTS player_presence (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'offline' NOT NULL,
    last_heartbeat TIMESTAMP DEFAULT NOW() NOT NULL,
    current_game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create connections table (AFTER sessions)
CREATE TABLE IF NOT EXISTS connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    socket_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    connected_at TIMESTAMP DEFAULT NOW() NOT NULL,
    disconnected_at TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    transport VARCHAR(20) DEFAULT 'websocket' NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create ban_history table
CREATE TABLE IF NOT EXISTS ban_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    banned_at TIMESTAMP DEFAULT NOW() NOT NULL,
    banned_by UUID REFERENCES users(id),
    reason TEXT NOT NULL,
    evidence JSONB DEFAULT '{}'::jsonb,
    ban_type VARCHAR(20) DEFAULT 'temporary' NOT NULL,
    expires_at TIMESTAMP,
    lifted_at TIMESTAMP,
    lifted_by UUID REFERENCES users(id),
    lift_reason TEXT
);

-- Create game_cache table
CREATE TABLE IF NOT EXISTS game_cache (
    game_id UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
    cached_at TIMESTAMP DEFAULT NOW() NOT NULL,
    cache_ttl INTEGER DEFAULT 14400 NOT NULL,
    access_count INTEGER DEFAULT 0 NOT NULL,
    last_accessed TIMESTAMP DEFAULT NOW() NOT NULL,
    cache_key VARCHAR(255) NOT NULL,
    cache_version INTEGER DEFAULT 1 NOT NULL
);

-- Create matchmaking_queue table
CREATE TABLE IF NOT EXISTS matchmaking_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
    time_control JSONB DEFAULT '{"initial": 600, "increment": 0}'::jsonb NOT NULL,
    rating_range JSONB DEFAULT '{"min": null, "max": null}'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    matched BOOLEAN DEFAULT false NOT NULL,
    matched_at TIMESTAMP
);

-- Create admin_actions table
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES users(id) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    last_modified TIMESTAMP DEFAULT NOW() NOT NULL,
    modified_by UUID REFERENCES users(id)
);

-- Create moves table (for game history)
CREATE TABLE IF NOT EXISTS moves (
    id SERIAL PRIMARY KEY,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
    move_number INTEGER NOT NULL,
    color VARCHAR(5) NOT NULL,
    notation VARCHAR(10) NOT NULL,
    uci VARCHAR(10),
    fen_after VARCHAR(100) NOT NULL,
    clock_white INTEGER,
    clock_black INTEGER,
    is_ban BOOLEAN DEFAULT false NOT NULL,
    evaluation REAL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create game_events table
CREATE TABLE IF NOT EXISTS game_events (
    id SERIAL PRIMARY KEY,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
    player_id UUID REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    move_number INTEGER,
    fen_after VARCHAR(150),
    time_remaining_white INTEGER,
    time_remaining_black INTEGER,
    is_critical BOOLEAN DEFAULT false NOT NULL,
    acknowledged BOOLEAN DEFAULT false NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create move_buffer table (for buffered persistence)
CREATE TABLE IF NOT EXISTS move_buffer (
    id SERIAL PRIMARY KEY,
    game_id UUID NOT NULL,
    move_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create all indexes
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);
CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_unique ON users(provider, provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_updated ON users(updated_at);

CREATE INDEX IF NOT EXISTS idx_games_redis_sync ON games(redis_sync_status);
CREATE INDEX IF NOT EXISTS idx_games_archived ON games(archived);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_accounts_provider_unique ON oauth_accounts(provider, provider_account_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_player_presence_status ON player_presence(status);
CREATE INDEX IF NOT EXISTS idx_player_presence_heartbeat ON player_presence(last_heartbeat);

CREATE INDEX IF NOT EXISTS idx_connections_socket_id ON connections(socket_id);
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_session_id ON connections(session_id);
CREATE INDEX IF NOT EXISTS idx_connections_connected_at ON connections(connected_at);

CREATE INDEX IF NOT EXISTS idx_ban_history_user_id ON ban_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ban_history_banned_at ON ban_history(banned_at);
CREATE INDEX IF NOT EXISTS idx_ban_history_expires_at ON ban_history(expires_at);

CREATE INDEX IF NOT EXISTS idx_game_cache_last_accessed ON game_cache(last_accessed);
CREATE INDEX IF NOT EXISTS idx_game_cache_cached_at ON game_cache(cached_at);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_user_id ON matchmaking_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_joined_at ON matchmaking_queue(joined_at);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_matched ON matchmaking_queue(matched);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_timestamp ON admin_actions(timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action ON admin_actions(action);

CREATE INDEX IF NOT EXISTS idx_system_settings_modified ON system_settings(last_modified);

CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
CREATE INDEX IF NOT EXISTS idx_moves_move_number ON moves(game_id, move_number);

CREATE INDEX IF NOT EXISTS idx_game_events_game_id ON game_events(game_id);
CREATE INDEX IF NOT EXISTS idx_game_events_player_id ON game_events(player_id);
CREATE INDEX IF NOT EXISTS idx_game_events_timestamp ON game_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_game_events_type ON game_events(event_type);

CREATE INDEX IF NOT EXISTS idx_move_buffer_game_id ON move_buffer(game_id);
CREATE INDEX IF NOT EXISTS idx_move_buffer_created_at ON move_buffer(created_at);

-- Success message
SELECT 'Migration completed successfully!' as status;