'use strict';

const express = require('express');
const { getBills, getBillDetail, getBillText } = require('../../services/billService');

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

/**
 * GET /api/bill/:congress/:type/:number
 *
 * Returns detailed information for a single bill: the cached bill record
 * from the database (if present), plus its full action history and summaries
 * fetched fresh from the Congress.gov API.
 *
 * Params:
 *   congress {string} — Congress number, e.g. "119"
 *   type     {string} — Lowercase bill type, e.g. "hr" or "s"
 *   number   {string} — Bill number, e.g. "134"
 *
 * Response 200:
 *   { bill: Bill|null, actions: Action[], summaries: Summary[] }
 *
 * Response 500:
 *   { error: string }
 */
router.get('/:congress/:type/:number', async (req, res) => {
  const { congress, type, number } = req.params;
  try {
    const detail = await getBillDetail(congress, type.toLowerCase(), number);
    res.json(detail);
  } catch (err) {
    console.error(`GET /api/bill/${congress}/${type}/${number} error:`, err);
    res.status(500).json({ error: 'Failed to retrieve bill detail' });
  }
});

/**
 * GET /api/bill/:congress/:type/:number/text
 *
 * Returns the available text versions for a bill (HTML, PDF, XML links).
 * Always fetched live from the Congress.gov API.
 *
 * Response 200:
 *   { textVersions: TextVersion[] }
 *
 * Response 500:
 *   { error: string }
 */
router.get('/:congress/:type/:number/text', async (req, res) => {
  const { congress, type, number } = req.params;
  try {
    const textVersions = await getBillText(congress, type.toLowerCase(), number);
    res.json({ textVersions });
  } catch (err) {
    console.error(`GET /api/bill/${congress}/${type}/${number}/text error:`, err);
    res.status(500).json({ error: 'Failed to retrieve bill text' });
  }
});

module.exports = router;
