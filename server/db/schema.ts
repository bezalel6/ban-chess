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
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    username: varchar('username', { length: 50 }).unique().notNull(),
    email: varchar('email', { length: 255 }).unique(),
    rating: integer('rating').default(1500).notNull(),
    gamesPlayed: integer('games_played').default(0).notNull(),
    gamesWon: integer('games_won').default(0).notNull(),
    gamesLost: integer('games_lost').default(0).notNull(),
    gamesDrawn: integer('games_drawn').default(0).notNull(),
    role: varchar('role', { length: 20 }).default('player').notNull(), // 'player', 'moderator', 'admin', 'super_admin'
    isActive: boolean('is_active').default(true).notNull(),
    bannedUntil: timestamp('banned_until'), // For temporary bans
    banReason: text('ban_reason'), // Reason for ban
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
  },
  table => ({
    usernameIdx: index('idx_users_username').on(table.username),
    ratingIdx: index('idx_users_rating').on(table.rating),
    roleIdx: index('idx_users_role').on(table.role),
    activeIdx: index('idx_users_active').on(table.isActive),
  })
);

// Games table
export const games = pgTable(
  'games',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    whitePlayerId: uuid('white_player_id').references(() => users.id),
    blackPlayerId: uuid('black_player_id').references(() => users.id),
    pgn: text('pgn'),
    fenInitial: varchar('fen_initial', { length: 150 }).default(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 b:ban'
    ),
    fenFinal: varchar('fen_final', { length: 100 }),
    result: varchar('result', { length: 10 }), // '1-0', '0-1', '1/2-1/2', '*'
    timeControl: jsonb('time_control').$type<{
      initial: number;
      increment: number;
    }>(),
    isSoloGame: boolean('is_solo_game').default(false).notNull(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    totalMoves: integer('total_moves').default(0).notNull(),
    totalBans: integer('total_bans').default(0).notNull(),
    // Ban Chess specific fields
    banMoves: jsonb('ban_moves').$type<string[]>().default([]), // Array of banned moves in UCI format
    finalPosition:
      jsonb('final_position').$type<
        Record<string, string | number | boolean>
      >(), // Store final board state
  },
  table => ({
    whitePlayerIdx: index('idx_games_white_player').on(table.whitePlayerId),
    blackPlayerIdx: index('idx_games_black_player').on(table.blackPlayerId),
    startedAtIdx: index('idx_games_started_at').on(table.startedAt),
    completedAtIdx: index('idx_games_completed_at').on(table.completedAt),
    resultIdx: index('idx_games_result').on(table.result),
  })
);

// Moves table - stores individual moves for analysis
export const moves = pgTable(
  'moves',
  {
    id: serial('id').primaryKey(),
    gameId: uuid('game_id')
      .references(() => games.id, { onDelete: 'cascade' })
      .notNull(),
    moveNumber: integer('move_number').notNull(),
    color: varchar('color', { length: 5 }).notNull(), // 'white' or 'black'
    notation: varchar('notation', { length: 10 }).notNull(), // SAN notation
    uci: varchar('uci', { length: 10 }), // UCI notation (e2e4)
    fenAfter: varchar('fen_after', { length: 100 }).notNull(),
    clockWhite: integer('clock_white'), // Remaining time in seconds
    clockBlack: integer('clock_black'),
    isBan: boolean('is_ban').default(false).notNull(),
    evaluation: real('evaluation'), // Computer evaluation if analyzed
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

// Move buffer table - temporary storage for batching
export const moveBuffer = pgTable(
  'move_buffer',
  {
    id: serial('id').primaryKey(),
    gameId: uuid('game_id').notNull(),
    moveData: jsonb('move_data').notNull(), // Stores the move object
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    gameIdIdx: index('idx_move_buffer_game_id').on(table.gameId),
    createdAtIdx: index('idx_move_buffer_created_at').on(table.createdAt),
  })
);

// Game events table - stores all game events for replay
export const gameEvents = pgTable(
  'game_events',
  {
    id: serial('id').primaryKey(),
    gameId: uuid('game_id')
      .references(() => games.id, { onDelete: 'cascade' })
      .notNull(),
    eventType: varchar('event_type', { length: 50 }).notNull(), // 'move', 'ban', 'resignation', 'timeout', etc.
    eventData: jsonb('event_data').notNull(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  table => ({
    gameIdIdx: index('idx_game_events_game_id').on(table.gameId),
    timestampIdx: index('idx_game_events_timestamp').on(table.timestamp),
  })
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  gamesAsWhite: many(games, { relationName: 'whitePlayer' }),
  gamesAsBlack: many(games, { relationName: 'blackPlayer' }),
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
}));

// Admin actions table - audit log for admin activities
export const adminActions = pgTable(
  'admin_actions',
  {
    id: serial('id').primaryKey(),
    adminId: uuid('admin_id')
      .references(() => users.id)
      .notNull(),
    action: varchar('action', { length: 50 }).notNull(), // 'ban_user', 'unban_user', 'delete_game', 'modify_user', etc.
    targetType: varchar('target_type', { length: 20 }).notNull(), // 'user', 'game', 'system'
    targetId: varchar('target_id', { length: 255 }), // ID of affected entity
    details: jsonb('details'), // Additional action details
    reason: text('reason'), // Reason for the action
    timestamp: timestamp('timestamp').defaultNow().notNull(),
  },
  table => ({
    adminIdx: index('idx_admin_actions_admin').on(table.adminId),
    timestampIdx: index('idx_admin_actions_timestamp').on(table.timestamp),
    actionIdx: index('idx_admin_actions_action').on(table.action),
  })
);

// System settings table - for configurable platform settings
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
