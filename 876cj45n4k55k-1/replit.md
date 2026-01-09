# Bant-A-Bro

## Overview

Bant-A-Bro is a social betting platform where users can challenge each other to peer-to-peer or crowd-funded bets, settle them on-chain, and mint NFT bragging rights. The app features a mobile-first design with a modern "degen" aesthetic, supporting both light and dark themes.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management
- **Styling**: Tailwind CSS with custom theme variables, shadcn/ui component library
- **Animations**: Framer Motion for smooth transitions and entrance animations
- **Build Tool**: Vite with React plugin

The frontend follows a pages-based architecture with reusable components. Path aliases are configured (`@/` for client source, `@shared/` for shared code).

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: REST endpoints defined in `shared/routes.ts` with Zod validation
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Development**: Hot module replacement via Vite middleware in development mode

The server serves the API and static files. In development, Vite handles HMR; in production, static files are served from the built `dist/public` directory.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` - shared between frontend and backend
- **Migrations**: Managed via `drizzle-kit push` command
- **Tables**: 
  - `challenges` - stores betting challenges with challenger, opponent, amounts, and status
  - `leaderboard` - tracks user rankings, points, wins, and total bets

### Shared Code Pattern
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts` - Database schema definitions and Zod validation schemas
- `routes.ts` - API route definitions with input/output type contracts

This ensures type safety across the full stack.

### Build System
- **Development**: `tsx` for running TypeScript directly
- **Production Build**: 
  - Frontend: Vite builds to `dist/public`
  - Backend: esbuild bundles server with selective dependency bundling for faster cold starts
  - Combined output in `dist/` directory

## External Dependencies

### Database
- PostgreSQL (required) - connection via `DATABASE_URL` environment variable
- `connect-pg-simple` for session storage capability
### Blockchain / Wallet
- Set the following environment variables for on-chain flows in the frontend:
  - `VITE_ESCROW_CONTRACT_ADDRESS` - deployed Escrow contract address
  - `VITE_USDC_ADDRESS` - USDC token address to use in the miniapp
  - `VITE_USDT_ADDRESS` - USDT token address to use in the miniapp

The frontend will attempt to use `window.ethereum` via the user's wallet; for Base miniapp integration we'll add Base minikit integration in a follow-up step.### UI Component Libraries
- shadcn/ui components (Radix UI primitives)
- Framer Motion for animations
- Lucide React for icons

### Form Handling
- React Hook Form with Zod resolver for validation
- Zod schemas shared between client and server

### Development Tools
- Replit-specific Vite plugins for development experience (cartographer, dev-banner, runtime-error-modal)