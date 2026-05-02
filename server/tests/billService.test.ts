jest.mock('../db', () => ({
  query: jest.fn(),
}));

import pool from '../db';
import {
  getCachedBills,
  fetchAndCacheBills,
  getBills,
  mapApiBill,
  getBillDetail,
  getBillText,
} from '../services/billService';

const mockPool = pool as jest.Mocked<typeof pool>;

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
    mockPool.query.mockResolvedValueOnce({ rows } as never);

    const result = await getCachedBills();

    expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [119]);
    expect(result).toEqual(rows);
  });

  test('filters by current congress number', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);
    await getCachedBills();
    expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), [119]);
  });

  test('returns empty array when no bills cached', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);
    expect(await getCachedBills()).toEqual([]);
  });

  test('propagates database errors', async () => {
    (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('DB error'));
    await expect(getCachedBills()).rejects.toThrow('DB error');
  });
});

// ─── fetchAndCacheBills ───────────────────────────────────────────────────────

describe('fetchAndCacheBills', () => {
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
    await expect(fetchAndCacheBills()).rejects.toThrow('CONGRESS_API_KEY');
  });

  test('fetches from /bill/119 and upserts bills', async () => {
    const apiBill = makeApiBill();
    const dbBill = makeDbBill();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bills: [apiBill] }),
    });
    mockPool.query.mockResolvedValueOnce({ rows: [dbBill] } as never);

    const result = await fetchAndCacheBills();

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/bill/119'));
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (api_id) DO UPDATE'),
      expect.any(Array)
    );
    expect(result).toEqual([dbBill]);
  });

  test('upserts each bill individually', async () => {
    const bill1 = makeApiBill({ number: '1' });
    const bill2 = makeApiBill({ number: '2', title: 'Second Bill' });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bills: [bill1, bill2] }),
    });
    mockPool.query
      .mockResolvedValueOnce({ rows: [makeDbBill({ bill_number: '1' })] } as never)
      .mockResolvedValueOnce({ rows: [makeDbBill({ id: 2, bill_number: '2', title: 'Second Bill' })] } as never);

    const result = await fetchAndCacheBills();

    expect(mockPool.query).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  test('returns empty array when API returns no bills', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bills: [] }),
    });

    expect(await fetchAndCacheBills()).toEqual([]);
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  test('throws on non-ok API response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' });
    await expect(fetchAndCacheBills()).rejects.toThrow('Congress.gov API error: 429 Too Many Requests');
  });
});

// ─── getBills ─────────────────────────────────────────────────────────────────

describe('getBills', () => {
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

  test('returns cache when bills exist in DB', async () => {
    const cached = [makeDbBill()];
    mockPool.query.mockResolvedValueOnce({ rows: cached } as never);

    const result = await getBills();

    expect(result.source).toBe('cache');
    expect(result.bills).toEqual(cached);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('fetches from API when DB is empty', async () => {
    const dbBill = makeDbBill();
    mockPool.query
      .mockResolvedValueOnce({ rows: [] } as never)
      .mockResolvedValueOnce({ rows: [dbBill] } as never);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bills: [makeApiBill()] }),
    });

    const result = await getBills();

    expect(result.source).toBe('api');
    expect(result.bills).toEqual([dbBill]);
  });
});

// ─── getBillDetail ────────────────────────────────────────────────────────────

describe('getBillDetail', () => {
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
    await expect(getBillDetail(119, 'hr', '134')).rejects.toThrow('CONGRESS_API_KEY');
  });

  test('fetches actions and summaries in parallel and returns with cached bill', async () => {
    const dbBill = makeDbBill();
    mockPool.query.mockResolvedValueOnce({ rows: [dbBill] } as never);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          actions: [{ actionDate: '2025-01-03', text: 'Referred to committee.', type: 'IntroReferral' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          summaries: [{ text: 'This bill does X.', actionDate: '2025-01-03', actionDesc: 'Introduced' }],
        }),
      });

    const result = await getBillDetail(119, 'hr', '134');

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/actions'));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/summaries'));
    expect(result.bill).toEqual(dbBill);
    expect(result.actions).toHaveLength(1);
    expect(result.summaries).toHaveLength(1);
  });

  test('returns null bill when not found in DB', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ actions: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ summaries: [] }) });

    const result = await getBillDetail(119, 'hr', '999');
    expect(result.bill).toBeNull();
  });

  test('returns empty arrays when API returns no actions or summaries', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    const result = await getBillDetail(119, 'hr', '134');
    expect(result.actions).toEqual([]);
    expect(result.summaries).toEqual([]);
  });

  test('throws on non-ok actions response', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ summaries: [] }) });

    await expect(getBillDetail(119, 'hr', '134')).rejects.toThrow('Congress.gov API error: 404 Not Found');
  });

  test('queries DB by correct api_id', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as never);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ actions: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ summaries: [] }) });

    await getBillDetail(119, 'hr', '134');
    expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), ['119/hr/134']);
  });
});

// ─── getBillText ──────────────────────────────────────────────────────────────

describe('getBillText', () => {
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
    await expect(getBillText(119, 'hr', '134')).rejects.toThrow('CONGRESS_API_KEY');
  });

  test('fetches from /text endpoint and returns textVersions', async () => {
    const versions = [
      {
        date: '2025-01-03',
        formats: [
          { type: 'Formatted Text', url: 'https://congress.gov/bill/119/hr/134/text/ih' },
          { type: 'PDF', url: 'https://congress.gov/bill/119/hr/134/text/ih.pdf' },
        ],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ textVersions: versions }),
    });

    const result = await getBillText(119, 'hr', '134');

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/text'));
    expect(result).toEqual(versions);
  });

  test('returns empty array when API returns no textVersions', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    expect(await getBillText(119, 'hr', '134')).toEqual([]);
  });

  test('throws on non-ok response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });
    await expect(getBillText(119, 'hr', '134')).rejects.toThrow('Congress.gov API error: 404 Not Found');
  });
});
