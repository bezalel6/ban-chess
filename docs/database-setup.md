# Database Setup Guide

## Overview

The 2ban-2chess application uses a hybrid persistence strategy inspired by Lichess:
- **Redis**: Hot cache for active games (4-24 hour TTL)
- **PostgreSQL**: Permanent storage for completed games and user statistics
- **Buffered Writes**: Moves are buffered and batch-inserted for performance

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────▶│   Redis     │────▶│  PostgreSQL │
│   Frontend  │     │  (Hot Cache) │     │ (Permanent) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    Active Games &
                    Live Updates
```

## Prerequisites

1. **PostgreSQL** (v14+ recommended)
2. **Redis** (v6+ recommended)
3. **Node.js** (v18+)

## Quick Setup

### 1. Install PostgreSQL

#### Windows:
Download from https://www.postgresql.org/download/windows/

#### macOS:
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### Linux:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE chess2ban;

# Create user (optional)
CREATE USER chess2ban_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE chess2ban TO chess2ban_user;
```

### 3. Configure Environment

Create a `.env` file in the project root:

```env
# PostgreSQL connection
DATABASE_URL=postgresql://postgres:password@localhost:5432/chess2ban

# Redis connection
REDIS_URL=redis://localhost:6379

# WebSocket configuration
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3001
```

### 4. Run Migrations

```bash
# Generate migration files from schema
npm run db:generate

# Apply migrations to database
npm run db:push

# Optional: Open Drizzle Studio to view database
npm run db:studio
```

## Database Schema

### Core Tables

1. **users**
   - Stores player profiles and statistics
   - Tracks games played, won, lost, drawn
   - Rating system ready for future implementation

2. **games**
   - Permanent record of all games
   - Stores PGN, final position, time controls
   - Ban Chess specific fields (banned moves)

3. **moves**
   - Individual move records for analysis
   - Buffered batch inserts for performance
   - Supports future computer analysis

4. **move_buffer**
   - Temporary storage for batch processing
   - Automatically flushed every 5 seconds
   - Reduces database write pressure

5. **game_events**
   - Complete event log for game replay
   - Captures all user actions and system events

## Performance Features

### Buffered Persistence (Lichess-style)

The system buffers moves in memory and batch-inserts them:

```typescript
// Moves are buffered during gameplay
Buffer Size: 100 moves per game
Flush Interval: 5 seconds
Batch Insert: Up to 1000 rows at once
```

### Data Lifecycle

1. **Active Games** (Redis)
   - 4-hour TTL for games in progress
   - Instant read/write for live gameplay
   - Pub/sub for real-time updates

2. **Completed Games** (Redis → PostgreSQL)
   - 24-hour TTL in Redis after completion
   - Automatically archived to PostgreSQL
   - Permanent storage for history

3. **Query Pattern**
   - Active games: Query Redis first
   - Historical games: Query PostgreSQL
   - User stats: Always from PostgreSQL

## Monitoring

### Check Database Status

```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Active games count
SELECT COUNT(*) FROM games WHERE completed_at IS NULL;

-- Total games
SELECT COUNT(*) FROM games;

-- User statistics
SELECT username, games_played, games_won, rating
FROM users
ORDER BY rating DESC
LIMIT 10;
```

### Redis Monitoring

```bash
# Connect to Redis CLI
redis-cli

# Check memory usage
INFO memory

# Active games
SMEMBERS games:active

# Online players
SMEMBERS players:online
```

## Maintenance

### Cleanup Old Data

```sql
-- Archive games older than 6 months (optional)
DELETE FROM game_events 
WHERE game_id IN (
  SELECT id FROM games 
  WHERE completed_at < NOW() - INTERVAL '6 months'
);

-- Vacuum to reclaim space
VACUUM ANALYZE;
```

### Backup

```bash
# Backup database
pg_dump chess2ban > backup_$(date +%Y%m%d).sql

# Restore from backup
psql chess2ban < backup_20240101.sql
```

## Troubleshooting

### Common Issues

1. **"Database does not exist"**
   ```bash
   createdb chess2ban
   ```

2. **"Permission denied"**
   - Check DATABASE_URL credentials
   - Ensure user has proper permissions

3. **"Buffer not flushing"**
   - Check Redis connection
   - Verify WebSocket server is running
   - Look for errors in server logs

4. **"Games not archiving"**
   - Ensure PostgreSQL is running
   - Check gameArchiver logs
   - Verify Redis → PostgreSQL connection

## Production Considerations

1. **Connection Pooling**: Already configured (max: 20 connections)
2. **Indexes**: Automatically created on foreign keys and commonly queried fields
3. **Monitoring**: Consider adding Prometheus/Grafana
4. **Backups**: Set up automated daily backups
5. **Scaling**: PostgreSQL can be replicated for read scaling

## Migration from Redis-only

If you have existing data in Redis:

```bash
# Run the archival script (coming soon)
npm run migrate:redis-to-postgres
```

This will:
1. Find all completed games in Redis
2. Archive them to PostgreSQL
3. Maintain Redis TTLs for active games