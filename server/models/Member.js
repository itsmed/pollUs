'use strict';

const tableName = 'members';

const createSQL = `
  CREATE TABLE IF NOT EXISTS ${tableName} (
    id        SERIAL PRIMARY KEY,
    name      VARCHAR(255) NOT NULL,
    state     VARCHAR(255) NOT NULL,
    district  VARCHAR(10),                   -- NULL for Senators
    role      VARCHAR(50)  NOT NULL,         -- 'Senator' | 'Representative'
    party     VARCHAR(100) NOT NULL,
    api_id    VARCHAR(255) NOT NULL UNIQUE,  -- Congress.gov bioguide ID
    photo_url TEXT                           -- Congress.gov member photo
  );
`;

/**
 * Creates the members table if it does not already exist.
 * @param {import('pg').Pool} pool
 */
async function createTable(pool) {
  await pool.query(createSQL);
}

module.exports = { tableName, createSQL, createTable };
