import pool from '../db';
import { CURRENT_CONGRESS } from '../CONSTANTS';

const CONGRESS_API_BASE = 'https://api.congress.gov/v3';
const BILL_LIST_LIMIT = 250;

const BILL_COLUMNS = `
  id, title, origin_chamber, bill_type, bill_number, congress_number,
  latest_action_text, latest_action_date, update_date, api_id, url
`;

interface ApiBill {
  congress?: number;
  title?: string;
  originChamber?: string;
  type?: string;
  number?: number | string;
  latestAction?: { text?: string; actionDate?: string };
  updateDate?: string;
  url?: string;
}

interface DbBill {
  id: number;
  title: string;
  origin_chamber: string | null;
  bill_type: string | null;
  bill_number: string | null;
  congress_number: number | null;
  latest_action_text: string | null;
  latest_action_date: string | null;
  update_date: string | null;
  api_id: string;
  url: string | null;
}

async function getCachedBills(): Promise<DbBill[]> {
  const result = await pool.query(
    `SELECT ${BILL_COLUMNS}
     FROM bills
     WHERE congress_number = $1
     ORDER BY update_date DESC NULLS LAST, id DESC`,
    [CURRENT_CONGRESS]
  );
  return result.rows as DbBill[];
}

function mapApiBill(apiBill: ApiBill): Omit<DbBill, 'id'> {
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

async function fetchAndCacheBills(): Promise<DbBill[]> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    throw new Error('CONGRESS_API_KEY environment variable is not set');
  }

  const url = `${CONGRESS_API_BASE}/bill/${CURRENT_CONGRESS}?api_key=${apiKey}&limit=${BILL_LIST_LIMIT}&format=json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Congress.gov API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { bills?: ApiBill[] };
  const bills = data.bills ?? [];

  if (bills.length === 0) return [];

  const inserted: DbBill[] = [];
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
    inserted.push(result.rows[0] as DbBill);
  }

  return inserted;
}

async function getBills(): Promise<{ bills: DbBill[]; source: 'cache' | 'api' }> {
  const cached = await getCachedBills();
  if (cached.length > 0) return { bills: cached, source: 'cache' };
  const bills = await fetchAndCacheBills();
  return { bills, source: 'api' };
}

async function getBillDetail(
  congress: number | string,
  type: string,
  number: string
): Promise<{ bill: DbBill | null; actions: unknown[]; summaries: unknown[] }> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) throw new Error('CONGRESS_API_KEY environment variable is not set');

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
    actionsRes.json() as Promise<{ actions?: unknown[] }>,
    summariesRes.json() as Promise<{ summaries?: unknown[] }>,
  ]);

  return {
    bill: (dbResult.rows[0] as DbBill | undefined) ?? null,
    actions: actionsData.actions ?? [],
    summaries: summariesData.summaries ?? [],
  };
}

async function getBillText(
  congress: number | string,
  type: string,
  number: string
): Promise<unknown[]> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) throw new Error('CONGRESS_API_KEY environment variable is not set');

  const url = `${CONGRESS_API_BASE}/bill/${congress}/${type}/${number}/text?api_key=${apiKey}&format=json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Congress.gov API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { textVersions?: unknown[] };
  return data.textVersions ?? [];
}

export { getBills, getCachedBills, fetchAndCacheBills, mapApiBill, getBillDetail, getBillText };
