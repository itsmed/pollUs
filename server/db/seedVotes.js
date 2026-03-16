'use strict';

/**
 * Seeds the congressional_votes and vote_positions tables from the local
 * data/119/votes/ directory.
 *
 * Idempotent — existing rows are skipped via ON CONFLICT DO NOTHING.
 *
 * Usage (from repo root via migrate.sh, or directly):
 *   node server/db/seedVotes.js
 *
 * Requires DATABASE_URL in the environment (loaded by the caller).
 */

const fs = require('fs');
const path = require('path');
const pool = require('./index');

const DATA_ROOT = path.resolve(__dirname, '../../data/119/votes');
// Chunk size for vote_positions batch inserts
const POSITIONS_CHUNK = 500;

/**
 * Returns absolute paths to every data.json file under DATA_ROOT,
 * sorted for deterministic ordering.
 * @returns {string[]}
 */
function collectFiles() {
  const files = [];
  for (const year of fs.readdirSync(DATA_ROOT).sort()) {
    const yearDir = path.join(DATA_ROOT, year);
    if (!fs.statSync(yearDir).isDirectory()) continue;
    for (const vote of fs.readdirSync(yearDir).sort()) {
      const file = path.join(yearDir, vote, 'data.json');
      if (fs.existsSync(file)) files.push(file);
    }
  }
  return files;
}

/**
 * Upserts one vote record and returns its DB id.
 * Returns null if the row already existed (ON CONFLICT DO NOTHING).
 * @param {import('pg').PoolClient} client
 * @param {object} d  parsed data.json
 * @returns {Promise<number|null>}
 */
async function upsertVote(client, d) {
  const bill = d.bill ?? null;
  const nom  = d.nomination ?? null;
  const amend = d.amendment ?? null;

  const res = await client.query(
    `INSERT INTO congressional_votes (
       vote_id, chamber, congress, session, number,
       date, updated_at, record_modified,
       type, category, question, subject, requires,
       result, result_text, source_url,
       bill_congress, bill_number, bill_type, bill_title,
       nomination_number, nomination_title,
       amendment_number, amendment_type, amendment_author
     ) VALUES (
       $1,$2,$3,$4,$5,
       $6,$7,$8,
       $9,$10,$11,$12,$13,
       $14,$15,$16,
       $17,$18,$19,$20,
       $21,$22,
       $23,$24,$25
     )
     ON CONFLICT (vote_id) DO NOTHING
     RETURNING id`,
    [
      d.vote_id,
      d.chamber,
      d.congress,
      d.session,
      d.number,

      d.date,
      d.updated_at ?? null,
      d.record_modified ?? null,

      d.type,
      d.category ?? null,
      d.question,
      d.subject ?? null,
      d.requires ?? null,

      d.result ?? null,
      d.result_text ?? null,
      d.source_url ?? null,

      bill?.congress ?? null,
      bill?.number   ?? null,
      bill?.type     ?? null,
      bill?.title    ?? null,

      nom?.number ?? null,
      nom?.title  ?? null,

      amend?.number ?? null,
      amend?.type   ?? null,
      amend?.author ?? null,
    ]
  );

  return res.rows[0]?.id ?? null;
}

/**
 * Inserts all vote positions for a given DB vote id in batches.
 * @param {import('pg').PoolClient} client
 * @param {number} dbId
 * @param {Record<string, object[]>} votes
 */
async function insertPositions(client, dbId, votes) {
  // Flatten all positions into a single array of row tuples.
  // Some Senate votes include a bare 'VP' string entry for the Vice President
  // acting as tie-breaker — skip any entry that is not a proper object.
  const rows = [];
  for (const [position, legislators] of Object.entries(votes)) {
    for (const leg of legislators) {
      if (typeof leg !== 'object' || leg === null || !leg.id) continue;
      rows.push([
        dbId,
        position,
        leg.id,
        leg.display_name ?? null,
        leg.first_name   ?? null,
        leg.last_name    ?? null,
        leg.party        ?? null,
        leg.state        ?? null,
      ]);
    }
  }

  if (rows.length === 0) return;

  // Insert in chunks to stay within parameter limits
  for (let i = 0; i < rows.length; i += POSITIONS_CHUNK) {
    const chunk = rows.slice(i, i + POSITIONS_CHUNK);

    const values = chunk
      .map((_, idx) => {
        const base = idx * 8;
        return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8})`;
      })
      .join(',');

    const params = chunk.flat();

    await client.query(
      `INSERT INTO vote_positions
         (vote_id, position, legislator_id, display_name,
          first_name, last_name, party, state)
       VALUES ${values}`,
      params
    );
  }
}

async function seed() {
  const files = collectFiles();
  console.log(`\nSeeding congressional votes from ${files.length} files…\n`);

  let inserted = 0;
  let skipped  = 0;
  let errors   = 0;

  for (const file of files) {
    const client = await pool.connect();
    try {
      const d = JSON.parse(fs.readFileSync(file, 'utf8'));
      await client.query('BEGIN');

      const dbId = await upsertVote(client, d);
      if (dbId === null) {
        skipped++;
      } else {
        await insertPositions(client, dbId, d.votes ?? {});
        inserted++;
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ✗ ${path.relative(DATA_ROOT, file)}: ${err.message}`);
      errors++;
    } finally {
      client.release();
    }
  }

  console.log(`  ✓ inserted: ${inserted}`);
  if (skipped  > 0) console.log(`  - skipped (already seeded): ${skipped}`);
  if (errors   > 0) console.log(`  ✗ errors:  ${errors}`);
  console.log();
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
