'use strict';

const express = require('express');
const { getBills } = require('../../services/billService');

const router = express.Router();

/**
 * GET /api/bill
 *
 * Returns bills for the current congress. Checks the database cache first;
 * if empty, fetches from the Congress.gov API and upserts the results.
 *
 * Response 200:
 *   { source: 'cache'|'api', count: number, bills: Bill[] }
 *
 * Response 500:
 *   { error: string }
 */
router.get('/', async (req, res) => {
  try {
    const { bills, source } = await getBills();
    res.json({ source, count: bills.length, bills });
  } catch (err) {
    console.error('GET /api/bill error:', err);
    res.status(500).json({ error: 'Failed to retrieve bills' });
  }
});

module.exports = router;
