import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { storage } from '../storage';

async function setupApp() {
  const app = express();
  const http = createServer(app);
  app.use(express.json());
  await registerRoutes(http, app);
  return app;
}

describe('webhook stake acceptance (comments)', () => {
  it('should create a stake from a Farcaster reply and auto-match with existing stake', async () => {
    const app = await setupApp();

    // Create a challenge that originated from a Farcaster cast
    const challenge = await storage.createChallengeIfNotExists({
      challenger: '@creator',
      opponent: '@opponent',
      name: 'Reply Match Test',
      amount: 100000000,
      currency: 'USDC',
      source: 'farcaster',
      sourceId: 'cast-1',
      status: 'active',
    } as any);

    // Pre-create a NO stake to be matched
    const existingNoStake = await storage.createStake({
      challengeId: challenge.id,
      username: '@bob',
      side: 'no',
      amount: 100000000,
      matched: false,
      source: 'web',
    } as any);

    // Post a reply that places a YES stake
    const res = await request(app)
      .post('/webhooks/farcaster')
      .send({ castId: 'reply-1', author: 'alice', text: 'challenge @bob YES ₦100', parentCastId: 'cast-1' });

    expect(res.status).toBe(201);

    // Verify match created
    const matches = await storage.getMatchesByChallengeId(challenge.id);
    expect(matches.length).toBeGreaterThanOrEqual(1);

    // Verify stakes updated
    const stakes = await storage.getStakesByChallengeId(challenge.id);
    const created = stakes.find(s => s.source === 'farcaster' && s.sourceId === 'reply-1');
    expect(created).toBeDefined();
    expect(created?.matched).toBe(true);

    const opponentStake = stakes.find(s => s.username === '@bob');
    expect(opponentStake).toBeDefined();
    expect(opponentStake?.matched).toBe(true);

    // Notifications for both users
    const notifsAlice = await storage.getNotificationsByUsername('@alice');
    const notifsBob = await storage.getNotificationsByUsername('@bob');
    expect(notifsAlice.length).toBeGreaterThanOrEqual(1);
    expect(notifsBob.length).toBeGreaterThanOrEqual(1);
  });

  it('should not process the same Farcaster reply twice (idempotent)', async () => {
    const app = await setupApp();

    // Create a challenge
    const challenge = await storage.createChallengeIfNotExists({
      challenger: '@creator2',
      opponent: '@opponent2',
      name: 'Reply Idempotency Test',
      amount: 50000000,
      currency: 'USDC',
      source: 'farcaster',
      sourceId: 'cast-2',
      status: 'active',
    } as any);

    // First processing
    const res1 = await request(app)
      .post('/webhooks/farcaster')
      .send({ castId: 'reply-2', author: 'charlie', text: 'challenge @opponent2 YES ₦50', parentCastId: 'cast-2' });
    expect(res1.status).toBe(201);

    // Replay same webhook
    const res2 = await request(app)
      .post('/webhooks/farcaster')
      .send({ castId: 'reply-2', author: 'charlie', text: 'challenge @opponent2 YES ₦50', parentCastId: 'cast-2' });
    // The second time should return 200 'Already processed'
    expect(res2.status).toBe(200);
    expect(res2.body.message).toBeDefined();
  });

  it('should create a stake from a Base reply and auto-match', async () => {
    const app = await setupApp();

    // Create a challenge from base
    const challenge = await storage.createChallengeIfNotExists({
      challenger: '@creator3',
      opponent: '@opponent3',
      name: 'Base Reply Match Test',
      amount: 200000000,
      currency: 'USDC',
      source: 'base',
      sourceId: 'event-1',
      status: 'active',
    } as any);

    // Pre-create a YES stake to be matched by the base reply
    const existingYes = await storage.createStake({
      challengeId: challenge.id,
      username: '@alice',
      side: 'yes',
      amount: 200000000,
      matched: false,
      source: 'web',
    } as any);

    const res = await request(app)
      .post('/webhooks/base')
      .send({ eventId: 'reply-base-1', user: 'bob', text: 'challenge @alice NO 200', parentEventId: 'event-1' });

    expect(res.status).toBe(201);

    const matches = await storage.getMatchesByChallengeId(challenge.id);
    expect(matches.length).toBeGreaterThanOrEqual(1);

    const stakes = await storage.getStakesByChallengeId(challenge.id);
    const created = stakes.find(s => s.source === 'base' && s.sourceId === 'reply-base-1');
    expect(created).toBeDefined();
    expect(created?.matched).toBe(true);
  });
});