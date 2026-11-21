const mysql = require('mysql2/promise');
const env = require('./env');

let pool;

function isDatabaseConfigured() {
  return Boolean(env.databaseUrl || (env.databaseName && env.databaseUser));
}

function getPool() {
  if (!isDatabaseConfigured()) {
    throw new Error('MySQL database configuration is required for database-backed repositories');
  }

  if (!pool) {
    pool = mysql.createPool(env.databaseUrl || {
      host: env.databaseHost,
      port: env.databasePort,
      database: env.databaseName,
      user: env.databaseUser,
      password: env.databasePassword,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }

  return pool;
}

async function query(sql, values = []) {
  const [rows] = await getPool().execute(sql, values);
  return { rows, insertId: rows.insertId };
}

async function close() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = { close, getPool, isDatabaseConfigured, query };
