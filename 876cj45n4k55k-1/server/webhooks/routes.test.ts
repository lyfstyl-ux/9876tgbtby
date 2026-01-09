import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes';

async function setupApp() {
  const app = express();
  const http = createServer(app);
  app.use(express.json());
  await registerRoutes(http, app);
  return app;
}

describe('webhook routes (no tag)', () => {
  it('returns 204 for farcaster when no tag in text', async () => {
    const app = await setupApp();
    const res = await request(app).post('/webhooks/farcaster').send({ text: 'hello world' });
    expect(res.status).toBe(204);
  });

  it('returns 204 for base when no tag in text', async () => {
    const app = await setupApp();
    const res = await request(app).post('/webhooks/base').send({ text: 'this is not a challenge' });
    expect(res.status).toBe(204);
  });
});
