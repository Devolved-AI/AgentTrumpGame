import { pgTable, serial, text, integer, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Player scores table
export const playerScores = pgTable('player_scores', {
  id: serial('id').primaryKey(),
  address: varchar('address', { length: 42 }).notNull().unique(),
  persuasionScore: integer('persuasion_score').notNull().default(50),
  lastUpdated: timestamp('last_updated').defaultNow()
});

// Player responses table
export const playerResponses = pgTable('player_responses', {
  id: serial('id').primaryKey(),
  address: varchar('address', { length: 42 }).notNull(),
  response: text('response').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
  blockNumber: integer('block_number').notNull(),
  transactionHash: varchar('transaction_hash', { length: 66 }),
  exists: boolean('exists').default(true)
});

// Create insert schemas with proper Zod validation
export const insertPlayerScoreSchema = createInsertSchema(playerScores).extend({
  address: z.string().length(42),
  persuasionScore: z.number().min(0).max(100)
});

export const insertPlayerResponseSchema = createInsertSchema(playerResponses);

// Create insert types
export type InsertPlayerScore = typeof playerScores.$inferInsert;
export type InsertPlayerResponse = typeof playerResponses.$inferInsert;

// Create select types
export type PlayerScore = typeof playerScores.$inferSelect;
export type PlayerResponse = typeof playerResponses.$inferSelect;