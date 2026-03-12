'use strict';

const pool = require('../db');
const { CURRENT_CONGRESS } = require('../CONSTANTS');

const CONGRESS_API_BASE = 'https://api.congress.gov/v3';
const BILL_LIST_LIMIT = 250;

const BILL_COLUMNS = `
  id, title, origin_chamber, bill_type, bill_number, congress_number,
  latest_action_text, latest_action_date, update_date, api_id, url
`;

/**
 * Returns all cached bills for the current congress from the database.
 * @returns {Promise<Array>}
 */
async function getCachedBills() {
  const result = await pool.query(
    `SELECT ${BILL_COLUMNS}
     FROM bills
     WHERE congress_number = $1
     ORDER BY update_date DESC NULLS LAST, id DESC`,
    [CURRENT_CONGRESS]
  );
  return result.rows;
}

/**
 * Maps a Congress.gov API bill object to the database schema.
 * @param {Object} apiBill - Bill object from the Congress.gov API.
 * @returns {Object} Mapped bill object.
 */
function mapApiBill(apiBill) {
  const typeStr = (apiBill.type ?? '').toLowerCase();
  return {
    title: apiBill.title ?? 'Untitled',
    origin_chamber: apiBill.originChamber ?? null,
    bill_type: apiBill.type ?? null,
    bill_number: apiBill.number != null ? String(apiBill.number) : null,
    congress_number: apiBill.congress ?? null,
    latest_action_text: apiBill.latestAction?.text ?? null,
    latest_action_date: apiBill.latestAction?.actionDate ?? null,
    update_date: apiBill.updateDate ?? null,
    api_id: `${apiBill.congress}/${typeStr}/${apiBill.number}`,
    url: apiBill.url ?? null,
  };
}

/**
 * Fetches the most recent bills for the current Congress from the Congress.gov API,
 * upserts them into the database, and returns the stored rows.
 *
 * Uses ON CONFLICT DO UPDATE to preserve FK relationships (votes, comments)
 * while refreshing metadata like latest action and update date.
 *
 * @returns {Promise<Array>} Upserted bill rows.
 */
async function fetchAndCacheBills() {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    throw new Error('CONGRESS_API_KEY environment variable is not set');
  }

  const url = `${CONGRESS_API_BASE}/bill/${CURRENT_CONGRESS}?api_key=${apiKey}&limit=${BILL_LIST_LIMIT}&format=json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Congress.gov API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const bills = data.bills ?? [];

  if (bills.length === 0) {
    return [];
  }

  const inserted = [];
  for (const apiBill of bills) {
    const b = mapApiBill(apiBill);
    const result = await pool.query(
      `INSERT INTO bills
         (title, origin_chamber, bill_type, bill_number, congress_number,
          latest_action_text, latest_action_date, update_date, api_id, url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (api_id) DO UPDATE SET
         title               = EXCLUDED.title,
         origin_chamber      = EXCLUDED.origin_chamber,
         latest_action_text  = EXCLUDED.latest_action_text,
         latest_action_date  = EXCLUDED.latest_action_date,
         update_date         = EXCLUDED.update_date,
         url                 = EXCLUDED.url
       RETURNING ${BILL_COLUMNS}`,
      [
        b.title, b.origin_chamber, b.bill_type, b.bill_number, b.congress_number,
        b.latest_action_text, b.latest_action_date, b.update_date, b.api_id, b.url,
      ]
    );
    inserted.push(result.rows[0]);
  }

  return inserted;
}

/**
 * Returns bills from the database if cached, otherwise fetches from the
 * Congress.gov API for the current congress and upserts the results.
 * @returns {Promise<{ bills: Array, source: 'cache'|'api' }>}
 */
async function getBills() {
  const cached = await getCachedBills();
  if (cached.length > 0) {
    return { bills: cached, source: 'cache' };
  }

  const bills = await fetchAndCacheBills();
  return { bills, source: 'api' };
}

/**
 * Fetches a bill's actions and summaries from the Congress.gov API in parallel,
 * and returns them alongside the bill's basic info from the database (if cached).
 *
 * Actions and summaries are always fetched fresh — they are not cached locally.
 *
 * @param {number|string} congress - Congress number, e.g. 119
 * @param {string} type - Lowercase bill type, e.g. "hr" or "s"
 * @param {string} number - Bill number, e.g. "134"
 * @returns {Promise<{ bill: Object|null, actions: Array, summaries: Array }>}
 */
async function getBillDetail(congress, type, number) {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    throw new Error('CONGRESS_API_KEY environment variable is not set');
  }

  const dbResult = await pool.query(
    `SELECT ${BILL_COLUMNS} FROM bills WHERE api_id = $1`,
    [`${congress}/${type}/${number}`]
  );

  const baseUrl = `${CONGRESS_API_BASE}/bill/${congress}/${type}/${number}`;
  const [actionsRes, summariesRes] = await Promise.all([
    fetch(`${baseUrl}/actions?api_key=${apiKey}&format=json&limit=250`),
    fetch(`${baseUrl}/summaries?api_key=${apiKey}&format=json`),
  ]);

  if (!actionsRes.ok) {
    throw new Error(`Congress.gov API error: ${actionsRes.status} ${actionsRes.statusText}`);
  }
  if (!summariesRes.ok) {
    throw new Error(`Congress.gov API error: ${summariesRes.status} ${summariesRes.statusText}`);
  }

  const [actionsData, summariesData] = await Promise.all([
    actionsRes.json(),
    summariesRes.json(),
  ]);

  return {
    bill: dbResult.rows[0] ?? null,
    actions: actionsData.actions ?? [],
    summaries: summariesData.summaries ?? [],
  };
}

/**
 * Fetches the available text versions for a bill from the Congress.gov API.
 * Each version includes a date and a list of format links (HTML, PDF, XML).
 *
 * @param {number|string} congress
 * @param {string} type - Lowercase bill type
 * @param {string} number - Bill number
 * @returns {Promise<Array>} Text version objects
 */
async function getBillText(congress, type, number) {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    throw new Error('CONGRESS_API_KEY environment variable is not set');
  }

  const url = `${CONGRESS_API_BASE}/bill/${congress}/${type}/${number}/text?api_key=${apiKey}&format=json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Congress.gov API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.textVersions ?? [];
}

module.exports = { getBills, getCachedBills, fetchAndCacheBills, mapApiBill, getBillDetail, getBillText };
