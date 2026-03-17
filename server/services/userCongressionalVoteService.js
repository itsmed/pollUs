'use strict';

const pool = require('../db');

/**
 * Upserts the user's position on a congressional vote.
 * If the user has already voted, their position is updated.
 *
 * @param {number} userId
 * @param {string} voteId  — vote_id string, e.g. "h75-119.2025"
 * @param {'Yea'|'Nay'|'Abstain'} position
 * @returns {Promise<object>} the saved user_congressional_votes row
 */
async function upsertUserCongressionalVote(userId, voteId, position) {
  const voteResult = await pool.query(
    'SELECT id FROM congressional_votes WHERE vote_id = $1',
    [voteId]
  );
  if (voteResult.rows.length === 0) {
    const err = new Error('Vote not found');
    err.status = 404;
    throw err;
  }

  const congressionalVoteId = voteResult.rows[0].id;

  const { rows } = await pool.query(
    `INSERT INTO user_congressional_votes (user_id, congressional_vote_id, position)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, congressional_vote_id) DO UPDATE
       SET position = EXCLUDED.position, updated_at = NOW()
     RETURNING *`,
    [userId, congressionalVoteId, position]
  );

  return rows[0];
}

/**
 * Returns the user's position on a congressional vote, or null if they
 * haven't voted yet.
 *
 * @param {number} userId
 * @param {string} voteId  — vote_id string, e.g. "h75-119.2025"
 * @returns {Promise<object|null>}
 */
async function getUserCongressionalVote(userId, voteId) {
  const { rows } = await pool.query(
    `SELECT ucv.*
       FROM user_congressional_votes ucv
       JOIN congressional_votes cv ON cv.id = ucv.congressional_vote_id
      WHERE ucv.user_id = $1 AND cv.vote_id = $2`,
    [userId, voteId]
  );
  return rows[0] ?? null;
}

module.exports = { upsertUserCongressionalVote, getUserCongressionalVote };
