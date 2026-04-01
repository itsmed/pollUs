# Votr — Server

Express.js backend for Votr. Runs on port **4000** in development.

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
| `API_URL` | Public base URL of this server (e.g. `http://localhost:4000`) — used to build OAuth callback URLs |
| `CLIENT_URL` | Public base URL of the frontend (e.g. `http://localhost:3000`) — OAuth redirects here after sign-in |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `APPLE_CLIENT_ID` | Apple Sign In service ID (reverse-domain format) |
| `APPLE_TEAM_ID` | Apple Developer team ID |
| `APPLE_KEY_ID` | Apple Sign In key ID |
| `APPLE_PRIVATE_KEY` | Contents of the Apple Sign In `.p8` private key (newlines as `\n`) |

`API_URL`, `CLIENT_URL`, and the `GOOGLE_*` / `APPLE_*` vars are only required when running with real OAuth. In development the dev-user auto-login bypasses OAuth entirely.

## Database

### Connection

```
postgresql://votr:votr_dev@localhost:5432/votr_dev
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

## Authentication

### Production — OAuth (Google & Apple)

Users sign in via Google or Apple OAuth. The flow is:

1. Client sends the user to `GET /api/auth/google` or `GET /api/auth/apple`.
2. The provider redirects back to the matching `/callback` route.
3. The server calls `findOrCreateUser` — inserts or updates a row in `users` keyed on email.
4. An auth cookie is set (1-year, `httpOnly`, `sameSite: lax`, `secure` in production).
5. The user is redirected to `CLIENT_URL/profile`.

On error the user is redirected to `CLIENT_URL/?auth_error=1`.

Passport strategies are registered in `routes/api/auth.js` and `passport.initialize()` is mounted in `app.js`. No session store is used — the cookie is the sole auth mechanism.

### Development — Auto-login

In development there is no OAuth flow. A seed user is created automatically by migration `004_user_profile.sql`:

| Field | Value |
|---|---|
| `name` | `Dev User` |
| `email` | `dev@local.dev` |

The auth middleware (`server/middleware/auth.js`) detects that no `votr_user_id` cookie is present and automatically looks up the dev user by email, then sets the cookie for that session. On every subsequent request the cookie is read and the full user row is attached to `req.user`.

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

`senator_ids` and `congress_member_ids` are set by `PATCH /api/auth/me` when the user saves their address (from the home page or profile page). The client sends Congress.gov member ID strings (e.g. `["Y000064"]`) and the server resolves them to integer member IDs before storing.

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

### `GET /api/auth/google`

Initiates Google OAuth. Redirects the browser to Google's consent screen.

---

### `GET /api/auth/google/callback`

Google redirects here after the user consents. Creates or updates the user record, sets the auth cookie, and redirects to `CLIENT_URL/profile`. On failure redirects to `CLIENT_URL/?auth_error=1`.

---

### `GET /api/auth/apple`

Initiates Apple Sign In. Redirects the browser to Apple's consent screen.

---

### `POST /api/auth/apple/callback`

Apple posts here after the user consents (Apple uses POST for its callback). Creates or updates the user record, sets the auth cookie, and redirects to `CLIENT_URL/profile`. On failure redirects to `CLIENT_URL/?auth_error=1`.

---

### `POST /api/auth/logout`

Clears the auth cookie.

**Response `200 OK`:** `{ "ok": true }`

---

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
├── app.js                      # Express app setup, passport init, route mounting
├── bin/www                     # HTTP server entry point (port 4000)
├── CONSTANTS.ts                # Shared constants (e.g. CURRENT_CONGRESS)
├── tsconfig.json               # TypeScript config for .ts files in the server
├── db/
│   ├── index.js                # pg connection pool
│   ├── setup.js                # Creates all tables (pnpm db:setup)
│   └── seedVotes.js            # Seeds congressional vote data from JSON files
├── middleware/
│   └── auth.js                 # Reads auth cookie → attaches req.user; dev auto-login
├── models/                     # Table definitions (CREATE TABLE IF NOT EXISTS SQL)
│   ├── User.js
│   ├── Member.js
│   ├── Bill.js
│   ├── Vote.js
│   ├── Comment.js
│   ├── CongressionalVote.js
│   └── VotePosition.js
├── routes/
│   └── api/
│       ├── auth.js             # Auth routes: OAuth flow, /me, /me/reps, logout
│       ├── bill.js             # GET /api/bill, bill detail, text, votes
│       ├── member.js           # GET /api/member, member detail
│       ├── representatives.js  # POST /find-representative-and-senator
│       └── votes.js            # User vote CRUD
├── services/
│   ├── billService.js          # Bill cache-check → API-fetch → DB-write logic
│   ├── geocodioService.js      # Address → congressional district via Geocodio
│   ├── memberService.js        # Member cache-check → API-fetch → DB-write logic
│   ├── userCongressionalVoteService.js  # Compares user votes to rep votes
│   └── voteService.js          # User vote read/write helpers
└── tests/
    ├── billService.test.js
    ├── geocodioService.test.js
    └── memberService.test.js
```

### `CONSTANTS.ts`

| Constant | Value | Description |
|---|---|---|
| `CURRENT_CONGRESS` | `119` | Active Congress session number — update every 2 years |

### Service: `memberService.js`

| Export | Description |
|---|---|
| `getMembers()` | Returns from cache or fetches from API |
| `getCachedMembers()` | Queries the `members` table directly |
| `fetchAndCacheMembers()` | Fetches all pages from `/member/congress/119`, replaces DB table in a transaction |
| `mapApiMember(m)` | Maps a Congress.gov API member object to the DB schema |
| `getMemberDetail(id)` | Fetches a single member by Congress.gov ID from the API |

### Service: `billService.js`

| Export | Description |
|---|---|
| `getBills()` | Returns from cache or fetches from API |
| `getCachedBills()` | Queries `bills` filtered to `CURRENT_CONGRESS` |
| `fetchAndCacheBills()` | Fetches from `/bill/119`, upserts each bill by `api_id` |
| `mapApiBill(b)` | Maps a Congress.gov API bill object to the DB schema |
| `getBillDetail(congress, type, number)` | Fetches actions and summaries in parallel from the API |
| `getBillText(congress, type, number)` | Fetches available text versions from the API |

### Service: `geocodioService.js`

| Export | Description |
|---|---|
| `findLegislators(address)` | Geocodes an address via Geocodio and returns mapped legislators |
| `mapGeocodioLegislator(leg, state, district)` | Maps a Geocodio legislator object to the app schema |

---

## Testing

Tests are in `server/tests/` and run with Jest. The `pg` pool and `fetch` are fully mocked — no database or network connection required.

```bash
pnpm test
```

### Coverage report

**`memberService.test.js`** — 15 cases

| Function | Cases |
|---|---|
| `mapApiMember` | House member, Senator (role from last term, null district), chamber switch, missing party, missing depiction |
| `getCachedMembers` | Returns rows with `photo_url`, empty result, DB error propagation |
| `fetchAndCacheMembers` | Missing API key, fetches `/member/congress/119`, DELETE + INSERT in transaction, pagination across pages, DB rollback on error, non-OK API response, empty API result |
| `getMembers` | Cache hit (no API call), cache miss (calls API) |
| `getMemberDetail` | Missing API key, correct URL construction, returns member, null when missing from response, non-OK response |

**`billService.test.js`** — 20 cases

| Function | Cases |
|---|---|
| `mapApiBill` | House bill, `api_id` format, missing title defaults to `"Untitled"`, missing `latestAction` nulls action fields, numeric bill number coerced to string, missing URL |
| `getCachedBills` | Returns rows, filters by current congress, empty result, DB error propagation |
| `fetchAndCacheBills` | Missing API key, fetches `/bill/119` and upserts, multiple bills (one query per bill), empty API result (no DB calls), non-OK API response |
| `getBills` | Cache hit (no API call), cache miss (calls API) |
| `getBillDetail` | Missing API key, fetches actions + summaries in parallel, null bill when not in DB, empty arrays when API omits fields, non-OK actions response, correct `api_id` query |
| `getBillText` | Missing API key, fetches `/text` and returns versions, empty array when API omits field, non-OK response |

**`geocodioService.test.js`** — 13 cases

| Function | Cases |
|---|---|
| `mapGeocodioLegislator` | Representative (role, district, party, photo), Senator (role, null district, name, ID), missing party defaults to `"Unknown"`, missing photo null, null district number |
| `findLegislators` | Missing API key, calls Geocodio with `cd119` field, returns address + state + legislators, one rep + one senator with correct district, non-OK API response, no results, no congressional district in result, picks district with highest proportion, encodes address in query string |

**Not yet covered:**

| Area | Notes |
|---|---|
| `routes/api/auth.js` | OAuth callback logic, `/me`, `PATCH /me`, `/me/reps`, saved-member routes |
| `routes/api/bill.js` | Route handler wiring |
| `routes/api/member.js` | Route handler wiring |
| `routes/api/votes.js` | Vote read/write routes |
| `routes/api/representatives.js` | Address lookup route |
| `services/voteService.js` | User vote helpers |
| `services/userCongressionalVoteService.js` | Vote comparison logic |
| `middleware/auth.js` | Cookie read, dev auto-login |
