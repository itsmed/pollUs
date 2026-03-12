'use strict';

const express = require('express');
const { findLegislators } = require('../../services/geocodioService');

const router = express.Router();

/**
 * GET /find-representative-and-senator
 *
 * Geocodes the given US address via Geocodio and returns the congressional
 * representative and senators for that address.
 *
 * Query params:
 *   address {string} — Full US mailing address
 *
 * Response 200:
 *   { address: string; state: string; legislators: Legislator[] }
 *
 * Response 400:
 *   { error: string } — missing or empty address param
 *
 * Response 404:
 *   { error: string } — address not found or no district resolved
 *
 * Response 500:
 *   { error: string } — upstream API failure or unexpected error
 */
router.get('/', async (req, res) => {
  const { address } = req.query;

  if (!address || typeof address !== 'string' || address.trim() === '') {
    return res.status(400).json({ error: 'address query parameter is required' });
  }

  try {
    const result = await findLegislators(address.trim());
    res.json(result);
  } catch (err) {
    if (
      err.message === 'Address not found' ||
      err.message === 'No congressional district found for this address'
    ) {
      return res.status(404).json({ error: err.message });
    }
    console.error('GET /find-representative-and-senator error:', err);
    res.status(500).json({ error: 'Failed to find representatives' });
  }
});

module.exports = router;
