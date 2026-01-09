import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  challenger: text("challenger").notNull(), // @username
  opponent: text("opponent").notNull(),     // @username
  name: text("name").notNull().default(""), // challenge title / description
  type: text("type").notNull().default("p2p"), // "p2p" or "crowd"
  amount: integer("amount").notNull(),      // amount (stored in minor units, e.g., USDC = 6 decimals)
  currency: text("currency").notNull().default("USDC"),
  tokenAddress: text("token_address"), // optional token contract address for on-chain (escrow token)
  settlementToken: text("settlement_token"), // optional creator coin contract address for settlement
  isYes: boolean("is_yes").default(true),
  status: text("status").notNull().default("active"), // active, escrowed, settled
  yesPool: integer("yes_pool").default(0),
  noPool: integer("no_pool").default(0),
  escrowTxHash: text("escrow_tx_hash"),
  escrowContractId: integer("escrow_contract_id"),
  matcherAddress: text("matcher_address"),
  matchedTxHash: text("matched_tx_hash"),
  matchedAt: timestamp("matched_at"),
  nftTxHash: text("nft_tx_hash"),
  nftTokenId: integer("nft_token_id"),
  source: text("source").notNull().default("web"), // 'web' | 'farcaster' | 'base'
  sourceId: text("source_id"),
  sourcePayload: text("source_payload"),
  isAutomated: boolean("is_automated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const creatorCoins = pgTable("creator_coins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // "JAN", "DEGEN", etc.
  contractAddress: text("contract_address").notNull().unique(), // 0x...
  decimals: integer("decimals").notNull(), // 6, 18, etc.
  dexAddress: text("dex_address"), // Uniswap/Aerodrome pool address (optional)
  chainId: integer("chain_id").notNull().default(8453), // Base mainnet
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const creatorCoinSettings = pgTable("creator_coin_settings", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(), // @creator handle
  creatorCoinId: integer("creator_coin_id").notNull(), // FK to creatorCoins
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// === PHASE 3: ACCEPTANCE & MATCHING ===
// Tracks each user's stake on a challenge (YES or NO side)
export const stakes = pgTable("stakes", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id").notNull(), // FK to challenges
  username: text("username").notNull(), // @username who staked
  side: text("side").notNull(), // "yes" or "no"
  amount: integer("amount").notNull(), // amount in minor units (USDC = wei)
  escrowId: integer("escrow_id"), // EscrowERC20.id from smart contract
  escrowTxHash: text("escrow_tx_hash"), // transaction hash of escrow creation/match
  escrowAddress: text("escrow_address"), // EscrowERC20 contract address on Base testnet
  matched: boolean("matched").default(false), // true when matched with counterparty
  matchedWith: text("matched_with"), // username of counterparty (if matched)
  settled: boolean("settled").default(false), // true when settlement happens
  winner: boolean("winner").default(false), // true if this stake won
  source: text("source").notNull().default("web"), // 'web' | 'comment' | 'farcaster'
  sourceId: text("source_id"), // comment ID, Farcaster cast ID, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tracks which YES and NO stakes are matched together
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id").notNull(), // FK to challenges
  yesStakeId: integer("yes_stake_id").notNull(), // FK to stakes (side='yes')
  noStakeId: integer("no_stake_id").notNull(), // FK to stakes (side='no')
  escrowId: integer("escrow_id"), // Smart contract escrow ID
  escrowTxHash: text("escrow_tx_hash"), // tx hash of matchEscrowERC20 call
  settled: boolean("settled").default(false), // true when settlement completes
  winner: text("winner"), // username of winner
  settlementTxHash: text("settlement_tx_hash"), // tx hash of settleEscrowERC20 call
  createdAt: timestamp("created_at").defaultNow(),
  settledAt: timestamp("settled_at"),
});

// Tracks notifications to users
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(), // recipient
  type: text("type").notNull(), // 'challenge_created', 'matched', 'settled', 'won', etc.
  challengeId: integer("challenge_id"), // FK to challenges (optional)
  matchId: integer("match_id"), // FK to matches (optional)
  stakeId: integer("stake_id"), // FK to stakes (optional)
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leaderboard = pgTable("leaderboard", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  points: integer("points").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  totalBets: integer("total_bets").notNull().default(0),
});

// === BASE SCHEMAS ===
export const insertChallengeSchema = createInsertSchema(challenges).omit({ id: true, createdAt: true });
export const insertCreatorCoinSchema = createInsertSchema(creatorCoins).omit({ id: true, createdAt: true });
export const insertCreatorCoinSettingsSchema = createInsertSchema(creatorCoinSettings).omit({ id: true, createdAt: true });
export const insertStakeSchema = createInsertSchema(stakes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMatchSchema = createInsertSchema(matches).omit({ id: true, createdAt: true, settledAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertLeaderboardSchema = createInsertSchema(leaderboard).omit({ id: true });

// === EXPLICIT API CONTRACT TYPES ===
export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;

export type CreatorCoin = typeof creatorCoins.$inferSelect;
export type InsertCreatorCoin = z.infer<typeof insertCreatorCoinSchema>;

export type CreatorCoinSettings = typeof creatorCoinSettings.$inferSelect;
export type InsertCreatorCoinSettings = z.infer<typeof insertCreatorCoinSettingsSchema>;

export type Stake = typeof stakes.$inferSelect;
export type InsertStake = z.infer<typeof insertStakeSchema>;

export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type LeaderboardEntry = typeof leaderboard.$inferSelect;

export type CreateChallengeRequest = InsertChallenge;
export type UpdateChallengeRequest = Partial<InsertChallenge>;

export type ChallengeResponse = Challenge;
export type ChallengesListResponse = Challenge[];

export type LeaderboardResponse = LeaderboardEntry[];
