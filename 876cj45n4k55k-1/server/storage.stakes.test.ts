import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { storage } from '../storage';
import type { CreateChallengeRequest } from '@shared/schema';

describe('Stakes & Matching - Storage Layer', () => {
  let challengeId: number;

  beforeEach(async () => {
    // Create a test challenge
    const challenge = await storage.createChallenge({
      challenger: '@alice',
      opponent: '@bob',
      name: 'Test Challenge',
      amount: 100,
      currency: 'USDC',
      status: 'active',
    } as CreateChallengeRequest);
    challengeId = challenge.id;
  });

  describe('Stake Creation', () => {
    it('should create a YES stake', async () => {
      const stake = await storage.createStake({
        challengeId,
        username: '@alice',
        side: 'yes',
        amount: 100,
        matched: false,
      } as any);

      expect(stake.id).toBeDefined();
      expect(stake.challengeId).toBe(challengeId);
      expect(stake.username).toBe('@alice');
      expect(stake.side).toBe('yes');
      expect(stake.amount).toBe(100);
      expect(stake.matched).toBe(false);
    });

    it('should create a NO stake', async () => {
      const stake = await storage.createStake({
        challengeId,
        username: '@bob',
        side: 'no',
        amount: 100,
        matched: false,
      } as any);

      expect(stake.side).toBe('no');
      expect(stake.username).toBe('@bob');
    });

    it('should track source (web vs comment)', async () => {
      const webStake = await storage.createStake({
        challengeId,
        username: '@alice',
        side: 'yes',
        amount: 100,
        source: 'web',
        matched: false,
      } as any);

      const commentStake = await storage.createStake({
        challengeId,
        username: '@bob',
        side: 'no',
        amount: 100,
        source: 'comment',
        sourceId: 'tweet-123',
        matched: false,
      } as any);

      expect(webStake.source).toBe('web');
      expect(commentStake.source).toBe('comment');
      expect(commentStake.sourceId).toBe('tweet-123');
    });
  });

  describe('Stake Retrieval', () => {
    it('should get a single stake by ID', async () => {
      const created = await storage.createStake({
        challengeId,
        username: '@alice',
        side: 'yes',
        amount: 100,
        matched: false,
      } as any);

      const retrieved = await storage.getStake(created.id);
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.username).toBe('@alice');
    });

    it('should list all stakes for a challenge', async () => {
      await storage.createStake({
        challengeId,
        username: '@alice',
        side: 'yes',
        amount: 100,
        matched: false,
      } as any);

      await storage.createStake({
        challengeId,
        username: '@bob',
        side: 'no',
        amount: 100,
        matched: false,
      } as any);

      const stakes = await storage.getStakesByChallengeId(challengeId);
      expect(stakes.length).toBe(2);
      expect(stakes[0].side).toBe('yes');
      expect(stakes[1].side).toBe('no');
    });

    it('should list all stakes by username', async () => {
      await storage.createStake({
        challengeId,
        username: '@alice',
        side: 'yes',
        amount: 100,
        matched: false,
      } as any);

      await storage.createStake({
        challengeId,
        username: '@alice',
        side: 'no',
        amount: 50,
        matched: false,
      } as any);

      const stakes = await storage.getStakesByUsername('@alice');
      expect(stakes.length).toBeGreaterThanOrEqual(2);
      expect(stakes.every(s => s.username === '@alice')).toBe(true);
    });
  });

  describe('Stake Matching', () => {
    it('should find a matchable stake with opposite side and same amount', async () => {
      const yesStake = await storage.createStake({
        challengeId,
        username: '@alice',
        side: 'yes',
        amount: 100,
        matched: false,
      } as any);

      const noStake = await storage.createStake({
        challengeId,
        username: '@bob',
        side: 'no',
        amount: 100,
        matched: false,
      } as any);

      const matchable = await storage.findMatchableStake(challengeId, 'yes', 100, yesStake.id);
      expect(matchable?.id).toBe(noStake.id);
      expect(matchable?.side).toBe('no');
    });

    it('should not match stakes with same side', async () => {
      await storage.createStake({
        challengeId,
        username: '@alice',
        side: 'yes',
        amount: 100,
        matched: false,
      } as any);

      await storage.createStake({
        challengeId,
        username: '@bob',
        side: 'yes', // same side!
        amount: 100,
        matched: false,
      } as any);

      const matchable = await storage.findMatchableStake(challengeId, 'yes', 100);
      expect(matchable).toBeUndefined();
    });

    it('should not match stakes with different amounts', async () => {
      await storage.createStake({
        challengeId,
        username: '@alice',
        side: 'yes',
        amount: 100,
        matched: false,
      } as any);

      await storage.createStake({
        challengeId,
        username: '@bob',
        side: 'no',
        amount: 50, // different amount!
        matched: false,
      } as any);

      const matchable = await storage.findMatchableStake(challengeId, 'yes', 100);
      expect(matchable).toBeUndefined();
    });

    it('should not match already-matched stakes', async () => {
      await storage.createStake({
        challengeId,
        username: '@alice',
        side: 'yes',
        amount: 100,
        matched: true, // already matched!
      } as any);

      await storage.createStake({
        challengeId,
        username: '@bob',
        side: 'no',
        amount: 100,
        matched: false,
      } as any);

      const matchable = await storage.findMatchableStake(challengeId, 'yes', 100);
      expect(matchable).toBeUndefined();
    });

    it('should update stake to mark as matched', async () => {
      const stake = await storage.createStake({
        challengeId,
        username: '@alice',
        side: 'yes',
        amount: 100,
        matched: false,
      } as any);

      await storage.updateStake(stake.id, {
        matched: true,
        matchedWith: '@bob',
      });

      const updated = await storage.getStake(stake.id);
      expect(updated?.matched).toBe(true);
      expect(updated?.matchedWith).toBe('@bob');
    });
  });

  describe('Match Creation', () => {
    it('should create a match between two stakes', async () => {
      const yesStake = await storage.createStake({
        challengeId,
        username: '@alice',
        side: 'yes',
        amount: 100,
        matched: false,
      } as any);

      const noStake = await storage.createStake({
        challengeId,
        username: '@bob',
        side: 'no',
        amount: 100,
        matched: false,
      } as any);

      const match = await storage.createMatch({
        challengeId,
        yesStakeId: yesStake.id,
        noStakeId: noStake.id,
        escrowId: 123,
        escrowTxHash: '0xabc123',
      } as any);

      expect(match.id).toBeDefined();
      expect(match.yesStakeId).toBe(yesStake.id);
      expect(match.noStakeId).toBe(noStake.id);
      expect(match.settled).toBe(false);
    });
  });

  describe('Match Retrieval', () => {
    it('should get a single match by ID', async () => {
      const yesStake = await storage.createStake({
        challengeId,
        username: '@alice',
        side: 'yes',
        amount: 100,
        matched: false,
      } as any);

      const noStake = await storage.createStake({
        challengeId,
        username: '@bob',
        side: 'no',
        amount: 100,
        matched: false,
      } as any);

      const created = await storage.createMatch({
        challengeId,
        yesStakeId: yesStake.id,
        noStakeId: noStake.id,
      } as any);

      const retrieved = await storage.getMatch(created.id);
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.yesStakeId).toBe(yesStake.id);
    });

    it('should list all matches for a challenge', async () => {
      const yesStake = await storage.createStake({
        challengeId,
        username: '@alice',
        side: 'yes',
        amount: 100,
        matched: false,
      } as any);

      const noStake = await storage.createStake({
        challengeId,
        username: '@bob',
        side: 'no',
        amount: 100,
        matched: false,
      } as any);

      await storage.createMatch({
        challengeId,
        yesStakeId: yesStake.id,
        noStakeId: noStake.id,
      } as any);

      const matches = await storage.getMatchesByChallengeId(challengeId);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Notification Creation', () => {
    it('should create a notification', async () => {
      const notification = await storage.createNotification({
        username: '@alice',
        type: 'matched',
        challengeId,
        title: 'Challenge Matched!',
        message: 'Your stake has been matched.',
      } as any);

      expect(notification.id).toBeDefined();
      expect(notification.username).toBe('@alice');
      expect(notification.type).toBe('matched');
      expect(notification.read).toBe(false);
    });

    it('should list notifications for a user', async () => {
      await storage.createNotification({
        username: '@alice',
        type: 'matched',
        challengeId,
        title: 'Match 1',
        message: 'Stake matched.',
      } as any);

      await storage.createNotification({
        username: '@alice',
        type: 'settled',
        challengeId,
        title: 'Match 2',
        message: 'Challenge settled.',
      } as any);

      const notifications = await storage.getNotificationsByUsername('@alice');
      expect(notifications.length).toBeGreaterThanOrEqual(2);
      expect(notifications.every(n => n.username === '@alice')).toBe(true);
    });

    it('should filter unread notifications', async () => {
      const notification = await storage.createNotification({
        username: '@alice',
        type: 'matched',
        challengeId,
        title: 'Challenge Matched!',
        message: 'Your stake has been matched.',
      } as any);

      const unreadBefore = await storage.getNotificationsByUsername('@alice', true);
      const hasUnread = unreadBefore.some(n => n.id === notification.id && !n.read);
      expect(hasUnread).toBe(true);

      await storage.markNotificationRead(notification.id);

      const unreadAfter = await storage.getNotificationsByUsername('@alice', true);
      const stillUnread = unreadAfter.some(n => n.id === notification.id && !n.read);
      expect(stillUnread).toBe(false);
    });

    it('should mark notification as read', async () => {
      const notification = await storage.createNotification({
        username: '@alice',
        type: 'matched',
        challengeId,
        title: 'Challenge Matched!',
        message: 'Your stake has been matched.',
      } as any);

      const updated = await storage.markNotificationRead(notification.id);
      expect(updated.read).toBe(true);
    });
  });
});
