import fetch from 'node-fetch';
import { parseBantabroTag } from './webhooks/parser';
import { storage } from './storage';
import { log } from './index';

const API_KEY = process.env.NEY_API_KEY;
const SNAP_URL = process.env.NEY_SNAPCHAIN_URL || 'https://snapchain-api.neynar.com';
const POLL_INTERVAL = Number(process.env.NEY_POLL_INTERVAL || '60'); // seconds

let running = false;
let seenIds = new Set<string>();
let timer: NodeJS.Timeout | null = null;

async function fetchMentions(): Promise<any[]> {
  const url = `${SNAP_URL}/v1/castsByMention?mention=bantabro&limit=50`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (API_KEY) headers['x-api-key'] = API_KEY;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Neynar API error ${res.status}: ${txt}`);
  }

  const body = await res.json();
  // body might be {casts: [...]} or an array
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.casts)) return body.casts;
  if (Array.isArray(body.data)) return body.data;
  return [];
}

async function processCast(cast: any) {
  const id = String(cast.id || cast.castId || cast.eventId || cast._id || (cast.hash ?? ''));
  if (!id || seenIds.has(id)) return;

  const author = cast.author || cast.user || cast.fid || cast.username || '';
  const text = cast.text || cast.content || cast.body || cast.message || '';

  // Try to parse bantabro tag
  const parsed = parseBantabroTag(String(text));
  if (!parsed) return;

  log(`Neynar: parsed bantabro tag from ${author} id=${id}`,'neynar');

  const challenger = `@${author.replace(/^@/,'')}`;
  const opponent = parsed.opponent ? `@${parsed.opponent}` : '';

  const insert = {
    challenger,
    opponent: opponent || '',
    name: parsed.name,
    amount: parsed.amount,
    currency: parsed.currency || 'USDC',
    source: 'farcaster',
    sourceId: id,
    sourcePayload: JSON.stringify(cast),
    isAutomated: true,
  } as any;

  try {
    await storage.createChallengeIfNotExists(insert);
    log(`Neynar: created/returned challenge from id=${id}`,'neynar');
  } catch (e) {
    log(`Neynar: failed to create challenge id=${id} err=${String(e)}`,'neynar');
  }

  seenIds.add(id);
}

export async function pollOnce() {
  try {
    const casts = await fetchMentions();
    for (const cast of casts) {
      try { await processCast(cast); } catch (e) { log(`Error processing cast: ${String(e)}`,'neynar'); }
    }
  } catch (e) {
    log(`Neynar poll error: ${String(e)}`,'neynar');
  }
}

export function startNeynarPoller() {
  if (!API_KEY) {
    log('NEY_API_KEY not set, Neynar poller disabled','neynar');
    return;
  }
  if (running) return;
  running = true;
  log('Starting Neynar poller','neynar');
  // initial run
  pollOnce();
  timer = setInterval(pollOnce, POLL_INTERVAL * 1000);
}

export function stopNeynarPoller() {
  if (timer) clearInterval(timer);
  timer = null;
  running = false;
  log('Stopped Neynar poller','neynar');
}
