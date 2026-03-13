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
