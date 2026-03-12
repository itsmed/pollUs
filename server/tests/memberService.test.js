'use strict';

// Mock the db pool before requiring the service
jest.mock('../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
}));

const pool = require('../db');
const {
  getCachedMembers,
  fetchAndCacheMembers,
  getMembers,
  mapApiMember,
} = require('../services/memberService');

// Helpers
const makeMockClient = (overrides = {}) => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  release: jest.fn(),
  ...overrides,
});

const makeApiMember = (overrides = {}) => ({
  bioguideId: 'A000001',
  name: 'Adams, Jane',
  state: 'CA',
  district: 12,
  partyName: 'Democrat',
  terms: { item: [{ chamber: 'House of Representatives', startYear: 2020 }] },
  ...overrides,
});

const makeDbMember = (overrides = {}) => ({
  id: 1,
  name: 'Adams, Jane',
  state: 'CA',
  district: '12',
  role: 'Representative',
  party: 'Democrat',
  api_id: 'A000001',
  ...overrides,
});

// ─── mapApiMember ────────────────────────────────────────────────────────────

describe('mapApiMember', () => {
  test('maps a House member correctly', () => {
    const result = mapApiMember(makeApiMember());
    expect(result).toEqual({
      name: 'Adams, Jane',
      state: 'CA',
      district: '12',
      role: 'Representative',
      party: 'Democrat',
      api_id: 'A000001',
    });
  });

  test('maps a Senator correctly (no district)', () => {
    const senator = makeApiMember({ district: undefined, partyName: 'Republican' });
    const result = mapApiMember(senator);
    expect(result.role).toBe('Senator');
    expect(result.district).toBeNull();
  });

  test('defaults party to "Unknown" when partyName is missing', () => {
    const member = makeApiMember({ partyName: undefined });
    expect(mapApiMember(member).party).toBe('Unknown');
  });
});

// ─── getCachedMembers ────────────────────────────────────────────────────────

describe('getCachedMembers', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns rows from the database', async () => {
    const rows = [makeDbMember()];
    pool.query.mockResolvedValueOnce({ rows });

    const result = await getCachedMembers();

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
    expect(result).toEqual(rows);
  });

  test('returns empty array when no members in database', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const result = await getCachedMembers();
    expect(result).toEqual([]);
  });

  test('propagates database errors', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB connection failed'));
    await expect(getCachedMembers()).rejects.toThrow('DB connection failed');
  });
});

// ─── fetchAndCacheMembers ─────────────────────────────────────────────────────

describe('fetchAndCacheMembers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-key' };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    delete global.fetch;
  });

  test('throws when CONGRESS_API_KEY is missing', async () => {
    delete process.env.CONGRESS_API_KEY;
    await expect(fetchAndCacheMembers()).rejects.toThrow('CONGRESS_API_KEY');
  });

  test('fetches from API, upserts to DB, and returns members', async () => {
    const apiMember = makeApiMember();
    const dbMember = makeDbMember();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        members: [apiMember],
        pagination: { count: 1 },
      }),
    });

    const client = makeMockClient({
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })          // BEGIN
        .mockResolvedValueOnce({ rows: [dbMember] })  // INSERT ... RETURNING
        .mockResolvedValueOnce({ rows: [] }),          // COMMIT
    });
    pool.connect.mockResolvedValueOnce(client);

    const result = await fetchAndCacheMembers();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('api.congress.gov'));
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
    expect(result).toEqual([dbMember]);
  });

  test('pages through multiple API result pages', async () => {
    const member1 = makeApiMember({ bioguideId: 'A000001' });
    const member2 = makeApiMember({ bioguideId: 'B000002', name: 'Baker, Bob' });

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: [member1], pagination: { count: 2 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ members: [member2], pagination: { count: 2 } }),
      });

    const db1 = makeDbMember({ api_id: 'A000001' });
    const db2 = makeDbMember({ id: 2, api_id: 'B000002', name: 'Baker, Bob' });

    const client = makeMockClient({
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })        // BEGIN
        .mockResolvedValueOnce({ rows: [db1] })     // INSERT member1
        .mockResolvedValueOnce({ rows: [db2] })     // INSERT member2
        .mockResolvedValueOnce({ rows: [] }),        // COMMIT
    });
    pool.connect.mockResolvedValueOnce(client);

    const result = await fetchAndCacheMembers();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  test('rolls back transaction on DB insert error', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ members: [makeApiMember()], pagination: { count: 1 } }),
    });

    const client = makeMockClient({
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })          // BEGIN
        .mockRejectedValueOnce(new Error('insert failed')), // INSERT
    });
    // Add ROLLBACK mock
    client.query.mockResolvedValueOnce({ rows: [] }); // ROLLBACK
    pool.connect.mockResolvedValueOnce(client);

    await expect(fetchAndCacheMembers()).rejects.toThrow('insert failed');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  test('throws on non-ok API response', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 403, statusText: 'Forbidden' });
    await expect(fetchAndCacheMembers()).rejects.toThrow('Congress.gov API error: 403 Forbidden');
  });

  test('returns empty array when API returns no members', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ members: [], pagination: { count: 0 } }),
    });
    const result = await fetchAndCacheMembers();
    expect(result).toEqual([]);
    expect(pool.connect).not.toHaveBeenCalled();
  });
});

// ─── getMembers ───────────────────────────────────────────────────────────────

describe('getMembers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CONGRESS_API_KEY = 'test-key';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('returns cache when members exist in DB', async () => {
    const cached = [makeDbMember()];
    pool.query.mockResolvedValueOnce({ rows: cached });

    const result = await getMembers();

    expect(result.source).toBe('cache');
    expect(result.members).toEqual(cached);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('calls API and returns members when DB is empty', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // cache miss

    const dbMember = makeDbMember();
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ members: [makeApiMember()], pagination: { count: 1 } }),
    });

    const client = makeMockClient({
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [dbMember] })
        .mockResolvedValueOnce({ rows: [] }),
    });
    pool.connect.mockResolvedValueOnce(client);

    const result = await getMembers();

    expect(result.source).toBe('api');
    expect(result.members).toEqual([dbMember]);
  });
});
