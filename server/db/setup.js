'use strict';

/**
 * Sets up all database tables for a fresh PollUs database.
 *
 * Run via: pnpm db:setup
 *
 * Tables are created in dependency order so FK references resolve correctly:
 *   1. schema_migrations (bookkeeping)
 *   2. users
 *   3. members
 *   4. bills
 *   5. votes    (→ users, bills)
 *   6. comments (→ users, bills)
 */

const pool = require('./index');
const User = require('../models/User');
const Member = require('../models/Member');
const Bill = require('../models/Bill');
const Vote = require('../models/Vote');
const Comment = require('../models/Comment');

const SCHEMA_MIGRATIONS_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version    VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

// Ordered by FK dependency
const MODELS = [User, Member, Bill, Vote, Comment];

async function setup() {
  console.log('Setting up database tables…\n');

  await pool.query(SCHEMA_MIGRATIONS_SQL);
  console.log('  ✓ schema_migrations');

  for (const model of MODELS) {
    await model.createTable(pool);
    console.log(`  ✓ ${model.tableName}`);
  }

  console.log('\nDone.');
}

setup()
  .catch((err) => {
    console.error('Setup failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
