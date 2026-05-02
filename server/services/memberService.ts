import pool from '../db';
import { CURRENT_CONGRESS } from '../CONSTANTS';
import type { PoolClient } from 'pg';

const CONGRESS_API_BASE = 'https://api.congress.gov/v3';
const MEMBER_LIST_LIMIT = 250;

interface ApiMember {
  bioguideId: string;
  name: string;
  state: string;
  district?: number | null;
  partyName?: string;
  depiction?: { imageUrl?: string };
}

interface DbMember {
  id: number;
  name: string;
  state: string;
  district: string | null;
  role: string;
  party: string;
  api_id: string;
  photo_url: string | null;
}

async function getCachedMembers(): Promise<DbMember[]> {
  const result = await pool.query(
    'SELECT id, name, state, district, role, party, photo_url, api_id FROM members ORDER BY name ASC'
  );
  return result.rows as DbMember[];
}

function mapApiMember(apiMember: ApiMember): Omit<DbMember, 'id'> {
  const isRepresentative = apiMember.district != null;
  return {
    name: apiMember.name,
    state: apiMember.state,
    district: isRepresentative ? String(apiMember.district) : null,
    role: isRepresentative ? 'Representative' : 'Senator',
    party: apiMember.partyName ?? 'Unknown',
    api_id: apiMember.bioguideId,
    photo_url: apiMember.depiction?.imageUrl ?? null,
  };
}

async function fetchAndCacheMembers(): Promise<DbMember[]> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) throw new Error('CONGRESS_API_KEY environment variable is not set');

  const allMembers: ApiMember[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${CONGRESS_API_BASE}/member/congress/${CURRENT_CONGRESS}?api_key=${apiKey}&limit=${MEMBER_LIST_LIMIT}&offset=${offset}&format=json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Congress.gov API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { members?: ApiMember[]; pagination?: { count: number } };
    const members = data.members ?? [];
    allMembers.push(...members);

    const pagination = data.pagination;
    hasMore = !!pagination && offset + members.length < pagination.count;
    offset += members.length;
  }

  if (allMembers.length === 0) return [];

  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted: DbMember[] = [];
    for (const apiMember of allMembers) {
      const m = mapApiMember(apiMember);
      const result = await client.query(
        `INSERT INTO members (name, state, district, role, party, api_id, photo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (api_id) DO UPDATE SET
           name      = EXCLUDED.name,
           state     = EXCLUDED.state,
           district  = EXCLUDED.district,
           role      = EXCLUDED.role,
           party     = EXCLUDED.party,
           photo_url = EXCLUDED.photo_url
         RETURNING id, name, state, district, role, party, photo_url, api_id`,
        [m.name, m.state, m.district, m.role, m.party, m.api_id, m.photo_url]
      );
      inserted.push(result.rows[0] as DbMember);
    }
    await client.query('COMMIT');
    return inserted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getMembers(): Promise<{ members: DbMember[]; source: 'cache' | 'api' }> {
  const cached = await getCachedMembers();
  if (cached.length > 0) return { members: cached, source: 'cache' };
  const members = await fetchAndCacheMembers();
  return { members, source: 'api' };
}

async function getMemberDetail(bioguideId: string): Promise<unknown | null> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) throw new Error('CONGRESS_API_KEY environment variable is not set');

  const url = `${CONGRESS_API_BASE}/member/${bioguideId}?api_key=${apiKey}&format=json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Congress.gov API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { member?: unknown };
  return data.member ?? null;
}

async function getMemberAgreement(
  userId: number,
  bioguideId: string
): Promise<{ agree: number; total: number; percentage: number | null }> {
  const memberResult = await pool.query(
    'SELECT role, name, party FROM members WHERE api_id = $1',
    [bioguideId]
  );

  if (memberResult.rows.length === 0) return { agree: 0, total: 0, percentage: null };

  const { role, name, party } = memberResult.rows[0] as { role: string; name: string; party: string };
  const isSenator = role === 'Senator';

  let rows: Array<{ agree_count: number; total_count: number }>;

  if (!isSenator) {
    ({ rows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE
           (ucv.position = 'Yea' AND vp.position IN ('Yea', 'Aye')) OR
           (ucv.position = 'Nay' AND vp.position IN ('Nay', 'No'))
         )::integer AS agree_count,
         COUNT(*)::integer AS total_count
       FROM user_congressional_votes ucv
       JOIN congressional_votes cv ON cv.id = ucv.congressional_vote_id
       JOIN vote_positions vp ON vp.vote_id = cv.id
         AND vp.legislator_id = $1
       WHERE ucv.user_id = $2
         AND ucv.position IN ('Yea', 'Nay')`,
      [bioguideId, userId]
    ));
  } else {
    const lastName = name.split(',')[0].trim();
    const partyInitial = party.startsWith('Democrat') ? 'D' : party.startsWith('Republican') ? 'R' : 'I';

    ({ rows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE
           (ucv.position = 'Yea' AND vp.position IN ('Yea', 'Aye')) OR
           (ucv.position = 'Nay' AND vp.position IN ('Nay', 'No'))
         )::integer AS agree_count,
         COUNT(*)::integer AS total_count
       FROM user_congressional_votes ucv
       JOIN congressional_votes cv ON cv.id = ucv.congressional_vote_id
       JOIN vote_positions vp ON vp.vote_id = cv.id
         AND vp.last_name = $1
         AND vp.party = $2
       WHERE ucv.user_id = $3
         AND ucv.position IN ('Yea', 'Nay')`,
      [lastName, partyInitial, userId]
    ));
  }

  const agree = rows[0].agree_count;
  const total = rows[0].total_count;
  const percentage = total > 0 ? Math.round((agree / total) * 100) : null;

  return { agree, total, percentage };
}

async function getMemberSharedVotes(userId: number, bioguideId: string): Promise<unknown[]> {
  const memberResult = await pool.query(
    'SELECT role, name, party FROM members WHERE api_id = $1',
    [bioguideId]
  );

  if (memberResult.rows.length === 0) return [];

  const { role, name, party } = memberResult.rows[0] as { role: string; name: string; party: string };
  const isSenator = role === 'Senator';

  const agreedExpr = `
    CASE WHEN
      (ucv.position = 'Yea' AND vp.position IN ('Yea', 'Aye')) OR
      (ucv.position = 'Nay' AND vp.position IN ('Nay', 'No'))
    THEN true ELSE false END`;

  let rows: unknown[];

  if (!isSenator) {
    ({ rows } = await pool.query(
      `SELECT
         cv.vote_id, cv.question, cv.date, cv.category,
         ucv.position  AS user_position,
         vp.position   AS member_position,
         ${agreedExpr} AS agreed
       FROM user_congressional_votes ucv
       JOIN congressional_votes cv ON cv.id = ucv.congressional_vote_id
       JOIN vote_positions vp ON vp.vote_id = cv.id
         AND vp.legislator_id = $1
       WHERE ucv.user_id = $2
         AND ucv.position IN ('Yea', 'Nay')
       ORDER BY cv.date DESC`,
      [bioguideId, userId]
    ));
  } else {
    const lastName = name.split(',')[0].trim();
    const partyInitial = party.startsWith('Democrat') ? 'D' : party.startsWith('Republican') ? 'R' : 'I';

    ({ rows } = await pool.query(
      `SELECT
         cv.vote_id, cv.question, cv.date, cv.category,
         ucv.position  AS user_position,
         vp.position   AS member_position,
         ${agreedExpr} AS agreed
       FROM user_congressional_votes ucv
       JOIN congressional_votes cv ON cv.id = ucv.congressional_vote_id
       JOIN vote_positions vp ON vp.vote_id = cv.id
         AND vp.last_name = $1
         AND vp.party    = $2
       WHERE ucv.user_id = $3
         AND ucv.position IN ('Yea', 'Nay')
       ORDER BY cv.date DESC`,
      [lastName, partyInitial, userId]
    ));
  }

  return rows;
}

export {
  getMembers, getCachedMembers, fetchAndCacheMembers,
  mapApiMember, getMemberDetail, getMemberAgreement, getMemberSharedVotes,
};
