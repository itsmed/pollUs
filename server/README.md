# PollUs — Server

Express.js backend for PollUs. Runs on port **4000** in development.

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start with nodemon hot-reload (loads `server/.env.development`) |
| `pnpm start` | Start without hot-reload |

Run from the **repo root** using `pnpm dev` to also start the database and client together.

| Command | Description |
|---|---|
| `pnpm test` | Run unit tests with Jest |

## Environment Variables

Create `server/.env.development` for local development (already exists, not committed):

| Variable | Description |
|---|---|
| `NODE_ENV` | Runtime environment (`development` \| `production`) |
| `PORT` | Port to listen on (default: `4000`) |
| `DATABASE_URL` | Full PostgreSQL connection string |
| `CONGRESS_API_KEY` | API key from [api.congress.gov](https://api.congress.gov/sign-up/) |
| `GEOCOD_API_KEY` | API key from [Geocodio](https://www.geocod.io/) for address → district lookup |

## Database

### Connection

```
postgresql://pollus:pollus_dev@localhost:5432/pollus_dev
```

The database runs in Docker (see repo root `docker-compose.yml`).

### First-time setup

```bash
# 1. Start the Postgres container
pnpm db:up          # from repo root

# 2. Apply all SQL migrations and seed congressional vote data (~1 100 votes)
pnpm db:migrate     # from repo root
```

`db:migrate` is idempotent — re-running it skips already-applied migrations and skips already-seeded vote rows.

### Subsequent workflow

| Situation | Command (from repo root) |
|---|---|
| Apply new SQL migrations + re-sync vote data | `pnpm db:migrate` |
| Preview pending migrations without applying | `pnpm db:migrate --dry-run` |
| Seed / re-sync vote data only | `pnpm --filter server db:seed-votes` |
| Wipe everything and start fresh | `pnpm db:reset && pnpm db:migrate` |

### How migrations work

SQL migrations live in `docker/postgres/migrations/` and are named `NNN_description.sql`. The `db:migrate` script (at `scripts/migrate.sh`) applies each file in order inside a transaction and records the version in `schema_migrations` — files already listed there are skipped.

### How vote seeding works

After SQL migrations, `db:migrate` runs `server/db/seedVotes.js` which walks every `data/119/votes/**/*.json` file and inserts rows into `congressional_votes` and `vote_positions` using `ON CONFLICT DO NOTHING`. Each file is processed in its own transaction; a bad file is skipped and reported without aborting the rest.

---

## Dev User

In development there is no OAuth/login flow. A seed user is created automatically by migration `004_user_profile.sql`:

| Field | Value |
|---|---|
| `name` | `Dev User` |
| `email` | `dev@local.dev` |

The auth middleware (`server/middleware/auth.js`) detects that no `pollus_user_id` cookie is present and automatically looks up the dev user by email, then sets the cookie for that session. On every subsequent request the cookie is read and the full user row is attached to `req.user`.

**Recreating the dev user on a fresh machine:**

```bash
# 1. Start Postgres
pnpm db:up           # from repo root

# 2. Apply all migrations (004 seeds dev@local.dev)
pnpm db:migrate      # from repo root
```

Migration 004 uses `ON CONFLICT (email) DO NOTHING`, so re-running is safe. If you need to seed it manually after a reset:

```sql
INSERT INTO users (name, email) VALUES ('Dev User', 'dev@local.dev')
  ON CONFLICT (email) DO NOTHING;
```

---

## Schema

### `users`

Registered users of the application.

| Column | Type | Constraints | Migration |
|---|---|---|---|
| `id` | `SERIAL` | Primary key | 001 |
| `name` | `VARCHAR(255)` | Not null | 001 |
| `email` | `VARCHAR(255)` | Not null, unique | 001 |
| `address` | `TEXT` | Nullable — home address for rep lookup | 004 |
| `preferences` | `JSONB` | Not null, default `{}` | 004 |
| `senator_ids` | `INTEGER[]` | Not null, default `{}` — integer PKs from `members` | 007 |
| `congress_member_ids` | `INTEGER[]` | Not null, default `{}` — integer PKs from `members` | 007 |

`senator_ids` and `congress_member_ids` are set by `PATCH /api/auth/me` when the user looks up their address on the Find My Reps page. The client sends bioguide ID strings (e.g. `["Y000064"]`) and the server resolves them to integer member IDs before storing.

---

### `members`

Congressional members (Senators and Representatives) cached from the Congress.gov API.

| Column | Type | Constraints |
|---|---|---|
| `id` | `SERIAL` | Primary key |
| `name` | `VARCHAR(255)` | Not null |
| `state` | `VARCHAR(255)` | Not null — full state name (e.g. `"Indiana"`) |
| `district` | `VARCHAR(10)` | Nullable — House members only, null for Senators |
| `role` | `VARCHAR(50)` | Not null — `'Senator'` or `'Representative'` |
| `party` | `VARCHAR(100)` | Not null |
| `api_id` | `VARCHAR(255)` | Not null, unique — Congress.gov bioguide ID |
| `photo_url` | `TEXT` | Nullable — Congress.gov member photo URL |

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

---

## API Routes

### `GET /api/auth/me`

Returns the currently authenticated user. In development the dev user is returned automatically.

**Response `200 OK`:**

```json
{
  "user": {
    "id": 1,
    "name": "Dev User",
    "email": "dev@local.dev",
    "address": null,
    "preferences": {},
    "senator_ids": [12, 34],
    "congress_member_ids": [56]
  }
}
```

**Response `401`** if no cookie / user not found.

---

### `PATCH /api/auth/me`

Updates the current user's address, preferences, and/or saved representatives.

**Request body** (all fields optional):

```json
{
  "address": "123 Main St, Springfield, IL",
  "preferences": { "notifications": true },
  "senator_api_ids": ["Y000064", "B001135"],
  "congress_member_api_ids": ["H000001"]
}
```

`senator_api_ids` and `congress_member_api_ids` are arrays of Congress.gov bioguide ID strings. The server resolves them to integer `members.id` values and stores those in `senator_ids` / `congress_member_ids`. Both arrays are always written together — passing one resets the other to the existing value.

**Response `200 OK`:** full updated `user` object (same shape as `GET /api/auth/me`).

---

### `GET /api/auth/me/reps`

Returns the full member rows for the current user's saved representatives, split by role.

**Response `200 OK`:**

```json
{
  "senators": [
    { "id": 12, "name": "Young, Todd", "state": "Indiana", "role": "Senator", "party": "Republican", "api_id": "Y000064", "photo_url": "..." }
  ],
  "representatives": [
    { "id": 56, "name": "Banks, Jim", "state": "Indiana", "district": "3", "role": "Representative", "party": "Republican", "api_id": "B001294", "photo_url": "..." }
  ]
}
```

Returns `{ senators: [], representatives: [] }` when no reps are saved.

---

### `GET /api/member`

Returns all congressional members for the current Congress (`CURRENT_CONGRESS = 119`). Checks the `members` database table first; on a cache miss, fetches from the Congress.gov `/member/congress/119` endpoint, pages through all results, replaces the `members` table, and returns the full list.

**Response `200 OK`:**

```json
{
  "source": "cache",
  "count": 535,
  "members": [
    {
      "id": 1,
      "name": "Young, Todd",
      "state": "Indiana",
      "district": null,
      "role": "Senator",
      "party": "Republican",
      "api_id": "Y000064",
      "photo_url": "https://www.congress.gov/img/member/y000064_200.jpg"
    }
  ]
}
```

| Field | Description |
|---|---|
| `source` | `"cache"` if returned from the database, `"api"` if fetched live |
| `count` | Total number of members returned |
| `members` | Array of member objects |

**Response `500 Internal Server Error`:**

```json
{ "error": "Failed to retrieve members" }
```

**Caching behaviour:**
- If any rows exist in the `members` table, the database result is returned immediately without calling the API.
- If the table is empty, the Congress.gov API is called, all pages are fetched, the `members` table is cleared, and fresh data is inserted in a single transaction.

---

## Code Structure

```
server/
├── app.js                      # Express app setup and route mounting
├── bin/www                     # HTTP server entry point (port 4000)
├── CONSTANTS.ts                # Shared constants (e.g. CURRENT_CONGRESS)
├── tsconfig.json               # TypeScript config for .ts files in the server
├── db/
│   └── index.js                # pg connection pool
├── routes/
│   └── api/
│       └── member.js           # GET /api/member handler
├── services/
│   └── memberService.js        # Cache-check → API-fetch → DB-write logic
└── tests/
    └── memberService.test.js   # Unit tests for memberService
```

### `CONSTANTS.ts`

| Constant | Value | Description |
|---|---|---|
| `CURRENT_CONGRESS` | `119` | Active Congress session number — update every 2 years |

### Service: `memberService.js`

| Export | Description |
|---|---|
| `getMembers()` | Top-level function: returns from cache or fetches from API |
| `getCachedMembers()` | Queries the `members` table directly |
| `fetchAndCacheMembers()` | Fetches all pages from `/member/congress/119`, replaces DB table |
| `mapApiMember(apiMember)` | Maps a Congress.gov API member object to the DB schema |

---

## Testing

Tests are in `server/tests/` and run with Jest. The `pg` pool and `fetch` are fully mocked — no database or network connection required.

```bash
pnpm test
```

**Test coverage:**

| Area | Cases |
|---|---|
| `mapApiMember` | House member, Senator (last-term chamber, null district), chamber switch, missing party, missing depiction |
| `getCachedMembers` | Returns rows (including photo_url), empty result, DB error propagation |
| `fetchAndCacheMembers` | Missing API key, fetches `/congress/119`, DELETE+INSERT replace, pagination, DB rollback on error, non-OK API response, empty API result |
| `getMembers` | Cache hit (no API call), cache miss (calls API) |
