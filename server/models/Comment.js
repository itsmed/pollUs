'use strict';

// Depends on: users, bills
const tableName = 'comments';

const createSQL = `
  CREATE TABLE IF NOT EXISTS ${tableName} (
    id        SERIAL PRIMARY KEY,
    user_id   INTEGER     NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    bill_id   INTEGER     NOT NULL REFERENCES bills(id)  ON DELETE CASCADE,
    content   TEXT        NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

/**
 * Creates the comments table if it does not already exist.
 * Requires users and bills tables to exist first.
 * @param {import('pg').Pool} pool
 */
async function createTable(pool) {
  await pool.query(createSQL);
}

module.exports = { tableName, createSQL, createTable };
