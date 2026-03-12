# PollUs

A civic engagement app that lets users find their congressional representatives, browse and vote on bills, and compare their stances to their representatives' voting records. Features a Tinder-like swipe interface for exploring legislation.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui |
| Data Fetching | React Query |
| Backend | Express.js (Node.js) |
| Database | PostgreSQL 16 (Docker in dev, Supabase in prod) |
| Package Manager | pnpm |
| Testing | Jest + React Testing Library |

## Project Structure

```
pollus/
├── client/             # Next.js frontend (port 3000)
├── server/             # Express.js backend (port 4000)
├── docker/
│   └── postgres/
│       ├── Dockerfile        # PostgreSQL 16 image
│       ├── init/             # SQL run automatically on first container start
│       └── migrations/       # Numbered SQL migration files
├── scripts/
│   └── migrate.sh            # Migration runner (pnpm db:migrate)
├── docker-compose.yml  # Full dev environment orchestration
├── .env.development    # Root-level Postgres credentials (dev defaults)
└── package.json        # Root scripts using pnpm workspaces
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v9+
- [Docker](https://www.docker.com/) (for the local Postgres instance)

### Install dependencies

```bash
pnpm install
```

### Start the development environment

```bash
pnpm dev
```

This single command:
1. Starts a PostgreSQL 16 container in Docker (port 5432) and waits for it to be healthy
2. Starts the Express server with nodemon hot-reload (port 4000)
3. Starts the Next.js dev server with fast refresh (port 3000)

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Dev Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start Postgres in Docker + server + client natively |
| `pnpm dev:docker` | Run everything (db, server, client) fully in Docker |
| `pnpm dev:down` | Stop all Docker services |
| `pnpm db:up` | Start only the Postgres container |
| `pnpm db:down` | Stop only the Postgres container |
| `pnpm db:migrate` | Apply all pending SQL migrations |
| `pnpm db:migrate:dry-run` | Print pending migrations without applying them |
| `pnpm db:reset` | Destroy the database volume and recreate it (wipes all data) |
| `pnpm build` | Build the client for production |
| `pnpm lint` | Lint the client |

## Environment Variables

### Root — `.env.development`

These are passed to Docker Compose for the Postgres container.

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `pollus` | Database user |
| `POSTGRES_PASSWORD` | `pollus_dev` | Database password |
| `POSTGRES_DB` | `pollus_dev` | Database name |

### Server — `server/.env.development`

Loaded automatically when running `pnpm dev`.

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `4000` | Port the Express server listens on |
| `DATABASE_URL` | `postgresql://pollus:pollus_dev@localhost:5432/pollus_dev` | Postgres connection string |

### Client — `client/.env.development`

Loaded automatically by Next.js in development.

| Variable | Value | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Base URL for all API calls to the Express server |

## Database

In development, Postgres runs in a Docker container with a named volume (`postgres_data`) so data persists between restarts.

### Migrations

Schema changes are managed with numbered SQL migration files:

```
docker/postgres/migrations/
├── 001_initial_schema.sql
└── 002_your_next_change.sql   ← add new migrations here
```

Applied migrations are tracked in the `schema_migrations` table. To apply pending migrations:

```bash
pnpm db:migrate
```

To preview what would run without making changes:

```bash
pnpm db:migrate:dry-run
```

**How it works:**
- `docker/postgres/init/01_init.sql` bootstraps a _fresh_ container (creates schema + marks `001` as applied)
- `scripts/migrate.sh` applies any migrations not yet recorded in `schema_migrations`
- Each migration runs inside a transaction — if it fails, all changes for that file are rolled back and the version is not recorded

**Adding a new migration:**
1. Create `docker/postgres/migrations/NNN_description.sql` (increment the number)
2. Run `pnpm db:migrate`

To connect directly with `psql`:

```bash
psql postgresql://pollus:pollus_dev@localhost:5432/pollus_dev
```

## Architecture

```
Browser (3000)
    │
    ▼
Next.js Client          ← NEXT_PUBLIC_API_URL=http://localhost:4000
    │
    │ HTTP (localhost:4000)
    ▼
Express Server          ← DATABASE_URL=postgresql://...@localhost:5432/...
    │
    │ SQL
    ▼
PostgreSQL (Docker:5432)
```

In production, the Express server connects to a Supabase PostgreSQL instance via the `DATABASE_URL` environment variable.
