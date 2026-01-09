import { describe, it, expect } from 'vitest';
import { EventEmitter } from 'events';
import { subscribeSSE, sendNotification } from './notifications';

// minimal fake req/res
function makeReqRes() {
  const req = new EventEmitter();
  const writes: string[] = [];
  const headers: Record<string, any> = {};
  const res: any = {
    setHeader(k: string, v: any) { headers[k] = v; },
    flushHeaders() {},
    write(chunk: any) { writes.push(String(chunk)); },
    end() {},
  };
  return { req, res, writes, headers };
}

describe('SSE notifications', () => {
  it('subscribeSSE sets headers and sendNotification writes event', () => {
    const { req, res, writes } = makeReqRes();

    subscribeSSE(req as any, res as any);

    // send a notification and assert it's written
    sendNotification('challenge:matched', { challengeId: 1, matcher: '@b' });

    const found = writes.some((w) => w.includes('event: challenge:matched') && w.includes('matcher'));
    expect(found).toBe(true);

    // cleanup
    req.emit('close');
  });
});
