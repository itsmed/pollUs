'use strict';

const tableName = 'users';

const createSQL = `
  CREATE TABLE IF NOT EXISTS ${tableName} (
    id    SERIAL PRIMARY KEY,
    name  VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE
  );
`;

/**
 * Creates the users table if it does not already exist.
 * @param {import('pg').Pool} pool
 */
async function createTable(pool) {
  await pool.query(createSQL);
}

module.exports = { tableName, createSQL, createTable };
