"use strict";

const pool = require("../db");

const CONGRESS_API_BASE = "https://api.congress.gov/v3";
const MEMBER_LIST_LIMIT = 250;
import { CURRENT_CONGRESS } from "../CONSTANTS";

/**
 * Returns all members from the database cache.
 * @returns {Promise<Array>} Rows from the members table, or empty array.
 */
async function getCachedMembers() {
  const result = await pool.query(
    "SELECT id, name, state, district, role, party, photo_url, api_id FROM members ORDER BY name ASC",
  );
  return result.rows;
}

/**
 * Maps a Congress.gov API member object to the database schema.
 * @param {Object} apiMember - Member object from the Congress.gov API.
 * @returns {Object} Mapped member object.
 */
function mapApiMember(apiMember) {
  const isRepresentative = apiMember.district != null;

  return {
    name: apiMember.name,
    state: apiMember.state,
    district: isRepresentative ? String(apiMember.district) : null,
    role: isRepresentative ? "Representative" : "Senator",
    party: apiMember.partyName ?? "Unknown",
    api_id: apiMember.bioguideId,
    photo_url: apiMember.depiction?.imageUrl ?? null,
  };
}

/**
 * Fetches all members from the Congress.gov API, pages through all results,
 * writes them to the database, and returns the full list.
 * @returns {Promise<Array>} Inserted member rows.
 */
async function fetchAndCacheMembers() {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    throw new Error("CONGRESS_API_KEY environment variable is not set");
  }

  const allMembers = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${CONGRESS_API_BASE}/member/congress/${CURRENT_CONGRESS}?api_key=${apiKey}&limit=${MEMBER_LIST_LIMIT}&offset=${offset}&format=json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Congress.gov API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const members = data.members ?? [];
    allMembers.push(...members);

    const pagination = data.pagination;
    hasMore = pagination && offset + members.length < pagination.count;
    offset += members.length;
  }

  if (allMembers.length === 0) {
    return [];
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const inserted = [];
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
        [m.name, m.state, m.district, m.role, m.party, m.api_id, m.photo_url],
      );
      inserted.push(result.rows[0]);
    }

    await client.query("COMMIT");
    return inserted;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Returns members from the database if cached, otherwise fetches from the
 * Congress.gov API, writes to the database, and returns the result.
 * @returns {Promise<{ members: Array, source: 'cache'|'api' }>}
 */
async function getMembers() {
  const cached = await getCachedMembers();
  if (cached.length > 0) {
    return { members: cached, source: "cache" };
  }

  const members = await fetchAndCacheMembers();
  return { members, source: "api" };
}

/**
 * Fetches detailed information for a single member from the Congress.gov API.
 * Not cached — returns fresh data on every call.
 *
 * @param {string} bioguideId - Congress.gov bioguide ID, e.g. "Y000064"
 * @returns {Promise<Object|null>} Raw member object from Congress.gov
 */
async function getMemberDetail(bioguideId) {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    throw new Error("CONGRESS_API_KEY environment variable is not set");
  }

  const url = `${CONGRESS_API_BASE}/member/${bioguideId}?api_key=${apiKey}&format=json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Congress.gov API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data.member ?? null;
}

/**
 * Computes how often a user's votes on congressional roll-calls agree with a
 * specific member's votes.
 *
 * House members are matched by bioguide ID (stored directly in vote_positions).
 * Senate members are matched by last name + party initial (the vote JSON stores
 * LIS IDs, not bioguide IDs, so direct ID matching fails for senators).
 *
 * Only votes where the user chose 'Yea' or 'Nay' are counted — Abstain is
 * excluded because it doesn't represent a meaningful stance to compare.
 *
 * Agreement is defined as:
 *   User Yea  ↔ Member Yea or Aye
 *   User Nay  ↔ Member Nay or No
 *
 * @param {number} userId
 * @param {string} bioguideId  — e.g. "Y000064"
 * @returns {Promise<{ agree: number, total: number, percentage: number|null }>}
 */
async function getMemberAgreement(userId, bioguideId) {
  // Look up the cached member row to determine role, name, and party.
  const memberResult = await pool.query(
    "SELECT role, name, party FROM members WHERE api_id = $1",
    [bioguideId],
  );

  if (memberResult.rows.length === 0) {
    return { agree: 0, total: 0, percentage: null };
  }

  const { role, name, party } = memberResult.rows[0];
  const isSenator = role === "Senator";

  let rows;

  if (!isSenator) {
    // House: vote_positions.legislator_id = bioguide ID
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
      [bioguideId, userId],
    ));
  } else {
    // Senate: match by last_name + party initial (LIS IDs differ from bioguide)
    const lastName = name.split(",")[0].trim();
    const partyInitial = party.startsWith("Democrat")
      ? "D"
      : party.startsWith("Republican")
        ? "R"
        : "I";

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
      [lastName, partyInitial, userId],
    ));
  }

  const agree = rows[0].agree_count;
  const total = rows[0].total_count;
  const percentage = total > 0 ? Math.round((agree / total) * 100) : null;

  return { agree, total, percentage };
}

/**
 * Returns the individual congressional votes that both the user and the
 * specified member participated in, along with each party's position.
 * Uses the same matching strategy as getMemberAgreement.
 *
 * @param {number} userId
 * @param {string} bioguideId
 * @returns {Promise<Array>}
 */
async function getMemberSharedVotes(userId, bioguideId) {
  const memberResult = await pool.query(
    "SELECT role, name, party FROM members WHERE api_id = $1",
    [bioguideId],
  );

  if (memberResult.rows.length === 0) return [];

  const { role, name, party } = memberResult.rows[0];
  const isSenator = role === "Senator";

  const agreedExpr = `
    CASE WHEN
      (ucv.position = 'Yea' AND vp.position IN ('Yea', 'Aye')) OR
      (ucv.position = 'Nay' AND vp.position IN ('Nay', 'No'))
    THEN true ELSE false END`;

  let rows;

  if (!isSenator) {
    ({ rows } = await pool.query(
      `SELECT
         cv.vote_id,
         cv.question,
         cv.date,
         cv.category,
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
      [bioguideId, userId],
    ));
  } else {
    const lastName = name.split(",")[0].trim();
    const partyInitial = party.startsWith("Democrat")
      ? "D"
      : party.startsWith("Republican")
        ? "R"
        : "I";

    ({ rows } = await pool.query(
      `SELECT
         cv.vote_id,
         cv.question,
         cv.date,
         cv.category,
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
      [lastName, partyInitial, userId],
    ));
  }

  return rows;
}

module.exports = {
  getMembers,
  getCachedMembers,
  fetchAndCacheMembers,
  mapApiMember,
  getMemberDetail,
  getMemberAgreement,
  getMemberSharedVotes,
};
