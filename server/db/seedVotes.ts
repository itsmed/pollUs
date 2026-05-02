/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'node:fs';
import path from 'node:path';
import pool from './index';
import type { PoolClient } from 'pg';

const DATA_ROOT = path.resolve(__dirname, '../../data/119/votes');
const POSITIONS_CHUNK = 500;

function collectFiles(): string[] {
  const files: string[] = [];
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

async function upsertVote(client: PoolClient, d: Record<string, unknown>): Promise<number | null> {
  const bill = (d.bill as Record<string, unknown> | null) ?? null;
  const nom  = (d.nomination as Record<string, unknown> | null) ?? null;
  const amend = (d.amendment as Record<string, unknown> | null) ?? null;

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
      d.vote_id, d.chamber, d.congress, d.session, d.number,
      d.date, (d.updated_at as string | null) ?? null, (d.record_modified as string | null) ?? null,
      d.type, (d.category as string | null) ?? null, d.question, (d.subject as string | null) ?? null, (d.requires as string | null) ?? null,
      (d.result as string | null) ?? null, (d.result_text as string | null) ?? null, (d.source_url as string | null) ?? null,
      bill?.congress ?? null, bill?.number ?? null, bill?.type ?? null, bill?.title ?? null,
      nom?.number ?? null, nom?.title ?? null,
      amend?.number ?? null, amend?.type ?? null, amend?.author ?? null,
    ]
  );

  return (res.rows[0]?.id as number | undefined) ?? null;
}

async function insertPositions(
  client: PoolClient,
  dbId: number,
  votes: Record<string, unknown[]>
): Promise<void> {
  const rows: unknown[][] = [];
  for (const [position, legislators] of Object.entries(votes)) {
    for (const leg of legislators) {
      if (typeof leg !== 'object' || leg === null || !(leg as Record<string, unknown>).id) continue;
      const l = leg as Record<string, unknown>;
      rows.push([
        dbId, position,
        l.id, l.display_name ?? null, l.first_name ?? null,
        l.last_name ?? null, l.party ?? null, l.state ?? null,
      ]);
    }
  }

  if (rows.length === 0) return;

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

async function seed(): Promise<void> {
  const files = collectFiles();
  console.log(`\nSeeding congressional votes from ${files.length} files…\n`);

  let inserted = 0;
  let skipped  = 0;
  let errors   = 0;

  for (const file of files) {
    const client = await pool.connect();
    try {
      const d = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
      await client.query('BEGIN');
      const dbId = await upsertVote(client, d);
      if (dbId === null) {
        skipped++;
      } else {
        await insertPositions(client, dbId, (d.votes as Record<string, unknown[]>) ?? {});
        inserted++;
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`  ✗ ${path.relative(DATA_ROOT, file)}: ${(error as Error).message}`);
      errors++;
    } finally {
      client.release();
    }
  }

  console.log(`  ✓ inserted: ${inserted}`);
  if (skipped > 0) console.log(`  - skipped (already seeded): ${skipped}`);
  if (errors  > 0) console.log(`  ✗ errors:  ${errors}`);
  console.log();
}

seed()
  .catch((error: Error) => {
    console.error('Seed failed:', error.message);
    process.exit(1);
  })
  .finally(() => pool.end());
