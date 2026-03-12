'use strict';

jest.mock('../db', () => ({
  query: jest.fn(),
}));

const pool = require('../db');
const {
  getCachedBills,
  fetchAndCacheBills,
  getBills,
  mapApiBill,
} = require('../services/billService');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeApiBill = (overrides = {}) => ({
  congress: 119,
  latestAction: {
    actionDate: '2025-01-03',
    text: 'Referred to the House Committee on the Judiciary.',
  },
  number: '134',
  originChamber: 'House',
  title: 'Protecting our Communities from Sexual Predators Act',
  type: 'HR',
  updateDate: '2025-09-18',
  url: 'https://api.congress.gov/v3/bill/119/hr/134?format=json',
  ...overrides,
});

const makeDbBill = (overrides = {}) => ({
  id: 1,
  title: 'Protecting our Communities from Sexual Predators Act',
  origin_chamber: 'House',
  bill_type: 'HR',
  bill_number: '134',
  congress_number: 119,
  latest_action_text: 'Referred to the House Committee on the Judiciary.',
  latest_action_date: '2025-01-03',
  update_date: '2025-09-18',
  api_id: '119/hr/134',
  url: 'https://api.congress.gov/v3/bill/119/hr/134?format=json',
  ...overrides,
});

// ─── mapApiBill ───────────────────────────────────────────────────────────────

describe('mapApiBill', () => {
  test('maps a House bill correctly', () => {
    const result = mapApiBill(makeApiBill());
    expect(result).toEqual({
      title: 'Protecting our Communities from Sexual Predators Act',
      origin_chamber: 'House',
      bill_type: 'HR',
      bill_number: '134',
      congress_number: 119,
      latest_action_text: 'Referred to the House Committee on the Judiciary.',
      latest_action_date: '2025-01-03',
      update_date: '2025-09-18',
      api_id: '119/hr/134',
      url: 'https://api.congress.gov/v3/bill/119/hr/134?format=json',
    });
  });

  test('constructs api_id as {congress}/{type_lower}/{number}', () => {
    const senate = makeApiBill({ congress: 119, type: 'S', number: '42' });
    expect(mapApiBill(senate).api_id).toBe('119/s/42');
  });

  test('defaults title to "Untitled" when missing', () => {
    expect(mapApiBill(makeApiBill({ title: undefined })).title).toBe('Untitled');
  });

  test('sets latest_action fields to null when latestAction is missing', () => {
    const result = mapApiBill(makeApiBill({ latestAction: undefined }));
    expect(result.latest_action_text).toBeNull();
    expect(result.latest_action_date).toBeNull();
  });

  test('converts bill number to string', () => {
    expect(mapApiBill(makeApiBill({ number: 134 })).bill_number).toBe('134');
  });

  test('sets url to null when missing', () => {
    expect(mapApiBill(makeApiBill({ url: undefined })).url).toBeNull();
  });
});

// ─── getCachedBills ───────────────────────────────────────────────────────────

describe('getCachedBills', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns rows from the database', async () => {
    const rows = [makeDbBill()];
    pool.query.mockResolvedValueOnce({ rows });

    const result = await getCachedBills();

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [119]);
    expect(result).toEqual(rows);
  });

  test('filters by current congress number', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await getCachedBills();
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [119]);
  });

  test('returns empty array when no bills cached', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    expect(await getCachedBills()).toEqual([]);
  });

  test('propagates database errors', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    await expect(getCachedBills()).rejects.toThrow('DB error');
  });
});

// ─── fetchAndCacheBills ───────────────────────────────────────────────────────

describe('fetchAndCacheBills', () => {
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
    await expect(fetchAndCacheBills()).rejects.toThrow('CONGRESS_API_KEY');
  });

  test('fetches from /bill/119 and upserts bills', async () => {
    const apiBill = makeApiBill();
    const dbBill = makeDbBill();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bills: [apiBill] }),
    });
    pool.query.mockResolvedValueOnce({ rows: [dbBill] });

    const result = await fetchAndCacheBills();

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/bill/119'));
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (api_id) DO UPDATE'),
      expect.any(Array)
    );
    expect(result).toEqual([dbBill]);
  });

  test('upserts each bill individually', async () => {
    const bill1 = makeApiBill({ number: '1' });
    const bill2 = makeApiBill({ number: '2', title: 'Second Bill' });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bills: [bill1, bill2] }),
    });
    pool.query
      .mockResolvedValueOnce({ rows: [makeDbBill({ bill_number: '1' })] })
      .mockResolvedValueOnce({ rows: [makeDbBill({ id: 2, bill_number: '2', title: 'Second Bill' })] });

    const result = await fetchAndCacheBills();

    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  test('returns empty array when API returns no bills', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bills: [] }),
    });

    expect(await fetchAndCacheBills()).toEqual([]);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('throws on non-ok API response', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' });
    await expect(fetchAndCacheBills()).rejects.toThrow('Congress.gov API error: 429 Too Many Requests');
  });
});

// ─── getBills ─────────────────────────────────────────────────────────────────

describe('getBills', () => {
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

  test('returns cache when bills exist in DB', async () => {
    const cached = [makeDbBill()];
    pool.query.mockResolvedValueOnce({ rows: cached });

    const result = await getBills();

    expect(result.source).toBe('cache');
    expect(result.bills).toEqual(cached);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('fetches from API when DB is empty', async () => {
    const dbBill = makeDbBill();
    pool.query
      .mockResolvedValueOnce({ rows: [] })          // cache miss
      .mockResolvedValueOnce({ rows: [dbBill] });   // upsert

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bills: [makeApiBill()] }),
    });

    const result = await getBills();

    expect(result.source).toBe('api');
    expect(result.bills).toEqual([dbBill]);
  });
});
