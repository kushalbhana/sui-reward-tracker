# Sui Rewards Tracker

**Sui Rewards Tracker** is an open-source platform for querying historic staking data on the [Sui](https://sui.io/) blockchain. It indexes on-chain events — stake delegations, unstaking requests, and per-epoch validator performance — into MongoDB, then exposes them through a polished Next.js web interface where users can look up delegator rewards across any range of epochs.

## Why?

The Sui RPC only lets you page through raw events. There's no built-in way to answer questions like _"How much did delegator X earn from validator Y between epochs 100–200?"_ This project solves that by:

1. **Indexing** every `StakingRequestEvent`, `UnstakingRequestEvent`, and `ValidatorEpochInfoEventV2` from genesis into a local MongoDB — with cursor-based resumption so nothing is re-fetched.
2. **Crash-safe ingestion** — any database write failure immediately terminates the process (`process.exit(1)`) to guarantee zero data loss.
3. **Serving** an interactive web UI for querying delegator rewards by address, validator, and epoch range.

## Features

- **Delegator Rewards Lookup** — Enter a delegator address, validator address, and epoch range to get a breakdown of staking rewards.
- **Validator Browser** — Browse all active validators and their epoch-by-epoch performance (stake, voting power, commission rate, pool token exchange rate, etc.).
- **Full Historical Index** — Every staking/unstaking event and validator state from epoch 1 to the current epoch is stored locally.
- **Crash-Safe Indexer** — The indexer crashes hard on any DB failure, ensuring not a single event goes unrecorded.
- **OAuth Login** — Sign in with Google or GitHub via NextAuth.

## Architecture

```
sui-rewards-platform/
├── apps/
│   ├── web            → Next.js frontend (port 3000)
│   ├── docs           → Next.js documentation site (port 3001)
│   └── indexer        → Node.js event indexer + cron scheduler
├── packages/
│   ├── db             → Mongoose models & DB connection
│   ├── rpc            → Generic JSON-RPC client with timeout
│   ├── types          → Shared TypeScript interfaces (zero deps)
│   ├── schema         → Zod validation schemas
│   ├── ui             → Shared React component library
│   ├── eslint-config  → Shared ESLint config
│   └── typescript-config → Shared tsconfig
├── Dockerfile         → Multi-stage build (web, docs, indexer)
├── docker-compose.yml → Full stack: MongoDB + web + docs + indexer
└── turbo.json         → Turborepo pipeline config
```

### Indexer

The indexer runs as a long-lived Node.js process that:

1. Connects to MongoDB (crashes on failure).
2. For each event type (`StakingRequestEvent`, `UnstakingRequestEvent`, `ValidatorEpochInfoEventV2`):
   - Loads the last stored cursor from the database.
   - Pages through all new events via `suix_queryEvents` with automatic RPC retry + failover.
   - Bulk upserts each page into MongoDB (crashes on write failure).
3. Schedules a daily re-sync at 20:32 UTC via `node-cron`.

### Shared Types (`@repo/types`)

All TypeScript interfaces live in a single `@repo/types` package with zero runtime dependencies, so they can be imported by any app or package (frontend, backend, or indexer) without pulling in mongoose or other heavy libraries.

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- npm v10+
- [MongoDB](https://www.mongodb.com/) (local or Atlas) — or use Docker

## Getting Started

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
#    Root .env (shared auth config):
cp .env.docker.example .env

#    Indexer-specific config:
cp apps/indexer/.env.example apps/indexer/.env

# 3. Start all apps in dev mode
npm run dev
```

| App     | URL                    |
|---------|------------------------|
| Web     | http://localhost:3000   |
| Docs    | http://localhost:3001   |

### Docker

Run the entire stack (MongoDB + all apps) with a single command:

```bash
# 1. Configure env
cp .env.docker.example .env
# Edit .env with your real credentials

# 2. Build and start
docker compose up --build
```

This spins up:
| Service   | Description                              |
|-----------|------------------------------------------|
| `mongodb` | MongoDB 7 with persistent volume         |
| `web`     | Next.js frontend on port 3000            |
| `docs`    | Next.js docs site on port 3001           |
| `indexer` | Event indexer (auto-starts on boot)      |

## Scripts

Run from the repo root:

```bash
npm run build        # Build all apps and packages
npm run dev          # Start all apps in development mode
npm run lint         # Lint the entire monorepo
npm run check-types  # Type-check all packages
npm run format       # Format code with Prettier
```

## Environment Variables

### Root `.env` (used by web + Docker Compose)

| Variable                  | Description                          |
|---------------------------|--------------------------------------|
| `MONGO_USER`              | MongoDB root username                |
| `MONGO_PASSWORD`          | MongoDB root password                |
| `NEXTAUTH_URL`            | NextAuth base URL                    |
| `NEXTAUTH_SECRET`         | NextAuth encryption secret           |
| `GOOGLE_ID` / `GOOGLE_SECRET` | Google OAuth credentials         |
| `GITHUB_ID` / `GITHUB_SECRET` | GitHub OAuth credentials         |
| `NEXT_PUBLIC_SUI_WALLET`  | SUI wallet address (shown in UI)     |
| `NEXT_PUBLIC_SOLANA_WALLET` | Solana wallet address (shown in UI)|

### Indexer `.env` (`apps/indexer/.env`)

| Variable      | Description                                          |
|---------------|------------------------------------------------------|
| `MONGODB_URI` | MongoDB connection string                            |
| `RPC_URLS`    | Comma-separated SUI RPC endpoints (failover support) |
| `PAGE_SIZE`   | Events per RPC page (default: 50)                    |

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Framer Motion
- **Backend**: Node.js, Mongoose, node-cron
- **Auth**: NextAuth (Google + GitHub providers)
- **Database**: MongoDB 7
- **Monorepo**: Turborepo + npm workspaces
- **Deployment**: Docker multi-stage builds

## License

This project is open source.
