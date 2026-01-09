import { db } from "./db";
import {
  challenges,
  creatorCoins,
  creatorCoinSettings,
  stakes,
  matches,
  notifications,
  type CreateChallengeRequest,
  type ChallengeResponse,
  type CreatorCoin,
  type InsertCreatorCoin,
  type CreatorCoinSettings,
  type InsertCreatorCoinSettings,
  type Stake,
  type InsertStake,
  type Match,
  type InsertMatch,
  type Notification,
  type InsertNotification
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getChallenges(): Promise<ChallengeResponse[]>;
  getChallenge(id: number): Promise<ChallengeResponse | undefined>;
  getChallengeBySource(source: string, sourceId: string): Promise<ChallengeResponse | undefined>;
  createChallengeIfNotExists(challenge: CreateChallengeRequest): Promise<ChallengeResponse>;
  createChallenge(challenge: CreateChallengeRequest): Promise<ChallengeResponse>;
  updateChallenge(id: number, data: Partial<CreateChallengeRequest> & { escrowTxHash?: string, escrowContractId?: number, tokenAddress?: string }): Promise<ChallengeResponse>;
  
  // Creator Coin methods
  getCreatorCoin(contractAddress: string): Promise<CreatorCoin | undefined>;
  listCreatorCoins(): Promise<CreatorCoin[]>;
  addCreatorCoin(coin: InsertCreatorCoin): Promise<CreatorCoin>;
  getCreatorCoinSettings(username: string): Promise<CreatorCoinSettings | undefined>;
  setCreatorCoinSettings(username: string, coinId: number, enabled: boolean): Promise<CreatorCoinSettings>;
  
  // Stake methods (Phase 3)
  createStake(stake: InsertStake): Promise<Stake>;
  getStake(id: number): Promise<Stake | undefined>;
  getStakesByChallengeId(challengeId: number): Promise<Stake[]>;
  getStakesByUsername(username: string): Promise<Stake[]>;
  findMatchableStake(challengeId: number, side: 'yes' | 'no', amount: number, excludeStakeId?: number): Promise<Stake | undefined>;
  updateStake(id: number, data: Partial<InsertStake>): Promise<Stake>;
  
  // Match methods (Phase 3)
  createMatch(match: InsertMatch): Promise<Match>;
  getMatch(id: number): Promise<Match | undefined>;
  getMatchesByChallengeId(challengeId: number): Promise<Match[]>;
  updateMatch(id: number, data: Partial<InsertMatch>): Promise<Match>;
  
  // Notification methods (Phase 3)
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUsername(username: string, unreadOnly?: boolean): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<Notification>;
}

export class DatabaseStorage implements IStorage {
  async getChallenges(): Promise<ChallengeResponse[]> {
    return await db.select().from(challenges);
  }

  async getChallenge(id: number): Promise<ChallengeResponse | undefined> {
    const [challenge] = await db.select().from(challenges).where(eq(challenges.id, id));
    return challenge;
  }

  async getChallengeBySource(source: string, sourceId: string): Promise<ChallengeResponse | undefined> {
    const [challenge] = await db
      .select()
      .from(challenges)
      .where(and(eq(challenges.source, source), eq(challenges.sourceId, sourceId)));
    return challenge;
  }

  async createChallenge(insertChallenge: CreateChallengeRequest): Promise<ChallengeResponse> {
    const [challenge] = await db.insert(challenges).values(insertChallenge).returning();
    return challenge;
  }

  async createChallengeIfNotExists(insertChallenge: CreateChallengeRequest): Promise<ChallengeResponse> {
    if (insertChallenge.source && insertChallenge.sourceId) {
      const existing = await this.getChallengeBySource(insertChallenge.source, insertChallenge.sourceId);
      if (existing) return existing;
    }
    return this.createChallenge(insertChallenge);
  }

  async updateChallenge(id: number, data: Partial<CreateChallengeRequest> & { escrowTxHash?: string, escrowContractId?: number, tokenAddress?: string }): Promise<ChallengeResponse> {
    const [updated] = await db.update(challenges).set(data as any).where(eq(challenges.id, id)).returning();
    return updated;
  }

  // Creator Coin methods
  async getCreatorCoin(contractAddress: string): Promise<CreatorCoin | undefined> {
    const [coin] = await db.select().from(creatorCoins).where(eq(creatorCoins.contractAddress, contractAddress));
    return coin;
  }

  async listCreatorCoins(): Promise<CreatorCoin[]> {
    return await db.select().from(creatorCoins).where(eq(creatorCoins.isActive, true));
  }

  async addCreatorCoin(coin: InsertCreatorCoin): Promise<CreatorCoin> {
    const [created] = await db.insert(creatorCoins).values(coin).returning();
    return created;
  }

  async getCreatorCoinSettings(username: string): Promise<CreatorCoinSettings | undefined> {
    const [settings] = await db
      .select()
      .from(creatorCoinSettings)
      .where(eq(creatorCoinSettings.username, username));
    return settings;
  }

  async setCreatorCoinSettings(username: string, coinId: number, enabled: boolean): Promise<CreatorCoinSettings> {
    // Try to update first
    const existing = await this.getCreatorCoinSettings(username);
    if (existing) {
      const [updated] = await db
        .update(creatorCoinSettings)
        .set({ creatorCoinId: coinId, isEnabled: enabled })
        .where(eq(creatorCoinSettings.username, username))
        .returning();
      return updated;
    }
    // Insert if not exists
    const [created] = await db
      .insert(creatorCoinSettings)
      .values({ username, creatorCoinId: coinId, isEnabled: enabled })
      .returning();
    return created;
  }

  // === STAKE METHODS (Phase 3) ===
  async createStake(stake: InsertStake): Promise<Stake> {
    const [created] = await db.insert(stakes).values(stake).returning();
    return created;
  }

  async getStake(id: number): Promise<Stake | undefined> {
    const [stake] = await db.select().from(stakes).where(eq(stakes.id, id));
    return stake;
  }

  async getStakesByChallengeId(challengeId: number): Promise<Stake[]> {
    return await db.select().from(stakes).where(eq(stakes.challengeId, challengeId));
  }

  async getStakesByUsername(username: string): Promise<Stake[]> {
    return await db.select().from(stakes).where(eq(stakes.username, username));
  }

  async findMatchableStake(challengeId: number, side: 'yes' | 'no', amount: number, excludeStakeId?: number): Promise<Stake | undefined> {
    // Find an opposite-side stake with matching amount that hasn't been matched yet
    const oppositeSide = side === 'yes' ? 'no' : 'yes';
    let query = db
      .select()
      .from(stakes)
      .where(
        and(
          eq(stakes.challengeId, challengeId),
          eq(stakes.side, oppositeSide),
          eq(stakes.amount, amount),
          eq(stakes.matched, false)
        )
      );
    
    if (excludeStakeId) {
      query = query.where(eq(stakes.id, excludeStakeId));
    }

    const results = await query;
    return results[0];
  }

  async updateStake(id: number, data: Partial<InsertStake>): Promise<Stake> {
    const [updated] = await db.update(stakes).set(data as any).where(eq(stakes.id, id)).returning();
    return updated;
  }

  // === MATCH METHODS (Phase 3) ===
  async createMatch(match: InsertMatch): Promise<Match> {
    const [created] = await db.insert(matches).values(match).returning();
    return created;
  }

  async getMatch(id: number): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }

  async getMatchesByChallengeId(challengeId: number): Promise<Match[]> {
    return await db.select().from(matches).where(eq(matches.challengeId, challengeId));
  }

  async updateMatch(id: number, data: Partial<InsertMatch>): Promise<Match> {
    const [updated] = await db.update(matches).set(data as any).where(eq(matches.id, id)).returning();
    return updated;
  }

  // === NOTIFICATION METHODS (Phase 3) ===
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async getNotificationsByUsername(username: string, unreadOnly: boolean = false): Promise<Notification[]> {
    if (unreadOnly) {
      return await db.select().from(notifications).where(and(eq(notifications.username, username), eq(notifications.read, false)));
    }
    return await db.select().from(notifications).where(eq(notifications.username, username));
  }

  async markNotificationRead(id: number): Promise<Notification> {
    const [updated] = await db.update(notifications).set({ read: true }).where(eq(notifications.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
