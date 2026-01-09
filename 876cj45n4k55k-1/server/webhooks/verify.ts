import type { RequestHandler } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { log } from '../index';

export function verifyWebhook(platform: 'farcaster' | 'base'): RequestHandler {
  return (req, res, next) => {
    const secretEnv = platform === 'farcaster' ? 'FARCASTER_WEBHOOK_SECRET' : 'BASE_WEBHOOK_SECRET';
    const secret = process.env[secretEnv];
    if (!secret) {
      log(`Webhook verification not configured for ${platform} (missing ${secretEnv})`, 'webhook');
      return res.status(500).json({ message: 'Webhook secret not configured' });
    }

    const header = (req.headers['x-bantabro-signature'] as string) || '';
    if (!header) {
      return res.status(401).json({ message: 'Missing signature header' });
    }

    const raw = (req as any).rawBody;
    if (!raw) {
      // rawBody should be set by express.json verify option in server/index.ts
      return res.status(400).json({ message: 'Raw body is required for signature verification' });
    }

    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw));

    const expected = createHmac('sha256', secret).update(buf).digest('hex');

    const sig = header.startsWith('sha256=') ? header.slice('sha256='.length) : header;

    const sigBuf = Buffer.from(sig, 'hex');
    const expBuf = Buffer.from(expected, 'hex');

    if (sigBuf.length !== expBuf.length) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    const ok = timingSafeEqual(expBuf, sigBuf);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    // passed
    next();
  };
}
