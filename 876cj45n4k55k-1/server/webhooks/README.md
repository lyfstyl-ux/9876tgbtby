# Bant-A-Bro Webhook Developer Notes

Endpoints
- `POST /webhooks/farcaster` — accepts Farcaster casts payloads. Expected JSON fields (flexible): `castId` or `id`, `author` / `handle` / `username`, `text` / `content`.
- `POST /webhooks/base` — accepts Base miniapp share payloads. Expected JSON fields (flexible): `eventId` or `id`, `user` / `author`, `text` / `content`.

Tag format (required for detection)
- `@bantabro challenge "CHALLENGE NAME" @opponent YES 10,000 USDC`
- `@bantabro challenge "CHALLENGE NAME" YES 10,000` (open/crowd — defaults to USDC)

Regex used by the parser (case-insensitive):
```
/@bantabro\s+challenge\s+"([^"]+)"(?:\s+@([A-Za-z0-9_]+))?(?:\s+(YES|NO))?\s+₦?\s*([\d,]+(?:\.\d+)?)(?:\s*(USDC|USDT))?/i
```

Notes
- Currency choices supported: **USDC**, **USDT**. If omitted, **USDC** is assumed.
- Amounts accept commas and optional decimals (rounded to nearest whole token unit for initial implementation).
Signature verification
- The webhook endpoints expect an HMAC-SHA256 signature in the header `x-bantabro-signature` in the format `sha256=<hex>` (or simply `<hex>`).
- The signature is computed over the raw request body bytes using a shared secret per-platform.
- Environment variables:
  - `FARCASTER_WEBHOOK_SECRET` — secret for Farcaster webhook verification
  - `BASE_WEBHOOK_SECRET` — secret for Base webhook verification

Example (node):
```js
import { createHmac } from 'crypto';
const secret = process.env.FARCASTER_WEBHOOK_SECRET;
const raw = JSON.stringify(payload);
const sig = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
// set header 'x-bantabro-signature': sig
```

Behavior
- The webhook handler parses the text and, if a valid challenge tag is found, creates a `challenges` row in the DB.
- Idempotency: handlers check `(source, sourceId)` to avoid duplicate creation.
- The created challenge stores `source` (`farcaster` or `base`) and `sourceId` (incoming event id) and `sourcePayload` (raw JSON) for auditing.

Example curl (Farcaster):
```
curl -X POST http://localhost:5000/webhooks/farcaster \
  -H "Content-Type: application/json" \
  -d '{"castId":"cast-1","author":"tester","text":"@bantabro challenge \"TEST CHALLENGE\" @jack YES ₦5,000"}'
```

Example curl (Base):
```
curl -X POST http://localhost:5000/webhooks/base \
  -H "Content-Type: application/json" \
  -d '{"eventId":"evt-1","user":"tester","text":"@bantabro challenge \"50 PUSHUPS IN 2 MINS\" YES ₦25,000"}'
```

Notes & next steps
- Add signature validation for Farcaster/Base payloads in production.
- Add DB unique index on `(source, source_id)` at migration level to enforce idempotency at DB level.
- Add actual platform reply/post-back flow to confirm created challenges on the feeds (optional).
