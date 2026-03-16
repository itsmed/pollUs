'use strict';

const express = require('express');
const { getVotes, getVoteDetail } = require('../../services/voteService');

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

module.exports = router;
