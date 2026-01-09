import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { parseBantabroTag } from "./webhooks/parser";
import { parseStakeFromComment, validateStake } from "./webhooks/stake-parser";
import { log } from "./index";
import { sendNotification, subscribeSSE } from './notifications';
import { verifyWebhook } from "./webhooks/verify";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.challenges.list.path, async (req, res) => {
    const challenges = await storage.getChallenges();
    res.json(challenges);
  });

  app.get(api.challenges.get.path, async (req, res) => {
    const challenge = await storage.getChallenge(Number(req.params.id));
    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    res.json(challenge);
  });

  app.post(api.challenges.create.path, async (req, res) => {
    try {
      const input = api.challenges.create.input.parse(req.body);
      
      // If settlementToken is provided, validate it exists in whitelist
      if (input.settlementToken) {
        const coin = await storage.getCreatorCoin(input.settlementToken);
        if (!coin || !coin.isActive) {
          return res.status(400).json({
            message: 'Settlement token not found or inactive',
            field: 'settlementToken',
          });
        }
        log(`Challenge will settle in creator coin: ${coin.name}`);
      }
      
      const challenge = await storage.createChallenge(input as any);
      res.status(201).json(challenge);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.challenges.escrow.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.challenges.escrow.input.parse(req.body);
      const existing = await storage.getChallenge(id);
      if (!existing) return res.status(404).json({ message: 'Challenge not found' });

      const updated = await storage.updateChallenge(id, {
        escrowTxHash: input.txHash,
        escrowContractId: input.escrowId,
        tokenAddress: input.tokenAddress,
        status: 'escrowed',
      } as any);

      res.status(200).json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.challenges.accept.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.challenges.accept.input.parse(req.body);
      const existing = await storage.getChallenge(id);
      if (!existing) return res.status(404).json({ message: 'Challenge not found' });
      if (existing.status !== 'active' && existing.status !== 'escrowed') {
        return res.status(400).json({ message: 'Challenge not in a state that can be accepted' });
      }

      const updated = await storage.updateChallenge(id, {
        status: 'matched',
        matchedTxHash: input.txHash,
        escrowContractId: input.escrowId ?? existing.escrowContractId,
        tokenAddress: input.tokenAddress ?? existing.tokenAddress,
        matcherAddress: input.opponentAddress ?? existing.opponent,
        matchedAt: new Date(),
      } as any);

      // Emit lightweight log/notification hook and send SSE notification
      log(`Challenge ${id} matched by ${updated.matcherAddress}`);
      try {
        sendNotification('challenge:matched', { challengeId: id, matcher: updated.matcherAddress, txHash: updated.matchedTxHash });
      } catch (e) {
        log(`Failed to send notification for challenge ${id}: ${String(e)}`);
      }

      res.status(200).json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.challenges.decline.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.challenges.decline.input.parse(req.body);
      const existing = await storage.getChallenge(id);
      if (!existing) return res.status(404).json({ message: 'Challenge not found' });

      const updated = await storage.updateChallenge(id, {
        status: 'declined',
      } as any);

      // lightweight notify/log hook and send SSE notification
      log(`Challenge ${id} declined`);
      try {
        sendNotification('challenge:declined', { challengeId: id });
      } catch (e) {
        log(`Failed to send notification for challenge ${id} decline: ${String(e)}`);
      }

      res.status(200).json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Notifications stream (SSE)
  app.get('/api/notifications/stream', (req, res) => subscribeSSE(req, res));



  // Webhook endpoint for Farcaster
  app.post('/webhooks/farcaster', verifyWebhook('farcaster'), async (req, res) => {
    const body = req.body || {};
    const sourceId = String(body.castId || body.id || '');
    const author = String(body.author || body.handle || body.username || '').replace(/^@/, '');
    const text = String(body.text || body.content || '');
    const parentCastId = body.parentCastId || body.parentId; // reply context

    log(`Received Farcaster webhook from @${author} id=${sourceId}`);

    // === PHASE 3: CHECK FOR STAKE ACCEPTANCE FIRST ===
    if (parentCastId) {
      log(`[Phase 3] Detected reply to parent cast. Parsing for stake...`);
      const stake = parseStakeFromComment(text, author);
      
      if (stake) {
        log(`[Phase 3] Parsed stake from comment: ${stake.challenger} ${stake.side.toUpperCase()} ₦${stake.amount}`);
        
        // Validate before processing
        const validation = validateStake(stake);
        if (!validation.valid) {
          log(`[Phase 3] Stake validation failed: ${validation.error}`);
          return res.status(400).json({ message: validation.error });
        }

        // Find the challenge this reply is for
        // In Farcaster, the parent cast ID tells us which challenge thread
        const challenge = await storage.getChallengeBySource('farcaster', parentCastId);
        if (!challenge) {
          log(`[Phase 3] Challenge not found for parent cast ${parentCastId}`);
          return res.status(404).json({ message: 'Challenge not found' });
        }

        // Check for idempotency (don't double-process the same reply)
        const existingStake = await storage.getStakesByUsername(stake.challenger);
        const isDuplicate = existingStake.some(s => s.sourceId === sourceId && s.challengeId === challenge.id);
        if (isDuplicate) {
          log(`[Phase 3] Stake already processed from this comment id=${sourceId}`);
          return res.status(200).json({ message: 'Already processed', challenge });
        }

        try {
          // Create the stake
          const createdStake = await storage.createStake({
            challengeId: challenge.id,
            username: stake.challenger,
            side: stake.side,
            amount: stake.amount,
            matched: false,
            source: 'farcaster',
            sourceId,
            // Don't set escrow info yet (will come from wallet approval)
          } as any);

          log(`[Phase 3] Created stake from Farcaster comment: id=${createdStake.id}`);

          // Try to find matchable stake (auto-matching)
          const matchableStake = await storage.findMatchableStake(
            challenge.id,
            stake.side,
            stake.amount,
            createdStake.id
          );

          if (matchableStake && matchableStake.id) {
            log(`[Phase 3] Auto-matched! ${createdStake.id} with ${matchableStake.id}`);
            
            const match = await storage.createMatch({
              challengeId: challenge.id,
              yesStakeId: stake.side === 'yes' ? createdStake.id : matchableStake.id,
              noStakeId: stake.side === 'no' ? createdStake.id : matchableStake.id,
            } as any);

            await storage.updateStake(createdStake.id, { matched: true, matchedWith: matchableStake.username });
            await storage.updateStake(matchableStake.id, { matched: true, matchedWith: stake.challenger });

            // Update challenge pools
            const allStakes = await storage.getStakesByChallengeId(challenge.id);
            const yesPool = allStakes.filter(s => s.side === 'yes').reduce((sum, s) => sum + s.amount, 0);
            const noPool = allStakes.filter(s => s.side === 'no').reduce((sum, s) => sum + s.amount, 0);
            await storage.updateChallenge(challenge.id, { yesPool, noPool, status: 'matched', matchedAt: new Date() } as any);

            // Send notifications
            try {
              await storage.createNotification({
                username: stake.challenger,
                type: 'matched',
                challengeId: challenge.id,
                matchId: match.id,
                title: 'Challenge Matched!',
                message: `Your ₦${stake.amount} ${stake.side.toUpperCase()} stake is matched with @${matchableStake.username}'s ${stake.side === 'yes' ? 'NO' : 'YES'} stake! 🎯`,
              } as any);

              await storage.createNotification({
                username: matchableStake.username,
                type: 'matched',
                challengeId: challenge.id,
                matchId: match.id,
                title: 'Challenge Matched!',
                message: `Your ₦${matchableStake.amount} ${matchableStake.side.toUpperCase()} stake is matched with @${stake.challenger}'s ${matchableStake.side === 'yes' ? 'NO' : 'YES'} stake! 🎯`,
              } as any);
            } catch (e) {
              log(`Failed to send match notifications: ${String(e)}`);
            }
          }

          return res.status(201).json(createdStake);
        } catch (err) {
          log(`[Phase 3] Error creating stake from Farcaster: ${String(err)}`);
          return res.status(500).json({ message: 'Failed to create stake' });
        }
      }
    }

    // === PHASE 1-2: CHALLENGE CREATION ===
    const parsed = parseBantabroTag(text);
    if (!parsed) {
      log(`No bantabro tag found in cast id=${sourceId}`);
      return res.status(204).json({ message: 'No bantabro challenge tag found' });
    }

    log(`Parsed bantabro tag: ${parsed.name} (amount=${parsed.amount})`);

    // idempotency
    const existing = await storage.getChallengeBySource('farcaster', sourceId);
    if (existing) {
      log(`Challenge already exists for sourceId=${sourceId}`);
      return res.status(200).json({ message: 'Already processed', challenge: existing });
    }

    const challenger = `@${author}`;
    const opponent = parsed.opponent ? `@${parsed.opponent}` : '';

    const insert = {
      challenger,
      opponent: opponent || '',
      name: parsed.name,
      amount: parsed.amount,
      currency: parsed.currency || 'USDC',
      source: 'farcaster',
      sourceId,
      sourcePayload: JSON.stringify(body),
      isAutomated: true,
    };

    const challenge = await storage.createChallengeIfNotExists(insert as any);
    log(`Created or returned challenge id=${challenge.id} from farcaster id=${sourceId}`);
    return res.status(201).json(challenge);
  });

  // Webhook endpoint for Base miniapp shares
  app.post('/webhooks/base', verifyWebhook('base'), async (req, res) => {
    const body = req.body || {};
    const sourceId = String(body.eventId || body.id || '');
    const author = String(body.user || body.author || '').replace(/^@/, '');
    const text = String(body.text || body.content || '');
    const parentEventId = body.parentEventId || body.parentId; // reply context

    log(`Received Base webhook from @${author} id=${sourceId}`);

    // === PHASE 3: CHECK FOR STAKE ACCEPTANCE FIRST ===
    if (parentEventId) {
      log(`[Phase 3] Detected reply to parent event. Parsing for stake...`);
      const stake = parseStakeFromComment(text, author);
      
      if (stake) {
        log(`[Phase 3] Parsed stake from comment: ${stake.challenger} ${stake.side.toUpperCase()} ₦${stake.amount}`);
        
        // Validate before processing
        const validation = validateStake(stake);
        if (!validation.valid) {
          log(`[Phase 3] Stake validation failed: ${validation.error}`);
          return res.status(400).json({ message: validation.error });
        }

        // Find the challenge this reply is for
        const challenge = await storage.getChallengeBySource('base', parentEventId);
        if (!challenge) {
          log(`[Phase 3] Challenge not found for parent event ${parentEventId}`);
          return res.status(404).json({ message: 'Challenge not found' });
        }

        // Check for idempotency
        const existingStakes = await storage.getStakesByUsername(stake.challenger);
        const isDuplicate = existingStakes.some(s => s.sourceId === sourceId && s.challengeId === challenge.id);
        if (isDuplicate) {
          log(`[Phase 3] Stake already processed from this comment id=${sourceId}`);
          return res.status(200).json({ message: 'Already processed', challenge });
        }

        try {
          // Create the stake
          const createdStake = await storage.createStake({
            challengeId: challenge.id,
            username: stake.challenger,
            side: stake.side,
            amount: stake.amount,
            matched: false,
            source: 'base',
            sourceId,
          } as any);

          log(`[Phase 3] Created stake from Base comment: id=${createdStake.id}`);

          // Try to find matchable stake (auto-matching)
          const matchableStake = await storage.findMatchableStake(
            challenge.id,
            stake.side,
            stake.amount,
            createdStake.id
          );

          if (matchableStake && matchableStake.id) {
            log(`[Phase 3] Auto-matched! ${createdStake.id} with ${matchableStake.id}`);
            
            const match = await storage.createMatch({
              challengeId: challenge.id,
              yesStakeId: stake.side === 'yes' ? createdStake.id : matchableStake.id,
              noStakeId: stake.side === 'no' ? createdStake.id : matchableStake.id,
            } as any);

            await storage.updateStake(createdStake.id, { matched: true, matchedWith: matchableStake.username });
            await storage.updateStake(matchableStake.id, { matched: true, matchedWith: stake.challenger });

            // Update challenge pools
            const allStakes = await storage.getStakesByChallengeId(challenge.id);
            const yesPool = allStakes.filter(s => s.side === 'yes').reduce((sum, s) => sum + s.amount, 0);
            const noPool = allStakes.filter(s => s.side === 'no').reduce((sum, s) => sum + s.amount, 0);
            await storage.updateChallenge(challenge.id, { yesPool, noPool, status: 'matched', matchedAt: new Date() } as any);

            // Send notifications
            try {
              await storage.createNotification({
                username: stake.challenger,
                type: 'matched',
                challengeId: challenge.id,
                matchId: match.id,
                title: 'Challenge Matched!',
                message: `Your ₦${stake.amount} ${stake.side.toUpperCase()} stake matched with @${matchableStake.username}'s ${stake.side === 'yes' ? 'NO' : 'YES'} stake! 🎯`,
              } as any);

              await storage.createNotification({
                username: matchableStake.username,
                type: 'matched',
                challengeId: challenge.id,
                matchId: match.id,
                title: 'Challenge Matched!',
                message: `Your ₦${matchableStake.amount} ${matchableStake.side.toUpperCase()} stake matched with @${stake.challenger}'s ${matchableStake.side === 'yes' ? 'NO' : 'YES'} stake! 🎯`,
              } as any);
            } catch (e) {
              log(`Failed to send match notifications: ${String(e)}`);
            }
          }

          return res.status(201).json(createdStake);
        } catch (err) {
          log(`[Phase 3] Error creating stake from Base: ${String(err)}`);
          return res.status(500).json({ message: 'Failed to create stake' });
        }
      }
    }

    // === PHASE 1-2: CHALLENGE CREATION ===
    const parsed = parseBantabroTag(text);
    if (!parsed) {
      log(`No bantabro tag found in base event id=${sourceId}`);
      return res.status(204).json({ message: 'No bantabro challenge tag found' });
    }

    log(`Parsed bantabro tag from base: ${parsed.name} (amount=${parsed.amount})`);

    // idempotency
    const existing = await storage.getChallengeBySource('base', sourceId);
    if (existing) {
      log(`Challenge already exists for base sourceId=${sourceId}`);
      return res.status(200).json({ message: 'Already processed', challenge: existing });
    }

    const challenger = `@${author}`;
    const opponent = parsed.opponent ? `@${parsed.opponent}` : '';

    const insert = {
      challenger,
      opponent: opponent || '',
      name: parsed.name,
      amount: parsed.amount,
      currency: parsed.currency || 'USDC',
      tokenAddress: '',
      type: opponent ? 'p2p' : 'crowd',
      isYes: parsed.isYes ?? true,
      status: 'active',
      yesPool: parsed.isYes ? parsed.amount : 0,
      noPool: parsed.isYes ? 0 : parsed.amount,
      source: 'base',
      sourceId,
      sourcePayload: JSON.stringify(body),
      isAutomated: true,
    };

    const challenge = await storage.createChallengeIfNotExists(insert as any);
    log(`Created or returned challenge id=${challenge.id} from base id=${sourceId}`);
    return res.status(201).json(challenge);
  });

  // === CREATOR COINS ROUTES ===
  
  // Public: List active creator coins
  app.get('/api/coins', async (req, res) => {
    try {
      const coins = await storage.listCreatorCoins();
      res.json(coins);
    } catch (err) {
      log(`Error listing creator coins: ${String(err)}`);
      res.status(500).json({ message: 'Failed to list coins' });
    }
  });

  // Admin: Add a new creator coin to whitelist
  app.post('/admin/coins', async (req, res) => {
    try {
      // TODO: Add auth middleware to verify admin role
      const body = req.body || {};
      const input = z.object({
        name: z.string().min(1),
        contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        decimals: z.number().min(0).max(18),
        dexAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
        chainId: z.number().default(8453),
      }).parse(body);

      const existing = await storage.getCreatorCoin(input.contractAddress);
      if (existing) {
        return res.status(400).json({ message: 'Coin already whitelisted' });
      }

      const coin = await storage.addCreatorCoin({
        name: input.name,
        contractAddress: input.contractAddress,
        decimals: input.decimals,
        dexAddress: input.dexAddress,
        chainId: input.chainId,
      });

      log(`Added creator coin: ${input.name} (${input.contractAddress})`);
      res.status(201).json(coin);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      log(`Error adding creator coin: ${String(err)}`);
      res.status(500).json({ message: 'Failed to add coin' });
    }
  });

  // Admin: Enable creator coin mode for a creator
  app.post('/admin/creators/:handle/coin', async (req, res) => {
    try {
      // TODO: Add auth middleware to verify admin role or creator self-service
      const handle = req.params.handle.replace(/^@/, ''); // normalize @handle
      const body = req.body || {};
      const input = z.object({
        coinId: z.number().int().positive(),
        isEnabled: z.boolean().default(true),
      }).parse(body);

      // Verify coin exists
      const coins = await storage.listCreatorCoins();
      if (!coins.some(c => c.id === input.coinId)) {
        return res.status(400).json({ message: 'Creator coin not found' });
      }

      const settings = await storage.setCreatorCoinSettings(handle, input.coinId, input.isEnabled);
      log(`Set creator coin mode for @${handle}: coinId=${input.coinId}, enabled=${input.isEnabled}`);
      res.status(200).json(settings);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      log(`Error setting creator coin: ${String(err)}`);
      res.status(500).json({ message: 'Failed to set creator coin settings' });
    }
  });

  // Public: Get creator coin settings
  app.get('/api/creators/:handle/coin', async (req, res) => {
    try {
      const handle = req.params.handle.replace(/^@/, '');
      const settings = await storage.getCreatorCoinSettings(handle);
      if (!settings) {
        return res.status(404).json({ message: 'Creator coin not configured' });
      }
      res.json(settings);
    } catch (err) {
      log(`Error getting creator coin settings: ${String(err)}`);
      res.status(500).json({ message: 'Failed to get creator coin settings' });
    }
  });

  // === PHASE 3: STAKES & MATCHING ===

  // Create a stake (accept YES or NO on a challenge)
  app.post(api.stakes.accept.path, async (req, res) => {
    try {
      const challengeId = Number(req.params.id);
      const side = req.params.side as 'yes' | 'no';
      const input = api.stakes.accept.input.parse(req.body);

      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ message: 'Challenge not found' });
      }

      // Validate side matches input
      if (side !== input.side) {
        return res.status(400).json({ message: 'Side mismatch in URL and body' });
      }

      // Create the stake
      const stake = await storage.createStake({
        challengeId,
        username: input.username,
        side,
        amount: input.amount,
        escrowId: input.escrowId,
        escrowTxHash: input.escrowTxHash,
        escrowAddress: process.env.ESCROW_ADDRESS, // EscrowERC20 contract on Base testnet
        matched: false,
        source: 'web',
      } as any);

      // Try to find a matchable stake (opposite side, same amount, not yet matched)
      const matchableStake = await storage.findMatchableStake(challengeId, side, input.amount, stake.id);

      if (matchableStake && matchableStake.id) {
        // Auto-match them!
        const match = await storage.createMatch({
          challengeId,
          yesStakeId: side === 'yes' ? stake.id : matchableStake.id,
          noStakeId: side === 'no' ? stake.id : matchableStake.id,
          escrowId: input.escrowId,
          escrowTxHash: input.escrowTxHash,
        } as any);

        // Mark both stakes as matched
        await storage.updateStake(stake.id, { matched: true, matchedWith: matchableStake.username });
        await storage.updateStake(matchableStake.id, { matched: true, matchedWith: input.username });

        // Update challenge pools
        const allStakes = await storage.getStakesByChallengeId(challengeId);
        const yesPool = allStakes.filter(s => s.side === 'yes').reduce((sum, s) => sum + s.amount, 0);
        const noPool = allStakes.filter(s => s.side === 'no').reduce((sum, s) => sum + s.amount, 0);
        await storage.updateChallenge(challengeId, {
          yesPool,
          noPool,
          status: 'matched',
          matchedAt: new Date(),
        } as any);

        // Send notifications
        try {
          await storage.createNotification({
            username: input.username,
            type: 'matched',
            challengeId,
            matchId: match.id,
            title: 'Challenge Matched!',
            message: `Your ₦${input.amount} ${side.toUpperCase()} stake is matched with @${matchableStake.username}'s ${side === 'yes' ? 'NO' : 'YES'} stake!`,
          } as any);

          await storage.createNotification({
            username: matchableStake.username,
            type: 'matched',
            challengeId,
            matchId: match.id,
            title: 'Challenge Matched!',
            message: `Your ₦${matchableStake.amount} ${matchableStake.side.toUpperCase()} stake is matched with @${input.username}'s ${matchableStake.side === 'yes' ? 'NO' : 'YES'} stake!`,
          } as any);
        } catch (e) {
          log(`Failed to send match notifications: ${String(e)}`);
        }

        log(`Auto-matched stakes: ${stake.id} vs ${matchableStake.id}`);
        try {
          sendNotification('stakes:matched', {
            challengeId,
            matchId: match.id,
            yesUser: side === 'yes' ? input.username : matchableStake.username,
            noUser: side === 'no' ? input.username : matchableStake.username,
          });
        } catch (e) {
          log(`Failed to send SSE notification: ${String(e)}`);
        }
      }

      res.status(201).json(stake);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      log(`Error creating stake: ${String(err)}`);
      res.status(500).json({ message: 'Failed to create stake' });
    }
  });

  // List stakes for a challenge
  app.get(api.stakes.list.path, async (req, res) => {
    try {
      const challengeId = Number(req.params.id);
      const stakes_ = await storage.getStakesByChallengeId(challengeId);
      res.json(stakes_);
    } catch (err) {
      log(`Error listing stakes: ${String(err)}`);
      res.status(500).json({ message: 'Failed to list stakes' });
    }
  });

  // Get a single stake
  app.get(api.stakes.get.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const stake = await storage.getStake(id);
      if (!stake) {
        return res.status(404).json({ message: 'Stake not found' });
      }
      res.json(stake);
    } catch (err) {
      log(`Error getting stake: ${String(err)}`);
      res.status(500).json({ message: 'Failed to get stake' });
    }
  });

  // List matches for a challenge
  app.get(api.matches.list.path, async (req, res) => {
    try {
      const challengeId = Number(req.params.id);
      const matches_ = await storage.getMatchesByChallengeId(challengeId);
      res.json(matches_);
    } catch (err) {
      log(`Error listing matches: ${String(err)}`);
      res.status(500).json({ message: 'Failed to list matches' });
    }
  });

  // Get a single match
  app.get(api.matches.get.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const match = await storage.getMatch(id);
      if (!match) {
        return res.status(404).json({ message: 'Match not found' });
      }
      res.json(match);
    } catch (err) {
      log(`Error getting match: ${String(err)}`);
      res.status(500).json({ message: 'Failed to get match' });
    }
  });

  // List notifications for a user
  app.get(api.notifications.list.path, async (req, res) => {
    try {
      const username = req.query.username as string;
      const unreadOnly = req.query.unreadOnly === 'true';

      if (!username) {
        return res.status(400).json({ message: 'Username query parameter required' });
      }

      const notifications_ = await storage.getNotificationsByUsername(username, unreadOnly);
      res.json(notifications_);
    } catch (err) {
      log(`Error listing notifications: ${String(err)}`);
      res.status(500).json({ message: 'Failed to list notifications' });
    }
  });

  // Mark notification as read
  app.post(api.notifications.markRead.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const notification = await storage.markNotificationRead(id);
      res.json(notification);
    } catch (err) {
      log(`Error marking notification read: ${String(err)}`);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  // SSE subscription for notifications
  app.get('/api/notifications/subscribe/:username', (req, res) => {
    try {
      const username = req.params.username;
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Send a ping every 30s to keep connection alive
      const pingInterval = setInterval(() => {
        res.write(': ping\n\n');
      }, 30000);

      req.on('close', () => {
        clearInterval(pingInterval);
      });

      // Placeholder: In production, integrate with a proper event system (Redis pubsub, etc.)
      log(`User @${username} subscribed to notifications`);
      res.write(`data: ${JSON.stringify({ message: 'Connected to notifications' })}\n\n`);
    } catch (err) {
      log(`Error subscribing to notifications: ${String(err)}`);
      res.status(500).json({ message: 'Failed to subscribe' });
    }
  });

  return httpServer;
}

async function seedDatabase() {
  const existingItems = await storage.getChallenges();
  if (existingItems.length === 0) {
    await storage.createChallenge({ 
      challenger: "@crypto_king", 
      opponent: "@bear_market", 
      type: "p2p", 
      amount: 50,
      isYes: true,
      status: "active",
      yesPool: 50,
      noPool: 0
    });
    await storage.createChallenge({ 
      challenger: "@degen_lord", 
      opponent: "@vitalik", 
      type: "crowd", 
      amount: 100,
      isYes: false,
      status: "active",
      yesPool: 500,
      noPool: 350
    });
  }
}

// Call seed in the background
seedDatabase().catch(console.error);
