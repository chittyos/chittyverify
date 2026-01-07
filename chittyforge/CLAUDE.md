# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChittyID is a universal identity verification and management platform built as part of the ChittyOS ecosystem. It provides deterministic, privacy-preserving digital identities with progressive verification, badge collection, and comprehensive audit trails.

## Development Commands

```bash
# Start development server (runs both frontend and backend)
npm run dev

# Build for production
npm run build

# Run production server
npm run start

# Type checking
npm run check

# Database operations
npm run db:push  # Push schema changes to database
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Wouter routing
- **Backend**: Express.js + TypeScript 
- **Database**: Drizzle ORM with PostgreSQL (Neon serverless)
- **UI Components**: shadcn/ui built on Radix UI + Tailwind CSS
- **State Management**: TanStack Query for server state

### Project Structure
- `/client` - React frontend application
  - `/src/components` - Reusable UI components (shadcn/ui)
  - `/src/pages` - Page components for routing
  - `/src/hooks` - Custom React hooks
  - `/src/lib` - Utilities and configurations
- `/server` - Express backend
  - `index.ts` - Server entry point with middleware setup
  - `routes.ts` - API route definitions
  - `storage.ts` - Data storage layer (currently in-memory)
- `/shared` - Shared types and schemas
  - `schema.ts` - Drizzle ORM schema and Zod validation schemas

### API Architecture

The backend follows RESTful design with these core endpoints:

- **Authentication**: `/api/auth/register`, `/api/auth/login`
- **User Management**: `/api/user/:id`, `/api/user/:id/dashboard`
- **Verification**: `/api/verifications`, `/api/verify-chittyid`
- **Identity Sharing**: `/api/user/:id/share`, `/api/share/:token`
- **Badges**: `/api/badges`, `/api/badges/:badgeId/mint`
- **Network Stats**: `/api/stats`
- **Blockchain**: `/api/user/:id/verify-blockchain`, `/api/user/:id/blockchain-verifications`
- **Social Endorsements**: `/api/user/:id/endorse`, `/api/user/:id/endorsements`
- **Biometric**: `/api/user/:id/verify-biometric`, `/api/user/:id/biometric-data`

All API requests use JSON payloads with Zod validation schemas defined in `/shared/schema.ts`.

### Key Implementation Patterns

1. **Type Safety**: Full TypeScript coverage with shared types between frontend and backend via the `/shared` directory
2. **Path Aliases**: Use `@/` for client imports and `@shared/` for shared code
3. **Component Library**: All UI components from shadcn/ui are in `/client/src/components/ui/`
4. **Validation**: Zod schemas for runtime validation (see `insertUserSchema`, `updateVerificationSchema`, etc.)
5. **Error Handling**: Centralized error middleware in Express server
6. **Styling**: Tailwind CSS with custom theme colors (electric blue/mint green) defined in CSS variables

### Database Schema

Main tables (defined in `/shared/schema.ts`):
- `users` - User profiles with ChittyID and trust metrics
- `verification_methods` - Multi-step verification tracking (email, phone, government_id, biometric, blockchain, social)
- `badges` - Achievement system definitions with NFT support (isNft, contractAddress, tokenId, rarity)
- `user_badges` - User-to-badge relationships with NFT minting tracking
- `activity_logs` - Audit trail of user actions
- `identity_shares` - Secure identity sharing tokens
- `blockchain_verifications` - On-chain identity verification records
- `social_endorsements` - Peer-to-peer trust endorsements
- `biometric_data` - Biometric verification templates and metadata

### Development Notes

- Server runs on port from `process.env.PORT` (default 5000)
- Development uses Vite dev server with HMR
- Production build outputs to `/dist`
- Currently using in-memory storage (`/server/storage.ts`) - ready for database integration
- Simple password hashing in place - production should use bcrypt
- Session management configured but not fully implemented

### New Features (January 2025)

#### Blockchain Verification
- On-chain identity anchoring with wallet signature verification
- Support for multiple chains via chainId parameter
- Automatic "Blockchain Pioneer" NFT badge for verified users
- Transaction hash tracking for on-chain operations

#### Social Endorsements
- Peer-to-peer trust endorsements (professional, personal, skill)
- Trust weight system that increases user trust scores
- "Community Endorsed" badge for users with 5+ endorsements
- Public/private endorsement visibility options

#### Biometric Verification
- Support for face, fingerprint, and voice biometric types
- Template hashing for secure biometric storage
- Provider integration support for third-party biometric services
- "Biometric Master" NFT badge for verified users

#### NFT Achievement System
- Select badges can be minted as NFTs
- Rarity tiers: common, rare, epic, legendary
- Transaction hash tracking for minted badges
- Smart contract integration preparation (contractAddress, tokenId fields)