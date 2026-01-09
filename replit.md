# Bant-A-Bro

## Overview

Bant-A-Bro is a social betting platform where users can challenge each other to peer-to-peer or crowd-funded bets, settle them on-chain using smart contracts, and mint NFT bragging rights. The app is designed as a Farcaster/Base mini app with a mobile-first interface, supporting crypto payments via USDC/USDT and custom creator coins.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Animations**: Framer Motion for transitions
- **Build Tool**: Vite with path aliases (`@/` for client, `@shared/` for shared code)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: REST endpoints with Zod validation schemas defined in `shared/routes.ts`
- **Real-time**: Server-Sent Events (SSE) for notifications
- **Database ORM**: Drizzle ORM with PostgreSQL

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Key Tables**:
  - `challenges` - betting challenges with status, amounts, escrow tracking
  - `creatorCoins` - whitelisted ERC-20 tokens for settlement
  - `creatorCoinSettings` - per-creator coin preferences
  - `stakes` - individual YES/NO positions on challenges
  - `matches` - paired stakes for matched bets
  - `notifications` - real-time user notifications

### Smart Contract Integration
- **Escrow Contract**: Handles on-chain deposits, matching, and settlement
- **NFT Contract**: BantABroNFT for minting winner rewards
- **Reconciler**: Background service listening to blockchain events and syncing state

### Webhook System
- Farcaster and Base webhook endpoints for social betting via comments
- Tag parsing: `@bantabro challenge "NAME" @opponent YES ₦10,000 USDC`
- HMAC-SHA256 signature verification

## External Dependencies

### Blockchain & Crypto
- **Ethers.js**: Blockchain interactions and smart contract calls
- **Coinbase OnchainKit**: Wallet connections and Base chain integration
- **Hardhat**: Smart contract development and testing

### Farcaster Integration
- **@farcaster/miniapp-sdk**: Mini app SDK for Farcaster context
- **@farcaster/quick-auth**: JWT-based authentication via Farcaster

### Database
- **PostgreSQL**: Primary data store
- **Drizzle ORM**: Type-safe database queries
- **connect-pg-simple**: Session storage

### External APIs
- **Neynar API**: Farcaster mentions polling (optional, via `NEY_API_KEY`)
- **DEX Routers**: Uniswap/Aerodrome for token swaps

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `RECONCILER_RPC`: JSON-RPC URL for blockchain events
- `VITE_ESCROW_CONTRACT_ADDRESS`: Deployed escrow contract
- `VITE_BANTABRO_NFT_ADDRESS`: Deployed NFT contract
- `FARCASTER_WEBHOOK_SECRET`: Webhook signature verification
- `BASE_WEBHOOK_SECRET`: Base webhook verification
- `NEY_API_KEY`: Neynar API access (optional)