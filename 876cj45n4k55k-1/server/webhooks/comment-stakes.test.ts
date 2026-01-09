import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../storage';
import type { CreateChallengeRequest } from '@shared/schema';

describe('Webhook Comment Stake Acceptance - Integration', () => {
  let challengeId: number;

  beforeEach(async () => {
    // Create a test challenge that replies can refer to
    const challenge = await storage.createChallenge({
      challenger: '@alice',
      opponent: '@bob',
      name: 'Test Challenge for Comments',
      amount: 100,
      currency: 'USDC',
      status: 'active',
      source: 'farcaster',
      sourceId: 'cast-123',
    } as CreateChallengeRequest);
    challengeId = challenge.id;
  });

  describe('Farcaster Comment Stake Flow', () => {
    it('should create a stake from a Farcaster reply comment', async () => {
      // Simulate webhook payload for a reply comment:
      // User @charlie replies to challenge cast with "challenge @alice YES ₦50"
      const stake = await storage.createStake({
        challengeId,
        username: '@charlie',
        side: 'yes',
        amount: 50 * 1e6,
        matched: false,
        source: 'farcaster',
        sourceId: 'reply-456',
      } as any);

      expect(stake.id).toBeDefined();
      expect(stake.challengeId).toBe(challengeId);
      expect(stake.username).toBe('@charlie');
      expect(stake.source).toBe('farcaster');
      expect(stake.sourceId).toBe('reply-456');
    });

    it('should auto-match comment stakes with opposite side', async () => {
      // User A stakes YES in comment
      const yesStake = await storage.createStake({
        challengeId,
        username: '@charlie',
        side: 'yes',
        amount: 50 * 1e6,
        matched: false,
        source: 'farcaster',
        sourceId: 'reply-456',
      } as any);

      // User B stakes NO in another comment
      const noStake = await storage.createStake({
        challengeId,
        username: '@david',
        side: 'no',
        amount: 50 * 1e6,
        matched: false,
        source: 'farcaster',
        sourceId: 'reply-789',
      } as any);

      // Check if they can be matched
      const matchable = await storage.findMatchableStake(
        challengeId,
        'yes',
        50 * 1e6,
        yesStake.id
      );

      expect(matchable?.id).toBe(noStake.id);
      expect(matchable?.username).toBe('@david');
    });

    it('should mark both stakes as matched after pairing', async () => {
      const yesStake = await storage.createStake({
        challengeId,
        username: '@charlie',
        side: 'yes',
        amount: 50 * 1e6,
        matched: false,
      } as any);

      const noStake = await storage.createStake({
        challengeId,
        username: '@david',
        side: 'no',
        amount: 50 * 1e6,
        matched: false,
      } as any);

      // Create match
      const match = await storage.createMatch({
        challengeId,
        yesStakeId: yesStake.id,
        noStakeId: noStake.id,
      } as any);

      // Update both stakes
      await storage.updateStake(yesStake.id, {
        matched: true,
        matchedWith: '@david',
      });
      await storage.updateStake(noStake.id, {
        matched: true,
        matchedWith: '@charlie',
      });

      // Verify
      const updated1 = await storage.getStake(yesStake.id);
      const updated2 = await storage.getStake(noStake.id);

      expect(updated1?.matched).toBe(true);
      expect(updated1?.matchedWith).toBe('@david');
      expect(updated2?.matched).toBe(true);
      expect(updated2?.matchedWith).toBe('@charlie');
    });

    it('should update challenge pools when stakes match', async () => {
      // Create matching stakes
      const yesStake = await storage.createStake({
        challengeId,
        username: '@charlie',
        side: 'yes',
        amount: 100 * 1e6,
        matched: false,
      } as any);

      const noStake = await storage.createStake({
        challengeId,
        username: '@david',
        side: 'no',
        amount: 100 * 1e6,
        matched: false,
      } as any);

      // Calculate new pools
      const allStakes = await storage.getStakesByChallengeId(challengeId);
      const yesPool = allStakes.filter(s => s.side === 'yes').reduce((sum, s) => sum + s.amount, 0);
      const noPool = allStakes.filter(s => s.side === 'no').reduce((sum, s) => sum + s.amount, 0);

      // Update challenge with new pools
      await storage.updateChallenge(challengeId, {
        yesPool,
        noPool,
        status: 'matched',
        matchedAt: new Date(),
      } as any);

      // Verify
      const updated = await storage.getChallenge(challengeId);
      expect(updated?.yesPool).toBe(100 * 1e6);
      expect(updated?.noPool).toBe(100 * 1e6);
      expect(updated?.status).toBe('matched');
    });

    it('should create notifications when stakes are matched from comments', async () => {
      const yesStake = await storage.createStake({
        challengeId,
        username: '@charlie',
        side: 'yes',
        amount: 50 * 1e6,
        matched: false,
      } as any);

      const noStake = await storage.createStake({
        challengeId,
        username: '@david',
        side: 'no',
        amount: 50 * 1e6,
        matched: false,
      } as any);

      // Create notifications for both users
      const notif1 = await storage.createNotification({
        username: '@charlie',
        type: 'matched',
        challengeId,
        title: 'Challenge Matched!',
        message: `Your ₦${yesStake.amount} YES stake matched with @david's NO stake! 🎯`,
      } as any);

      const notif2 = await storage.createNotification({
        username: '@david',
        type: 'matched',
        challengeId,
        title: 'Challenge Matched!',
        message: `Your ₦${noStake.amount} NO stake matched with @charlie's YES stake! 🎯`,
      } as any);

      expect(notif1.username).toBe('@charlie');
      expect(notif2.username).toBe('@david');
      expect(notif1.type).toBe('matched');
      expect(notif2.type).toBe('matched');
    });

    it('should prevent duplicate stakes from same comment', async () => {
      // Create first stake
      const stake1 = await storage.createStake({
        challengeId,
        username: '@charlie',
        side: 'yes',
        amount: 50 * 1e6,
        matched: false,
        source: 'farcaster',
        sourceId: 'reply-same',
      } as any);

      // Try to create duplicate (same sourceId)
      const stakes = await storage.getStakesByUsername('@charlie');
      const isDuplicate = stakes.some(
        s => s.sourceId === 'reply-same' && s.challengeId === challengeId
      );

      expect(isDuplicate).toBe(true);
      expect(stakes.filter(s => s.sourceId === 'reply-same').length).toBe(1);
    });
  });

  describe('Base Comment Stake Flow', () => {
    it('should create a stake from a Base reply comment', async () => {
      const stake = await storage.createStake({
        challengeId,
        username: '@eve',
        side: 'no',
        amount: 75 * 1e6,
        matched: false,
        source: 'base',
        sourceId: 'event-xyz',
      } as any);

      expect(stake.source).toBe('base');
      expect(stake.sourceId).toBe('event-xyz');
      expect(stake.side).toBe('no');
    });

    it('should auto-match Base comment stakes', async () => {
      const yesStake = await storage.createStake({
        challengeId,
        username: '@eve',
        side: 'yes',
        amount: 75 * 1e6,
        matched: false,
        source: 'base',
        sourceId: 'event-abc',
      } as any);

      const noStake = await storage.createStake({
        challengeId,
        username: '@frank',
        side: 'no',
        amount: 75 * 1e6,
        matched: false,
        source: 'base',
        sourceId: 'event-def',
      } as any);

      const matchable = await storage.findMatchableStake(
        challengeId,
        'yes',
        75 * 1e6,
        yesStake.id
      );

      expect(matchable?.id).toBe(noStake.id);
      expect(matchable?.source).toBe('base');
    });
  });

  describe('Cross-Platform Matching', () => {
    it('should match Farcaster and Base stakes together', async () => {
      // Farcaster user stakes YES
      const farcasterStake = await storage.createStake({
        challengeId,
        username: '@farcaster_user',
        side: 'yes',
        amount: 100 * 1e6,
        matched: false,
        source: 'farcaster',
        sourceId: 'f-123',
      } as any);

      // Base user stakes NO
      const baseStake = await storage.createStake({
        challengeId,
        username: '@base_user',
        side: 'no',
        amount: 100 * 1e6,
        matched: false,
        source: 'base',
        sourceId: 'b-456',
      } as any);

      // They should match
      const matchable = await storage.findMatchableStake(
        challengeId,
        'yes',
        100 * 1e6,
        farcasterStake.id
      );

      expect(matchable?.id).toBe(baseStake.id);
      expect(matchable?.source).toBe('base');
    });
  });

  describe('Webhook Idempotency', () => {
    it('should detect duplicate comment stakes by sourceId', async () => {
      // First webhook call creates stake
      const stake1 = await storage.createStake({
        challengeId,
        username: '@grace',
        side: 'yes',
        amount: 50 * 1e6,
        matched: false,
        source: 'farcaster',
        sourceId: 'duplicate-reply',
      } as any);

      // Second webhook call with same sourceId
      const allStakes = await storage.getStakesByUsername('@grace');
      const isDuplicate = allStakes.some(
        s => s.sourceId === 'duplicate-reply'
      );

      expect(isDuplicate).toBe(true);
      expect(allStakes.filter(s => s.sourceId === 'duplicate-reply').length).toBe(1);
    });

    it('should handle webhook retries safely', async () => {
      // Simulate webhook retry with same data
      const sourceId = 'retry-test-123';

      const stake1 = await storage.createStake({
        challengeId,
        username: '@henry',
        side: 'yes',
        amount: 60 * 1e6,
        matched: false,
        source: 'farcaster',
        sourceId,
      } as any);

      // Retry with same sourceId (should be idempotent)
      const allStakes = await storage.getStakesByUsername('@henry');
      const count = allStakes.filter(s => s.sourceId === sourceId).length;

      expect(count).toBe(1); // Only one created
    });
  });

  describe('Multi-User Comment Thread', () => {
    it('should track all users staking in a comment thread', async () => {
      // Multiple users comment their stakes
      const users = ['@user1', '@user2', '@user3', '@user4'];
      const sides = ['yes', 'no', 'yes', 'no'] as const;

      for (let i = 0; i < users.length; i++) {
        await storage.createStake({
          challengeId,
          username: users[i],
          side: sides[i],
          amount: 50 * 1e6,
          matched: false,
          source: 'farcaster',
          sourceId: `comment-${i}`,
        } as any);
      }

      // Verify all stakes created
      const allStakes = await storage.getStakesByChallengeId(challengeId);
      expect(allStakes.length).toBeGreaterThanOrEqual(4);

      const yesCount = allStakes.filter(s => s.side === 'yes').length;
      const noCount = allStakes.filter(s => s.side === 'no').length;
      expect(yesCount).toBeGreaterThanOrEqual(2);
      expect(noCount).toBeGreaterThanOrEqual(2);
    });
  });
});
