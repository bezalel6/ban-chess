import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  text,
  jsonb,
  boolean,
  index,
  serial,
  real,
  inet,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==================== AUTH & USER TABLES ====================

// Enhanced users table with OAuth and session support
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    username: varchar('username', { length: 50 }).unique().notNull(),
    email: varchar('email', { length: 255 }).unique(),

    // OAuth provider tracking
    provider: varchar('provider', { length: 20 }).default('guest').notNull(), // 'google', 'lichess', 'guest'
    providerId: varchar('provider_id', { length: 255 }),
    providerData: jsonb('provider_data').$type<Record<string, unknown>>(),

    // Profile fields
    displayName: varchar('display_name', { length: 100 }),
    avatarUrl: text('avatar_url'),

    // Game stats
    rating: integer('rating').default(1500).notNull(),
    gamesPlayed: integer('games_played').default(0).notNull(),
    gamesWon: integer('games_won').default(0).notNull(),
    gamesLost: integer('games_lost').default(0).notNull(),
    gamesDrawn: integer('games_drawn').default(0).notNull(),

    // User preferences and extended stats
    preferences: jsonb('preferences')
      .$type<{
        soundEnabled?: boolean;
        theme?: string;
        boardStyle?: string;
      }>()
      .default({}),
    stats: jsonb('stats')
      .$type<{
        totalPlayTime: number;
        winStreak: number;
        lossStreak: number;
        favoriteOpenings?: string[];
      }>()
      .default({ totalPlayTime: 0, winStreak: 0, lossStreak: 0 }),

    // Access control
    role: varchar('role', { length: 20 }).default('player').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    bannedUntil: timestamp('banned_until'),
    banReason: text('ban_reason'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    usernameIdx: index('idx_users_username').on(table.username),
    emailIdx: index('idx_users_email').on(table.email),
    providerIdx: index('idx_users_provider').on(table.provider),
    providerIdIdx: index('idx_users_provider_id').on(table.providerId),
    providerUniqueIdx: uniqueIndex('idx_users_provider_unique').on(
      table.provider,
      table.providerId
    ),
    ratingIdx: index('idx_users_rating').on(table.rating),
    roleIdx: index('idx_users_role').on(table.role),
    activeIdx: index('idx_users_active').on(table.isActive),
    updatedIdx: index('idx_users_updated').on(table.updatedAt),
  })
);

// Sessions table for auth persistence
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    sessionToken: varchar('session_token', { length: 255 }).unique().notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    provider: varchar('provider', { length: 20 }).notNull(),

    // Connection info
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),

    // Session lifecycle
    lastActivity: timestamp('last_activity').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    isActive: boolean('is_active').default(true).notNull(),

    // Additional metadata
    metadata: jsonb('metadata')
      .$type<{
        deviceInfo?: string;
        location?: string;
      }>()
      .default({}),
  },
  table => ({
    userIdx: index('idx_sessions_user').on(table.userId),
    tokenIdx: index('idx_sessions_token').on(table.sessionToken),
    expiresIdx: index('idx_sessions_expires').on(table.expiresAt),
    activeIdx: index('idx_sessions_active').on(table.isActive, table.expiresAt),
  })
);

// OAuth accounts linking
export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    provider: varchar('provider', { length: 20 }).notNull(),
    providerAccountId: varchar('provider_account_id', {
      length: 255,
    }).notNull(),

    // OAuth tokens
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    tokenType: varchar('token_type', { length: 50 }),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: text('session_state'),
    expiresAt: timestamp('expires_at'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    userIdx: index('idx_oauth_user').on(table.userId),
    providerIdx: index('idx_oauth_provider').on(
      table.provider,
      table.providerAccountId
    ),
    uniqueProviderAccount: uniqueIndex('oauth_unique').on(
      table.provider,
      table.providerAccountId
    ),
  })
);

// ==================== GAME TABLES ====================

// Enhanced games table with Redis sync tracking
export const games = pgTable(
  'games',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    whitePlayerId: uuid('white_player_id').references(() => users.id),
    blackPlayerId: uuid('black_player_id').references(() => users.id),

    // Game state
    pgn: text('pgn'),
    fenInitial: varchar('fen_initial', { length: 150 }).default(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 b:ban'
    ),
    fenFinal: varchar('fen_final', { length: 100 }),
    result: varchar('result', { length: 10 }), // '1-0', '0-1', '1/2-1/2', '*'

    // Time control
    timeControl: jsonb('time_control').$type<{
      initial: number;
      increment: number;
    }>(),

    // Game metadata
    isSoloGame: boolean('is_solo_game').default(false).notNull(),
    totalMoves: integer('total_moves').default(0).notNull(),
    totalBans: integer('total_bans').default(0).notNull(),
    banMoves: jsonb('ban_moves').$type<string[]>().default([]),
    finalPosition: jsonb('final_position').$type<Record<string, unknown>>(),

    // Redis sync tracking
    redisSyncStatus: varchar('redis_sync_status', { length: 20 }).default(
      'pending'
    ),
    redisSyncAt: timestamp('redis_sync_at'),
    archived: boolean('archived').default(false),

    // Additional metadata
    metadata: jsonb('metadata')
      .$type<{
        opening?: string;
        variation?: string;
        timeUsedWhite?: number;
        timeUsedBlack?: number;
      }>()
      .default({}),
    spectatorCount: integer('spectator_count').default(0),

    // Rating changes
    ratingChangeWhite: integer('rating_change_white'),
    ratingChangeBlack: integer('rating_change_black'),

    // Timestamps
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
  },
  table => ({
    whitePlayerIdx: index('idx_games_white_player').on(table.whitePlayerId),
    blackPlayerIdx: index('idx_games_black_player').on(table.blackPlayerId),
    startedAtIdx: index('idx_games_started_at').on(table.startedAt),
    completedAtIdx: index('idx_games_completed_at').on(table.completedAt),
    resultIdx: index('idx_games_result').on(table.result),
    redisSyncIdx: index('idx_games_redis_sync').on(
      table.redisSyncStatus,
      table.redisSyncAt
    ),
    archivedIdx: index('idx_games_archived').on(
      table.archived,
      table.completedAt
    ),
  })
);

// Moves table
export const moves = pgTable(
  'moves',
  {
    id: serial('id').primaryKey(),
    gameId: uuid('game_id')
      .references(() => games.id, { onDelete: 'cascade' })
      .notNull(),
    moveNumber: integer('move_number').notNull(),
    color: varchar('color', { length: 5 }).notNull(),
    notation: varchar('notation', { length: 10 }).notNull(),
    uci: varchar('uci', { length: 10 }),
    fenAfter: varchar('fen_after', { length: 100 }).notNull(),
    clockWhite: integer('clock_white'),
    clockBlack: integer('clock_black'),
    isBan: boolean('is_ban').default(false).notNull(),
    evaluation: real('evaluation'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    gameIdIdx: index('idx_moves_game_id').on(table.gameId),
    gameMovesIdx: index('idx_moves_game_moves').on(
      table.gameId,
      table.moveNumber
    ),
  })
);

// Enhanced game events
export const gameEvents = pgTable(
  'game_events',
  {
    id: serial('id').primaryKey(),
    gameId: uuid('game_id')
      .references(() => games.id, { onDelete: 'cascade' })
      .notNull(),
    playerId: uuid('player_id').references(() => users.id),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    eventData: jsonb('event_data').notNull(),

    // Additional context
    moveNumber: integer('move_number'),
    fenAfter: varchar('fen_after', { length: 150 }),
    timeRemainingWhite: integer('time_remaining_white'),
    timeRemainingBlack: integer('time_remaining_black'),

    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  table => ({
    gameIdIdx: index('idx_game_events_game_id').on(table.gameId),
    playerIdx: index('idx_events_player').on(table.playerId),
    typeIdx: index('idx_events_type').on(table.eventType),
    timestampIdx: index('idx_game_events_timestamp').on(table.timestamp),
  })
);

// ==================== REAL-TIME SYNC TABLES ====================

// Player presence (syncs with Redis)
export const playerPresence = pgTable(
  'player_presence',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).default('offline').notNull(),
    currentGameId: uuid('current_game_id').references(() => games.id, {
      onDelete: 'set null',
    }),
    lastHeartbeat: timestamp('last_heartbeat').defaultNow().notNull(),
    clientInfo: jsonb('client_info')
      .$type<{
        version?: string;
        platform?: string;
      }>()
      .default({}),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    statusIdx: index('idx_presence_status').on(table.status),
    heartbeatIdx: index('idx_presence_heartbeat').on(table.lastHeartbeat),
  })
);

// Matchmaking queue
export const matchmakingQueue = pgTable(
  'matchmaking_queue',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    timeControl: jsonb('time_control')
      .$type<{ initial: number; increment: number }>()
      .default({ initial: 600, increment: 0 })
      .notNull(),
    ratingRange: jsonb('rating_range')
      .$type<{
        min: number | null;
        max: number | null;
      }>()
      .default({ min: null, max: null }),
    preferences: jsonb('preferences')
      .$type<Record<string, unknown>>()
      .default({}),
    matched: boolean('matched').default(false),
    matchedAt: timestamp('matched_at'),
  },
  table => ({
    joinedIdx: index('idx_queue_joined').on(table.joinedAt),
    userIdx: index('idx_queue_user').on(table.userId),
    uniqueUserQueue: uniqueIndex('queue_unique_user').on(
      table.userId,
      table.matched
    ),
  })
);

// Game cache metadata
export const gameCache = pgTable(
  'game_cache',
  {
    gameId: uuid('game_id')
      .primaryKey()
      .references(() => games.id, { onDelete: 'cascade' }),
    cachedAt: timestamp('cached_at').defaultNow().notNull(),
    cacheTtl: integer('cache_ttl').default(14400).notNull(),
    accessCount: integer('access_count').default(0),
    lastAccessed: timestamp('last_accessed').defaultNow(),
    cacheKey: varchar('cache_key', { length: 255 }).notNull(),
    cacheVersion: integer('cache_version').default(1),
  },
  table => ({
    accessedIdx: index('idx_cache_accessed').on(table.lastAccessed),
    keyIdx: index('idx_cache_key').on(table.cacheKey),
  })
);

// WebSocket connections tracking
export const connections = pgTable(
  'connections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').references(() => sessions.id, {
      onDelete: 'cascade',
    }),
    socketId: varchar('socket_id', { length: 255 }).unique().notNull(),
    connectedAt: timestamp('connected_at').defaultNow().notNull(),
    disconnectedAt: timestamp('disconnected_at'),
    ipAddress: inet('ip_address'),
    transport: varchar('transport', { length: 20 }), // 'websocket', 'polling'
    clientVersion: varchar('client_version', { length: 20 }),
  },
  table => ({
    userIdx: index('idx_conn_user').on(table.userId),
    socketIdx: index('idx_conn_socket').on(table.socketId),
    activeIdx: index('idx_conn_active').on(table.userId),
  })
);

// ==================== MODERATION TABLES ====================

// Ban history
export const banHistory = pgTable(
  'ban_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    bannedBy: uuid('banned_by').references(() => users.id),
    banType: varchar('ban_type', { length: 20 }).notNull(),
    reason: text('reason').notNull(),
    evidence: jsonb('evidence')
      .$type<{
        gameIds?: string[];
        chatLogs?: string[];
        reportIds?: string[];
      }>()
      .default({}),
    durationHours: integer('duration_hours'),
    bannedAt: timestamp('banned_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at'),
    liftedAt: timestamp('lifted_at'),
    liftedBy: uuid('lifted_by').references(() => users.id),
    liftReason: text('lift_reason'),
  },
  table => ({
    userIdx: index('idx_ban_user').on(table.userId),
    activeIdx: index('idx_ban_active').on(table.userId, table.expiresAt),
  })
);

// Admin actions audit log
export const adminActions = pgTable(
  'admin_actions',
  {
    id: serial('id').primaryKey(),
    adminId: uuid('admin_id')
      .references(() => users.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    targetType: varchar('target_type', { length: 20 }).notNull(),
    targetId: varchar('target_id', { length: 255 }),
    details: jsonb('details'),
    reason: text('reason'),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  table => ({
    adminIdx: index('idx_admin_actions_admin').on(table.adminId),
    timestampIdx: index('idx_admin_actions_timestamp').on(table.timestamp),
    actionIdx: index('idx_admin_actions_action').on(table.action),
  })
);

// System settings
export const systemSettings = pgTable(
  'system_settings',
  {
    key: varchar('key', { length: 100 }).primaryKey(),
    value: jsonb('value').notNull(),
    description: text('description'),
    lastModified: timestamp('last_modified').defaultNow().notNull(),
    modifiedBy: uuid('modified_by').references(() => users.id),
  },
  table => ({
    lastModifiedIdx: index('idx_system_settings_modified').on(
      table.lastModified
    ),
  })
);

// Move buffer for batching
export const moveBuffer = pgTable(
  'move_buffer',
  {
    id: serial('id').primaryKey(),
    gameId: uuid('game_id').notNull(),
    moveData: jsonb('move_data').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    gameIdIdx: index('idx_move_buffer_game_id').on(table.gameId),
    createdAtIdx: index('idx_move_buffer_created_at').on(table.createdAt),
  })
);

// ==================== RELATIONS ====================

export const usersRelations = relations(users, ({ many, one }) => ({
  gamesAsWhite: many(games, { relationName: 'whitePlayer' }),
  gamesAsBlack: many(games, { relationName: 'blackPlayer' }),
  sessions: many(sessions),
  oauthAccounts: many(oauthAccounts),
  presence: one(playerPresence),
  banHistory: many(banHistory, { relationName: 'bannedUser' }),
  adminActions: many(adminActions),
  connections: many(connections),
  matchmakingQueue: many(matchmakingQueue),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  connections: many(connections),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.userId],
    references: [users.id],
  }),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  whitePlayer: one(users, {
    fields: [games.whitePlayerId],
    references: [users.id],
    relationName: 'whitePlayer',
  }),
  blackPlayer: one(users, {
    fields: [games.blackPlayerId],
    references: [users.id],
    relationName: 'blackPlayer',
  }),
  moves: many(moves),
  events: many(gameEvents),
  cache: one(gameCache),
}));

export const movesRelations = relations(moves, ({ one }) => ({
  game: one(games, {
    fields: [moves.gameId],
    references: [games.id],
  }),
}));

export const gameEventsRelations = relations(gameEvents, ({ one }) => ({
  game: one(games, {
    fields: [gameEvents.gameId],
    references: [games.id],
  }),
  player: one(users, {
    fields: [gameEvents.playerId],
    references: [users.id],
  }),
}));

export const playerPresenceRelations = relations(playerPresence, ({ one }) => ({
  user: one(users, {
    fields: [playerPresence.userId],
    references: [users.id],
  }),
  currentGame: one(games, {
    fields: [playerPresence.currentGameId],
    references: [games.id],
  }),
}));

export const connectionsRelations = relations(connections, ({ one }) => ({
  user: one(users, {
    fields: [connections.userId],
    references: [users.id],
  }),
  session: one(sessions, {
    fields: [connections.sessionId],
    references: [sessions.id],
  }),
}));

export const banHistoryRelations = relations(banHistory, ({ one }) => ({
  user: one(users, {
    fields: [banHistory.userId],
    references: [users.id],
    relationName: 'bannedUser',
  }),
  bannedBy: one(users, {
    fields: [banHistory.bannedBy],
    references: [users.id],
    relationName: 'banningAdmin',
  }),
  liftedBy: one(users, {
    fields: [banHistory.liftedBy],
    references: [users.id],
    relationName: 'liftingAdmin',
  }),
}));

export const matchmakingQueueRelations = relations(
  matchmakingQueue,
  ({ one }) => ({
    user: one(users, {
      fields: [matchmakingQueue.userId],
      references: [users.id],
    }),
  })
);

export const gameCacheRelations = relations(gameCache, ({ one }) => ({
  game: one(games, {
    fields: [gameCache.gameId],
    references: [games.id],
  }),
}));

// Type exports for better type safety
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type GameEvent = typeof gameEvents.$inferSelect;
export type NewGameEvent = typeof gameEvents.$inferInsert;
