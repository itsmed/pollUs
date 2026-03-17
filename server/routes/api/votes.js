'use strict';

const express = require('express');
const { getVotes, getVoteDetail } = require('../../services/voteService');
const {
  upsertUserCongressionalVote,
  getUserCongressionalVote,
} = require('../../services/userCongressionalVoteService');

const VALID_POSITIONS = new Set(['Yea', 'Nay', 'Abstain']);

const router = express.Router();

/**
 * GET /api/votes
 *
 * Returns a paginated list of congressional votes from the database,
 * ordered by date descending.
 *
 * Query params:
 *   limit   {number}  rows per page (default 50, max 200)
 *   offset  {number}  rows to skip  (default 0)
 *   chamber {'h'|'s'} filter by chamber (optional)
 *
 * Response 200:
 *   { total: number, limit: number, offset: number, chamber: string|null, votes: Vote[] }
 *
 * Response 500:
 *   { error: string }
 */
router.get('/', async (req, res) => {
  try {
    const limit   = Math.min(Number(req.query.limit)  || 50, 200);
    const offset  = Math.max(Number(req.query.offset) || 0,  0);
    const chamber = ['h', 's'].includes(req.query.chamber) ? req.query.chamber : undefined;

    const { votes, total } = await getVotes({ limit, offset, chamber });
    res.json({ total, limit, offset, chamber: chamber ?? null, votes });
  } catch (err) {
    console.error('GET /api/votes error:', err);
    res.status(500).json({ error: 'Failed to retrieve votes' });
  }
});

/**
 * GET /api/votes/:voteId
 *
 * Returns a single vote with its full member positions.
 *
 * Response 200:
 *   { vote: Vote, positions: Record<string, Legislator[]> }
 *
 * Response 404:
 *   { error: string }
 *
 * Response 500:
 *   { error: string }
 */
router.get('/:voteId', async (req, res) => {
  try {
    const chamber = ['h', 's'].includes(req.query.chamber) ? req.query.chamber : undefined;
    const result = await getVoteDetail(req.params.voteId, chamber);
    if (!result) {
      return res.status(404).json({ error: 'Vote not found' });
    }
    res.json(result);
  } catch (err) {
    console.error('GET /api/votes/:voteId error:', err);
    res.status(500).json({ error: 'Failed to retrieve vote detail' });
  }
});

/**
 * GET /api/votes/:voteId/user-vote
 *
 * Returns the authenticated user's position on this vote, or null if they
 * haven't voted yet.
 *
 * Response 200:
 *   { vote: UserCongressionalVote | null }
 *
 * Response 401:
 *   { error: string }
 */
router.get('/:voteId/user-vote', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const vote = await getUserCongressionalVote(req.user.id, req.params.voteId);
    res.json({ vote });
  } catch (err) {
    console.error('GET /api/votes/:voteId/user-vote error:', err);
    res.status(500).json({ error: 'Failed to retrieve user vote' });
  }
});

/**
 * POST /api/votes/:voteId/user-vote
 *
 * Casts or updates the authenticated user's position on this vote.
 *
 * Body:
 *   { position: 'Yea' | 'Nay' | 'Abstain' }
 *
 * Response 200:
 *   { vote: UserCongressionalVote }
 *
 * Response 400:
 *   { error: string }
 *
 * Response 401 / 404 / 500:
 *   { error: string }
 */
router.post('/:voteId/user-vote', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { position } = req.body;
  if (!VALID_POSITIONS.has(position)) {
    return res.status(400).json({ error: 'position must be one of: Yea, Nay, Abstain' });
  }
  try {
    const vote = await upsertUserCongressionalVote(req.user.id, req.params.voteId, position);
    res.json({ vote });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ error: 'Vote not found' });
    }
    console.error('POST /api/votes/:voteId/user-vote error:', err);
    res.status(500).json({ error: 'Failed to save user vote' });
  }
});

module.exports = router;
