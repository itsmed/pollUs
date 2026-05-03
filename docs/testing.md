# Testing

Votr has three test layers that together cover the full stack.

| Layer | Runner | Location | Scope |
|---|---|---|---|
| Client unit | Vitest + jsdom | `client/components/**/*.test.tsx` | Component rendering and interactions |
| Server unit | Jest + ts-jest | `server/tests/*.test.ts` | Service logic (no DB or network) |
| End-to-end | Playwright | `e2e/tests/*.spec.ts` | Full browser against running dev stack |

---

## Running tests

### All client unit tests

```bash
pnpm --filter client test
```

| Variant | Command |
|---|---|
| Watch mode | `pnpm --filter client test:watch` |
| Interactive UI | `pnpm --filter client test:ui` |
| Coverage report | `pnpm --filter client test:coverage` |

### All server unit tests

```bash
pnpm --filter server test
```

### End-to-end tests

The full dev stack must be running first:

```bash
# Terminal 1 — start Postgres, server, and client
pnpm dev

# Terminal 2 — run e2e tests
pnpm test:e2e
```

| Variant | Command |
|---|---|
| Headed (watch browser) | `pnpm --filter @votr/e2e test:headed` |
| Interactive UI mode | `pnpm --filter @votr/e2e test:ui` |
| HTML report | `pnpm --filter @votr/e2e test:report` |

---

## Client unit tests

**Framework:** Vitest with `jsdom` environment and `@testing-library/react`.

**Setup file:** `client/src/setupTests.ts` — imports `@testing-library/jest-dom` matchers.

**Test files:**

| File | What it covers |
|---|---|
| `components/NavBar.test.tsx` | NavBar renders nav links and theme toggle |
| `components/NavBar.actions.test.tsx` | Theme cycle, rep links, logout flow |
| `components/bills/BillCard.test.tsx` | Bill card renders label, chamber, title, action |
| `components/bills/BillList.test.tsx` | Empty state message; renders a list of bill cards |
| `components/members/MemberCard.test.tsx` | Member card renders name, district, party, role |
| `components/votes/VotePreview.test.tsx` | Vote preview renders chamber, question, result |

**Mocking strategy:** External modules (`@votr/shared`, `react-router-dom`, context providers) are mocked with `vi.mock`. Components under test receive fully typed props via `as unknown as ConcreteType`. No network or database involvement.

---

## Server unit tests

**Framework:** Jest with `ts-jest` for TypeScript compilation.

**Config:** in `server/package.json` under `"jest"` — matches `**/tests/**/*.test.ts`.

**Test files:**

| File | Service | Cases |
|---|---|---|
| `tests/memberService.test.ts` | `memberService` | 15 — mapping, cache hit/miss, API pagination, DB rollback |
| `tests/billService.test.ts` | `billService` | 20 — mapping, cache hit/miss, API fetch, null fields, text versions |
| `tests/geocodioService.test.ts` | `geocodioService` | 13 — address encoding, legislator mapping, district selection |

**Mocking strategy:** The `pg` pool and global `fetch` are mocked via `jest.mock`. No real database or network calls are made; the tests exercise pure service logic.

**Not yet covered:** auth routes, bill/member/votes route handlers, `voteService`, `userCongressionalVoteService`, and `middleware/auth`.

---

## End-to-end tests

**Framework:** Playwright, Chromium only.

**Config:** `e2e/playwright.config.ts`
- `baseURL`: `http://localhost:3000` (override with `E2E_BASE_URL`)
- `globalSetup`: `e2e/global-setup.ts`
- Retries: 2 in CI, 0 locally

### Auth in e2e tests

The dev stack uses an auto-login mechanism: when no `votr_user_id` cookie is present and `NODE_ENV !== 'production'`, the server middleware looks up `dev@local.dev` in the database and issues a session cookie automatically. This means any Playwright browser that hits the server will be silently authenticated as the dev user — no OAuth flow required.

**Global setup** (`e2e/global-setup.ts`) calls `POST /api/auth/dev-login` before the test suite runs. This endpoint (dev-only, returns 404 in production) creates `dev@local.dev` in the database if it does not exist, and is idempotent.

**Consequence for tests that need an unauthenticated state:** Clearing browser cookies does not produce a logged-out state because the server will immediately re-issue a cookie. These tests instead use `page.route()` to intercept `GET /api/auth/me` and return a `401` response, which causes the React app to render the unauthenticated UI without touching the database.

```ts
// Pattern used in auth.spec.ts to simulate logged-out state
await page.route('**/api/auth/me', route =>
  route.fulfill({ status: 401, contentType: 'application/json',
    body: JSON.stringify({ error: 'Not authenticated' }) })
);
```

### Test files

| File | Tests | What it covers |
|---|---|---|
| `tests/navigation.spec.ts` | 8 | Home loads, nav links visible, link-click routing, direct URL routing |
| `tests/auth.spec.ts` | 6 | Logged-in state (user name + log out button), log out flow, unauthenticated state (via route mock), profile link, log in redirect |
| `tests/bills.spec.ts` | 4 | Page heading, content present, bill card links match `/bills/`, detail page loads |
| `tests/members.spec.ts` | 4 | Page heading, member card links match `/members/`, detail page loads |
| `tests/votes.spec.ts` | 6 | Page heading, chamber filter tabs, tab switching, vote card links match `/votes/`, detail page loads |

### Locator conventions

- Nav links are targeted by `page.getByRole('link', { name })`.
- Vote/bill/member card links are targeted by `page.locator('a[href^="/votes/"]')` (and equivalent patterns) rather than generic role selectors — this avoids picking up the logo or nav links that share the same role.
- Data-dependent tests (card links, detail navigation) skip gracefully when the dev database has no data.

---

## Environment variables for e2e

| Variable | Default | Description |
|---|---|---|
| `E2E_BASE_URL` | `http://localhost:3000` | Client URL Playwright navigates to |
| `E2E_API_URL` | `http://localhost:4000` | API URL used in `globalSetup` to seed the dev user |
