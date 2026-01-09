# Coin-Fueled Mode: Phase 1 Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          COIN-FUELED MODE FLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

ADMIN SETUP (Phase 1 - DONE ✅)
┌──────────────────────────────────────────────────────────────────────────┐
│  Admin: Whitelist Creator Coins                                          │
│  ──────────────────────────────────────────────────────────────────────  │
│                                                                           │
│  POST /admin/coins                                                       │
│  {                                                                       │
│    name: "JAN",                                                          │
│    contractAddress: "0x1234...",                                         │
│    decimals: 18,                                                         │
│    dexAddress: "0x5678..." (optional)                                    │
│  }                                                                       │
│                    ↓                                                     │
│            [Database: creatorCoins table]                                │
│                    ↓                                                     │
│            Returns: CreatorCoin { id, name, ... }                       │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘

CREATOR SETUP (Phase 1 - DONE ✅)
┌──────────────────────────────────────────────────────────────────────────┐
│  Admin/Creator: Enable Coin-Fueled Mode                                  │
│  ──────────────────────────────────────────────────────────────────────  │
│                                                                           │
│  POST /admin/creators/@alice/coin                                        │
│  {                                                                       │
│    coinId: 1,                                                            │
│    isEnabled: true                                                       │
│  }                                                                       │
│                    ↓                                                     │
│        [Database: creatorCoinSettings table]                             │
│                    ↓                                                     │
│        Returns: CreatorCoinSettings {                                    │
│          id, username: "alice", creatorCoinId: 1, isEnabled: true       │
│        }                                                                 │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘

FRONTEND INTEGRATION (Phase 2 - PLANNED)
┌──────────────────────────────────────────────────────────────────────────┐
│  Frontend: Create Challenge with Creator Coin                            │
│  ──────────────────────────────────────────────────────────────────────  │
│                                                                           │
│  CreateChallengeForm.tsx                                                 │
│       ↓                                                                  │
│  GET /api/coins  (fetch whitelisted coins)                               │
│       ↓                                                                  │
│  [Dropdown: USDC, USDT, JAN, DEGEN, ...]                               │
│       ↓                                                                  │
│  POST /api/challenges                                                    │
│  {                                                                       │
│    name: "Pump it",                                                      │
│    amount: 1000,                                                         │
│    challenger: "@alice",                                                │
│    opponent: "@bob",                                                     │
│    settlementToken: "0x1234..." (JAN contract)                          │
│  }                                                                       │
│       ↓                                                                  │
│  [Challenge created with settlementToken]                               │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘

CHALLENGE SETTLEMENT (Phase 3 - PLANNED)
┌──────────────────────────────────────────────────────────────────────────┐
│  Backend: Settle Challenge in Creator Coin                               │
│  ──────────────────────────────────────────────────────────────────────  │
│                                                                           │
│  On EscrowSettled event:                                                 │
│       ↓                                                                  │
│  [Reconciler detects settlementToken]                                    │
│       ↓                                                                  │
│  IF settlementToken != USDC:                                             │
│    Swap USDC → Creator Coin (via DEX)                                    │
│    Transfer creator coin to winner                                       │
│  ELSE:                                                                   │
│    Transfer USDC to winner                                               │
│       ↓                                                                  │
│  Update DB with settlement tx hash                                       │
│  Mint NFT reward to winner                                               │
│  Send SSE notification                                                   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘

```

## Database Schema (Phase 1 - DONE ✅)

```sql
-- Creator Coins Whitelist
┌─────────────────────────────────────────────────┐
│ creator_coins                                   │
├─────────────────────────────────────────────────┤
│ id (PK)           SERIAL PRIMARY KEY            │
│ name              TEXT NOT NULL                 │
│ contract_address  TEXT NOT NULL UNIQUE          │
│ decimals          INTEGER NOT NULL (0-18)       │
│ dex_address       TEXT (optional)                │
│ chain_id          INTEGER DEFAULT 8453 (Base)   │
│ is_active         BOOLEAN DEFAULT true          │
│ created_at        TIMESTAMP DEFAULT NOW()       │
└─────────────────────────────────────────────────┘

-- Creator Coin Settings (One per creator)
┌──────────────────────────────────────────────────┐
│ creator_coin_settings                           │
├──────────────────────────────────────────────────┤
│ id (PK)           SERIAL PRIMARY KEY             │
│ username          TEXT NOT NULL UNIQUE           │
│ creator_coin_id   INTEGER NOT NULL (FK)          │
│ is_enabled        BOOLEAN DEFAULT true           │
│ created_at        TIMESTAMP DEFAULT NOW()        │
│                                                  │
│ FK: creator_coin_id → creator_coins(id)         │
└──────────────────────────────────────────────────┘

-- Related Table (for context)
┌──────────────────────────────────────────────────┐
│ challenges                                       │
├──────────────────────────────────────────────────┤
│ ... (existing columns)                           │
│ settlement_token  TEXT (contract address)        │  ← Phase 2 addition
│ ... (to be added)                                │
└──────────────────────────────────────────────────┘
```

## API Contracts (Phase 1 - DONE ✅)

```
PUBLIC ENDPOINTS
════════════════════════════════════════════════════════

GET /api/coins
  Response: 200
  [
    {
      id: 1,
      name: "JAN",
      contractAddress: "0x...",
      decimals: 18,
      dexAddress: "0x...",
      isActive: true,
      createdAt: "2025-01-08T..."
    },
    ...
  ]


GET /api/creators/:handle/coin
  Response: 200
  {
    id: 1,
    username: "alice",
    creatorCoinId: 1,
    isEnabled: true,
    createdAt: "2025-01-08T..."
  }
  
  Response: 404
  { message: "Creator coin not configured" }


ADMIN ENDPOINTS (Auth: TODO)
════════════════════════════════════════════════════════

POST /admin/coins
  Request:
  {
    name: string (required)
    contractAddress: "0x..." (40-char hex, required, unique)
    decimals: number (0-18, required)
    dexAddress?: "0x..." (optional)
    chainId?: number (default 8453)
  }
  
  Response: 201
  { id, name, contractAddress, decimals, ... }
  
  Response: 400
  { message, field: "contractAddress" }


POST /admin/creators/:handle/coin
  Request:
  {
    coinId: number (positive integer, required, must exist)
    isEnabled: boolean (default true)
  }
  
  Response: 200
  { id, username, creatorCoinId, isEnabled, createdAt }
  
  Response: 400
  { message: "Creator coin not found" }
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   PHASE 1: CREATOR SETUP                    │
└─────────────────────────────────────────────────────────────┘

Admin Action: Whitelist Coins
    ↓
POST /admin/coins (JAN, DEGEN, HIGHER, etc.)
    ↓
Store in creatorCoins table
    ↓
GET /api/coins (available for frontend)
    ↓
                    
Admin Action: Enable for Creator
    ↓
POST /admin/creators/@alice/coin { coinId: 1 }
    ↓
Store in creatorCoinSettings table
    ↓
Creator's challenges now eligible for settlementToken

┌─────────────────────────────────────────────────────────────┐
│                   PHASE 2: UI INTEGRATION                   │
└─────────────────────────────────────────────────────────────┘

Frontend: Create Challenge
    ↓
GET /api/coins (load whitelisted coins)
    ↓
Render token selector dropdown
    ↓
User selects token (e.g., JAN)
    ↓
POST /api/challenges { ..., settlementToken: "0x1234..." }
    ↓
Backend stores challenge with settlementToken
    ↓
ChallengeCard displays "Settles in JAN"

┌─────────────────────────────────────────────────────────────┐
│                   PHASE 3: SETTLEMENT SWAP                  │
└─────────────────────────────────────────────────────────────┘

On Settlement:
    ↓
Reconciler detects settlementToken in challenge
    ↓
IF settlementToken != USDC:
  Swap USDC → Creator Coin (via DEX)
  Transfer creator coin to winner
ELSE:
  Transfer USDC directly
    ↓
Update challenge status
Mint NFT reward
Send SSE notification
```

## File Dependencies

```
shared/schema.ts
    ↓ (defines)
shared/routes.ts, server/storage.ts, server/routes.ts
    ↓ (implements)
server/storage.creator-coins.test.ts
server/routes.creator-coins.test.ts
    ↓ (validates)
migrations/20260108_creator_coins_tables.sql
    ↓ (creates tables for)
Production Database
    ↓ (used by)
client/src/components/CreateChallengeForm.tsx (Phase 2)
client/src/components/ChallengeCard.tsx (Phase 2)
```

## Key Implementation Details

```javascript
// Storage Layer Example
const coin = await storage.getCreatorCoin("0x...");
const settings = await storage.getCreatorCoinSettings("alice");

// Route Handler Example
app.post('/admin/coins', async (req, res) => {
  const input = parseAndValidate(req.body);      // Zod validation
  const existing = await storage.getCreatorCoin(input.contractAddress);
  if (existing) return res.status(400).json(...); // Duplicate check
  const coin = await storage.addCreatorCoin(input);
  res.status(201).json(coin);
});

// API Contract
api.coins.add = {
  method: 'POST',
  path: '/admin/coins',
  input: z.object({...}),      // Zod schema
  responses: {
    201: CreatorCoin,
    400: ValidationError,
  }
};
```

---

**Status:** Phase 1 Complete ✅
**Next:** Phase 2 - Challenge Creation UI Integration
**ETA:** 1-2 hours
