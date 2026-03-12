# PollUs — Server

Express.js backend for PollUs. Runs on port **4000** in development.

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start with nodemon hot-reload (loads `server/.env.development`) |
| `pnpm start` | Start without hot-reload |

Run from the **repo root** using `pnpm dev` to also start the database and client together.

## Environment Variables

Create `server/.env.development` for local development (already exists, not committed):

| Variable | Description |
|---|---|
| `NODE_ENV` | Runtime environment (`development` \| `production`) |
| `PORT` | Port to listen on (default: `4000`) |
| `DATABASE_URL` | Full PostgreSQL connection string |

## Database

### Connection

```
postgresql://pollus:pollus_dev@localhost:5432/pollus_dev
```

The database runs in Docker (see repo root `docker-compose.yml`). The schema init script lives at `docker/postgres/init/01_init.sql` and runs automatically on first container creation.

To re-run migrations manually against a running container:

```bash
docker exec -i pollus-db-1 psql -U pollus -d pollus_dev < docker/postgres/init/01_init.sql
```

To reset the database entirely (wipes all data):

```bash
pnpm db:reset   # from repo root
```

---

## Schema

### `users`

Registered users of the application.

| Column | Type | Constraints |
|---|---|---|
| `id` | `SERIAL` | Primary key |
| `name` | `VARCHAR(255)` | Not null |
| `email` | `VARCHAR(255)` | Not null, unique |

---

### `members`

Congressional members (Senators and Representatives) cached from the Congress.gov API.

| Column | Type | Constraints |
|---|---|---|
| `id` | `SERIAL` | Primary key |
| `name` | `VARCHAR(255)` | Not null |
| `state` | `VARCHAR(2)` | Not null — two-letter state code |
| `district` | `VARCHAR(10)` | Nullable — House members only, null for Senators |
| `role` | `VARCHAR(50)` | Not null — `'Senator'` or `'Representative'` |
| `party` | `VARCHAR(100)` | Not null |
| `api_id` | `VARCHAR(255)` | Not null, unique — Congress.gov bioguide ID |

---

### `bills`

Legislation cached from the Congress.gov API.

| Column | Type | Constraints |
|---|---|---|
| `id` | `SERIAL` | Primary key |
| `title` | `VARCHAR(1000)` | Not null |
| `summary` | `TEXT` | Nullable |
| `status` | `VARCHAR(100)` | Nullable |
| `introduced_date` | `DATE` | Nullable |
| `api_id` | `VARCHAR(255)` | Not null, unique — Congress.gov bill ID |

---

### `votes`

A user's vote on a bill. One vote per user per bill (enforced via unique constraint).

| Column | Type | Constraints |
|---|---|---|
| `id` | `SERIAL` | Primary key |
| `user_id` | `INTEGER` | Not null, FK → `users.id` (cascade delete) |
| `bill_id` | `INTEGER` | Not null, FK → `bills.id` (cascade delete) |
| `vote` | `VARCHAR(20)` | Not null — must be `'Yea'`, `'Nay'`, or `'Abstain'` |
| `timestamp` | `TIMESTAMPTZ` | Not null, default `NOW()` |

**Unique constraint:** `(user_id, bill_id)` — a user can only vote once per bill.

---

### `comments`

User comments on bills.

| Column | Type | Constraints |
|---|---|---|
| `id` | `SERIAL` | Primary key |
| `user_id` | `INTEGER` | Not null, FK → `users.id` (cascade delete) |
| `bill_id` | `INTEGER` | Not null, FK → `bills.id` (cascade delete) |
| `content` | `TEXT` | Not null |
| `timestamp` | `TIMESTAMPTZ` | Not null, default `NOW()` |

---

## Entity Relationships

```
users ──────┬──── votes ────┬──── bills
            │               │
            └──── comments ─┘

members (independent — populated from Congress.gov API cache)
```

- Deleting a `user` cascades to their `votes` and `comments`.
- Deleting a `bill` cascades to its `votes` and `comments`.
- `members` and `bills` are populated by the Congress.gov API cache layer and are not user-owned.
