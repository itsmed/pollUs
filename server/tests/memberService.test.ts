jest.mock('../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
}));

import pool from '../db';
import {
  getCachedMembers,
  fetchAndCacheMembers,
  getMembers,
  mapApiMember,
  getMemberDetail,
} from '../services/memberService';

const mockPool = pool as jest.Mocked<typeof pool>;

const makeMockClient = (overrides = {}) => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  release: jest.fn(),
  ...overrides,
});

const makeApiMember = (overrides = {}) => ({
  bioguideId: 'A000001',
  name: 'Adams, Jane',
  state: 'California',
  district: 12,
  partyName: 'Democrat',
  depiction: {
    imageUrl: 'https://www.congress.gov/img/member/a000001_200.jpg',
    attribution: 'Image courtesy of the Member',
  },
  terms: { item: [{ chamber: 'House of Representatives', startYear: 2020 }] },
  ...overrides,
});

const makeDbMember = (overrides = {}) => ({
  id: 1,
  name: 'Adams, Jane',
  state: 'California',
  district: '12',
  role: 'Representative',
  party: 'Democrat',
  api_id: 'A000001',
  photo_url: 'https://www.congress.gov/img/member/a000001_200.jpg',
  ...overrides,
});

// ─── mapApiMember ────────────────────────────────────────────────────────────

describe('mapApiMember', () => {
  test('maps a House member correctly', () => {
    const result = mapApiMember(makeApiMember());
    expect(result).toEqual({
      name: 'Adams, Jane',
      state: 'California',
      district: '12',
      role: 'Representative',
      party: 'Democrat',
      api_id: 'A000001',
      photo_url: 'https://www.congress.gov/img/member/a000001_200.jpg',
    });
  });

  test('maps a Senator correctly — role from last term chamber, no district', () => {
    const senator = makeApiMember({
      district: undefined,
      partyName: 'Republican',
      terms: { item: [{ chamber: 'Senate', startYear: 2017 }] },
    });
    const result = mapApiMember(senator);
    expect(result.role).toBe('Senator');
    expect(result.district).toBeNull();
  });

  test('uses last term chamber for role when member switched chambers', () => {
    const switched = makeApiMember({
      district: undefined,
      terms: {
        item: [
          { chamber: 'House of Representatives', startYear: 2011, endYear: 2017 },
          { chamber: 'Senate', startYear: 2017 },
        ],
      },
    });
    expect(mapApiMember(switched).role).toBe('Senator');
  });

  test('defaults party to "Unknown" when partyName is missing', () => {
    const member = makeApiMember({ partyName: undefined });
    expect(mapApiMember(member).party).toBe('Unknown');
  });

  test('sets photo_url to null when depiction is missing', () => {
    const member = makeApiMember({ depiction: undefined });
    expect(mapApiMember(member).photo_url).toBeNull();
  });
});

// ─── getCachedMembers ────────────────────────────────────────────────────────

describe('getCachedMembers', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns rows from the database', async () => {
    const rows = [makeDbMember()];
    mockPool.query.mockResolvedValueOnce({ rows } as never);

    const result = await getCachedMembers();

    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
    expect(result).toEqual(rows);
  });

  test('includes photo_url in SELECT', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);
    await getCachedMembers();
    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('photo_url'));
  });

  test('returns empty array when no members in database', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);
    const result = await getCachedMembers();
    expect(result).toEqual([]);
  });

  test('propagates database errors', async () => {
    (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('DB connection failed'));
    await expect(getCachedMembers()).rejects.toThrow('DB connection failed');
  });
});

// ─── fetchAndCacheMembers ─────────────────────────────────────────────────────

describe('fetchAndCacheMembers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-key' };
    global.fetch = jest.fn() as typeof global.fetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    delete (global as Record<string, unknown>).fetch;
  });

  test('throws when CONGRESS_API_KEY is missing', async () => {
    delete process.env.CONGRESS_API_KEY;
    await expect(fetchAndCacheMembers()).rejects.toThrow('CONGRESS_API_KEY');
  });

  test('fetches from /member/congress/119, upserts DB, and returns members', async () => {
    const apiMember = makeApiMember();
    const dbMember = makeDbMember();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ members: [apiMember], pagination: { count: 1 } }),
    });

    const client = makeMockClient({
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })          // BEGIN
        .mockResolvedValueOnce({ rows: [dbMember] })  // INSERT ... ON CONFLICT DO UPDATE
        .mockResolvedValueOnce({ rows: [] }),          // COMMIT
    });
    (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

    const result = await fetchAndCacheMembers();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/member/congress/119'));
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
    expect(result).toEqual([dbMember]);
  });

  test('pages through multiple API result pages', async () => {
    const member1 = makeApiMember({ bioguideId: 'A000001' });
    const member2 = makeApiMember({ bioguideId: 'B000002', name: 'Baker, Bob' });

    (global.fetch as jest.Mock)
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
        .mockResolvedValueOnce({ rows: [] })    // BEGIN
        .mockResolvedValueOnce({ rows: [db1] }) // INSERT member1
        .mockResolvedValueOnce({ rows: [db2] }) // INSERT member2
        .mockResolvedValueOnce({ rows: [] }),   // COMMIT
    });
    (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

    const result = await fetchAndCacheMembers();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  test('rolls back transaction on DB error and releases client', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ members: [makeApiMember()], pagination: { count: 1 } }),
    });

    const client = makeMockClient({
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('insert failed')), // INSERT
    });
    client.query.mockResolvedValueOnce({ rows: [] });
    (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

    await expect(fetchAndCacheMembers()).rejects.toThrow('insert failed');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  test('throws on non-ok API response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 403, statusText: 'Forbidden' });
    await expect(fetchAndCacheMembers()).rejects.toThrow('Congress.gov API error: 403 Forbidden');
  });

  test('returns empty array when API returns no members', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ members: [], pagination: { count: 0 } }),
    });
    const result = await fetchAndCacheMembers();
    expect(result).toEqual([]);
    expect(mockPool.connect).not.toHaveBeenCalled();
  });
});

// ─── getMembers ───────────────────────────────────────────────────────────────

describe('getMembers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CONGRESS_API_KEY = 'test-key';
    global.fetch = jest.fn() as typeof global.fetch;
  });

  afterEach(() => {
    delete (global as Record<string, unknown>).fetch;
  });

  test('returns cache when members exist in DB', async () => {
    const cached = [makeDbMember()];
    mockPool.query.mockResolvedValueOnce({ rows: cached } as never);

    const result = await getMembers();

    expect(result.source).toBe('cache');
    expect(result.members).toEqual(cached);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('calls API and returns members when DB is empty', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    const dbMember = makeDbMember();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ members: [makeApiMember()], pagination: { count: 1 } }),
    });

    const client = makeMockClient({
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })          // BEGIN
        .mockResolvedValueOnce({ rows: [dbMember] })  // INSERT ... ON CONFLICT DO UPDATE
        .mockResolvedValueOnce({ rows: [] }),          // COMMIT
    });
    (mockPool.connect as jest.Mock).mockResolvedValueOnce(client);

    const result = await getMembers();

    expect(result.source).toBe('api');
    expect(result.members).toEqual([dbMember]);
  });
});

// ─── getMemberDetail ──────────────────────────────────────────────────────────

describe('getMemberDetail', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-key' };
    global.fetch = jest.fn() as typeof global.fetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    delete (global as Record<string, unknown>).fetch;
  });

  test('throws when CONGRESS_API_KEY is missing', async () => {
    delete process.env.CONGRESS_API_KEY;
    await expect(getMemberDetail('Y000064')).rejects.toThrow('CONGRESS_API_KEY');
  });

  test('calls the correct Congress.gov URL with the bioguide ID', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ member: makeApiMember() }),
    });

    await getMemberDetail('A000001');

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/member/A000001'));
  });

  test('returns the member object from the API response', async () => {
    const apiMember = makeApiMember();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ member: apiMember }),
    });

    const result = await getMemberDetail('A000001');
    expect(result).toEqual(apiMember);
  });

  test('returns null when API response has no member field', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const result = await getMemberDetail('A000001');
    expect(result).toBeNull();
  });

  test('throws on non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });
    await expect(getMemberDetail('INVALID')).rejects.toThrow('Congress.gov API error: 404 Not Found');
  });
});
