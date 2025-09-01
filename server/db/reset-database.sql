-- Reset Database Script
-- This will completely drop and recreate all tables with the new schema
-- WARNING: This will DELETE ALL DATA!

-- Drop all existing tables and related objects
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS ban_history CASCADE;
DROP TABLE IF EXISTS matchmaking_queue CASCADE;
DROP TABLE IF EXISTS player_presence CASCADE;
DROP TABLE IF EXISTS game_cache CASCADE;
DROP TABLE IF EXISTS game_events CASCADE;
DROP TABLE IF EXISTS moves CASCADE;
DROP TABLE IF EXISTS move_buffer CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS oauth_accounts CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS admin_actions CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop any existing functions
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_sessions() CASCADE;
DROP FUNCTION IF EXISTS update_player_heartbeat(uuid) CASCADE;

-- Create the new schema (run the migration file after this)
-- Execute: psql -U username -d database_name -f 0001_unified_auth_redis.sql