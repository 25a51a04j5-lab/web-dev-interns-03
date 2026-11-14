const { Pool } = require('pg');
const env = require('./env');

let pool;

function isDatabaseConfigured() {
  return Boolean(env.databaseUrl);
}

function getPool() {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL must be configured for database-backed repositories');
  }

  if (!pool) {
    pool = new Pool({ connectionString: env.databaseUrl });
  }

  return pool;
}

async function query(text, values) {
  return getPool().query(text, values);
}

async function close() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = { close, getPool, isDatabaseConfigured, query };
