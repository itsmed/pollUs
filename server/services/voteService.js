'use strict';

const pool = require('../db');

/**
 * Returns a page of vote records from the database, ordered by date descending.
 *
 * @param {{ limit?: number, offset?: number, chamber?: 'h'|'s' }} opts
 * @returns {Promise<{ votes: object[], total: number }>}
 */
async function getVotes({ limit = 50, offset = 0, chamber } = {}) {
  const params = [limit, offset];
  const whereClause = chamber ? `WHERE chamber = $3` : '';
  if (chamber) params.push(chamber);

  const [rowsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT * FROM congressional_votes
       ${whereClause}
       ORDER BY date DESC
       LIMIT $1 OFFSET $2`,
      params
    ),
    pool.query(
      `SELECT COUNT(*)::integer AS total FROM congressional_votes ${whereClause}`,
      chamber ? [chamber] : []
    ),
  ]);

  return {
    votes: rowsResult.rows,
    total: countResult.rows[0].total,
  };
}

/**
 * Returns a single vote record, its member positions, and the adjacent vote IDs
 * (prev = older, next = newer) in date-descending order, optionally scoped to
 * the same chamber.
 *
 * @param {string} voteId   e.g. "h75-119.2025"
 * @param {string} [chamber] optional 'h' or 's' to scope prev/next navigation
 * @returns {Promise<{ vote: object, positions: Record<string, object[]>, prev_vote_id: string|null, next_vote_id: string|null } | null>}
 */
async function getVoteDetail(voteId, chamber) {
  const voteResult = await pool.query(
    'SELECT * FROM congressional_votes WHERE vote_id = $1',
    [voteId]
  );

  if (voteResult.rows.length === 0) return null;

  const vote = voteResult.rows[0];

  const chamberFilter = chamber ? `AND chamber = '${chamber === 'h' ? 'h' : 's'}'` : '';

  const [positionsResult, adjacentResult] = await Promise.all([
    pool.query(
      `SELECT position, legislator_id, display_name,
              first_name, last_name, party, state
       FROM vote_positions
       WHERE vote_id = $1
       ORDER BY position, last_name, display_name`,
      [vote.id]
    ),
    pool.query(
      `SELECT prev_vote_id, next_vote_id FROM (
         SELECT
           vote_id,
           LAG(vote_id)  OVER (ORDER BY date DESC) AS next_vote_id,
           LEAD(vote_id) OVER (ORDER BY date DESC) AS prev_vote_id
         FROM congressional_votes
         WHERE 1=1 ${chamberFilter}
       ) sub
       WHERE vote_id = $1`,
      [voteId]
    ),
  ]);

  /** @type {Record<string, object[]>} */
  const positions = {};
  for (const row of positionsResult.rows) {
    const { position, ...legislator } = row;
    if (!positions[position]) positions[position] = [];
    positions[position].push(legislator);
  }

  const adjacent = adjacentResult.rows[0] ?? {};

  return {
    vote,
    positions,
    prev_vote_id: adjacent.prev_vote_id ?? null,
    next_vote_id: adjacent.next_vote_id ?? null,
  };
}

module.exports = { getVotes, getVoteDetail };
