# Database Quick Start

## 1. Install Prerequisites

- PostgreSQL 14+
- Redis 6+

## 2. Setup Database

```bash
# Create database
createdb chess2ban

# Set environment variable
echo "DATABASE_URL=postgresql://localhost:5432/chess2ban" >> .env
echo "REDIS_URL=redis://localhost:6379" >> .env

# Generate and apply schema
npm run db:push

# Seed admin accounts
npm run db:seed
```

## 3. Default Admin Accounts

After seeding, you'll have:

- **Super Admin**: `admin` / `admin@2banchess.local`
- **Moderator**: `moderator` / `mod@2banchess.local`

⚠️ **Change these credentials after first login!**

## 4. Architecture

```
Game Flow:
1. Active games → Redis (4-24hr TTL)
2. Moves → Memory buffer (100 moves)
3. Crash recovery → move_buffer table
4. Permanent storage → moves table (batch insert)
5. Completed games → PostgreSQL archive

Solo games: Redis only (never archived)
Multiplayer: Redis + PostgreSQL
```

## 5. Admin Features

The seeded database includes:

- User role system (player, moderator, admin, super_admin)
- Ban/suspension tracking
- Admin action audit log
- Configurable system settings
- Feature flags

## 6. Monitoring

```bash
# View database tables
npm run db:studio

# Check active games
redis-cli SMEMBERS games:active

# Database stats
psql chess2ban -c "SELECT COUNT(*) FROM games WHERE completed_at IS NOT NULL;"
```

## 7. Performance Notes

- **Buffering**: Moves buffered in memory, flushed every 5 seconds or 100 moves
- **Two-stage write**: Memory → move_buffer (unindexed) → moves (indexed)
- **Crash recovery**: move_buffer table preserves unflushed moves
- **Solo games**: Stay ephemeral in Redis, never hit PostgreSQL
- **Connection pool**: 20 connections max, auto-managed

See `/docs/database-setup.md` for detailed documentation.
