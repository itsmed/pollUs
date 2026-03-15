'use strict';

const tableName = 'bills';

const createSQL = `
  CREATE TABLE IF NOT EXISTS ${tableName} (
    id                 SERIAL PRIMARY KEY,
    title              VARCHAR(1000) NOT NULL,
    summary            TEXT,
    status             VARCHAR(100),
    introduced_date    DATE,
    api_id             VARCHAR(255) NOT NULL UNIQUE,  -- Congress.gov "{congress}/{type}/{number}"
    origin_chamber     VARCHAR(50),
    bill_type          VARCHAR(20),
    bill_number        VARCHAR(50),
    congress_number    INTEGER,
    latest_action_text TEXT,
    latest_action_date DATE,
    update_date        DATE,
    url                TEXT
  );
`;

/**
 * Creates the bills table if it does not already exist.
 * @param {import('pg').Pool} pool
 */
async function createTable(pool) {
  await pool.query(createSQL);
}

module.exports = { tableName, createSQL, createTable };
