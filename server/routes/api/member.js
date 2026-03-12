'use strict';

const express = require('express');
const { getMembers } = require('../../services/memberService');

const router = express.Router();

/**
 * GET /api/member
 *
 * Returns a list of all congressional members. Checks the database cache
 * first; if empty, fetches from the Congress.gov API and persists the results.
 *
 * Response 200:
 *   { source: 'cache'|'api', count: number, members: Member[] }
 *
 * Response 500:
 *   { error: string }
 */
router.get('/', async (req, res) => {
  try {
    const { members, source } = await getMembers();
    res.json({ source, count: members.length, members });
  } catch (err) {
    console.error('GET /api/member error:', err);
    res.status(500).json({ error: 'Failed to retrieve members' });
  }
});

module.exports = router;
