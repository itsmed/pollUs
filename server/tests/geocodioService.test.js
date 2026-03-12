'use strict';

jest.mock('../CONSTANTS', () => ({ CURRENT_CONGRESS: 119 }));

const { findLegislators, mapGeocodioLegislator } = require('../services/geocodioService');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeGeocodioLegislator = (overrides = {}) => ({
  type: 'representative',
  seniority: null,
  bio: {
    first_name: 'Donald',
    last_name: 'Beyer',
    birthday: '1950-06-20',
    gender: 'M',
    party: 'Democrat',
    photo_url: 'https://www.congress.gov/img/member/b001292_200.jpg',
  },
  contact: {
    url: 'https://beyer.house.gov',
    address: '1226 Longworth House Office Building Washington DC 20515-4608',
    phone: '202-225-4376',
    contact_form: null,
  },
  references: {
    bioguide_id: 'B001292',
  },
  ...overrides,
});

const makeSenator = (overrides = {}) =>
  makeGeocodioLegislator({
    type: 'senator',
    seniority: 'junior',
    bio: {
      first_name: 'Tim',
      last_name: 'Kaine',
      birthday: '1958-02-26',
      gender: 'M',
      party: 'Democrat',
      photo_url: 'https://www.congress.gov/img/member/k000384_200.jpg',
    },
    references: { bioguide_id: 'K000384' },
    ...overrides,
  });

const makeGeocodioResult = (overrides = {}) => ({
  formatted_address: '1109 N Highland St, Arlington, VA 22201',
  address_components: { state: 'VA' },
  fields: {
    congressional_districts: [
      {
        name: 'Congressional District 8',
        district_number: 8,
        proportion: 1,
        current_legislators: [makeGeocodioLegislator(), makeSenator()],
      },
    ],
  },
  ...overrides,
});

// ─── mapGeocodioLegislator ────────────────────────────────────────────────────

describe('mapGeocodioLegislator', () => {
  test('maps a representative correctly', () => {
    const result = mapGeocodioLegislator(makeGeocodioLegislator(), 'VA', 8);
    expect(result).toEqual({
      name: 'Donald Beyer',
      role: 'Representative',
      party: 'Democrat',
      photo_url: 'https://www.congress.gov/img/member/b001292_200.jpg',
      api_id: 'B001292',
      state: 'VA',
      district: '8',
    });
  });

  test('maps a senator correctly — no district', () => {
    const result = mapGeocodioLegislator(makeSenator(), 'VA', 8);
    expect(result.role).toBe('Senator');
    expect(result.district).toBeNull();
    expect(result.name).toBe('Tim Kaine');
    expect(result.api_id).toBe('K000384');
  });

  test('defaults party to "Unknown" when bio.party is missing', () => {
    const leg = makeGeocodioLegislator({ bio: { ...makeGeocodioLegislator().bio, party: undefined } });
    expect(mapGeocodioLegislator(leg, 'VA', 8).party).toBe('Unknown');
  });

  test('sets photo_url to null when bio.photo_url is missing', () => {
    const leg = makeGeocodioLegislator({ bio: { ...makeGeocodioLegislator().bio, photo_url: undefined } });
    expect(mapGeocodioLegislator(leg, 'VA', 8).photo_url).toBeNull();
  });

  test('sets district to null when districtNumber is null', () => {
    expect(mapGeocodioLegislator(makeGeocodioLegislator(), 'VA', null).district).toBeNull();
  });
});

// ─── findLegislators ──────────────────────────────────────────────────────────

describe('findLegislators', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GEOCOD_API_KEY: 'test-key' };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    delete global.fetch;
  });

  test('throws when GEOCOD_API_KEY is missing', async () => {
    delete process.env.GEOCOD_API_KEY;
    await expect(findLegislators('1109 N Highland St, Arlington VA')).rejects.toThrow(
      'GEOCOD_API_KEY'
    );
  });

  test('calls Geocodio with cd119 field and returns mapped legislators', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [makeGeocodioResult()] }),
    });

    const result = await findLegislators('1109 N Highland St, Arlington VA');

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('cd119'));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('geocode'));
    expect(result.address).toBe('1109 N Highland St, Arlington, VA 22201');
    expect(result.state).toBe('VA');
    expect(result.legislators).toHaveLength(2);
  });

  test('returns one representative and one senator', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [makeGeocodioResult()] }),
    });

    const { legislators } = await findLegislators('1109 N Highland St, Arlington VA');

    const rep = legislators.find((l) => l.role === 'Representative');
    const sen = legislators.find((l) => l.role === 'Senator');

    expect(rep).toBeDefined();
    expect(rep.district).toBe('8');
    expect(sen).toBeDefined();
    expect(sen.district).toBeNull();
  });

  test('throws on non-ok API response', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 422, statusText: 'Unprocessable Entity' });
    await expect(findLegislators('bad address')).rejects.toThrow(
      'Geocodio API error: 422 Unprocessable Entity'
    );
  });

  test('throws when no results returned', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    });
    await expect(findLegislators('nowhere')).rejects.toThrow('Address not found');
  });

  test('throws when no congressional district in result', async () => {
    const resultWithNoDistrict = makeGeocodioResult({
      fields: { congressional_districts: [] },
    });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [resultWithNoDistrict] }),
    });
    await expect(findLegislators('1109 N Highland St')).rejects.toThrow(
      'No congressional district found for this address'
    );
  });

  test('picks district with highest proportion when multiple returned', async () => {
    const resultWithTwo = makeGeocodioResult({
      fields: {
        congressional_districts: [
          {
            name: 'Congressional District 8',
            district_number: 8,
            proportion: 0.3,
            current_legislators: [makeGeocodioLegislator()],
          },
          {
            name: 'Congressional District 11',
            district_number: 11,
            proportion: 0.7,
            current_legislators: [makeGeocodioLegislator({ references: { bioguide_id: 'C000001' } })],
          },
        ],
      },
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [resultWithTwo] }),
    });

    const { legislators } = await findLegislators('1109 N Highland St, Arlington VA');
    expect(legislators[0].district).toBe('11');
  });

  test('encodes address in query string', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [makeGeocodioResult()] }),
    });

    await findLegislators('123 Main St, Springfield IL');

    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).toContain('123+Main+St');
  });
});
