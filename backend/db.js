const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
  host:     process.env.PG_HOST     || 'shared_postgres',
  port:     parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'novadb',
  user:     process.env.PG_USER     || 'nova',
  password: process.env.PG_PASSWORD,
});

pool.on('error', (err) => logger.error({ err }, 'pg pool error'));

// Devuelve array de filas
async function query(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

// Devuelve una fila o null
async function queryOne(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows[0] ?? null;
}

// Devuelve el Result completo de pg (para rowCount, RETURNING, etc.)
async function execute(sql, params = []) {
  return pool.query(sql, params);
}

// Ejecuta fn(client) dentro de una transacción BEGIN/COMMIT
async function withTx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await fn(client);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      username   TEXT UNIQUE NOT NULL,
      name       TEXT NOT NULL,
      "passHash" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id       TEXT PRIMARY KEY,
      "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name     TEXT NOT NULL,
      type     TEXT NOT NULL,
      balance  NUMERIC(15,4) DEFAULT 0,
      color    TEXT DEFAULT '',
      archived INTEGER DEFAULT 0
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id              TEXT PRIMARY KEY,
      "userId"        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "accountId"     TEXT NOT NULL,
      type            TEXT NOT NULL,
      amount          NUMERIC(15,4) NOT NULL,
      description     TEXT DEFAULT '',
      category        TEXT DEFAULT '',
      date            TEXT,
      notes           TEXT DEFAULT '',
      "transferGroup" TEXT DEFAULT '',
      tags            TEXT DEFAULT '',
      splits          TEXT DEFAULT NULL,
      "deletedAt"     TEXT DEFAULT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recurring_items (
      id             TEXT PRIMARY KEY,
      "userId"       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name           TEXT NOT NULL,
      type           TEXT NOT NULL,
      amount         NUMERIC(15,4) NOT NULL,
      category       TEXT DEFAULT '',
      "accountId"    TEXT DEFAULT '',
      frequency      TEXT DEFAULT 'monthly',
      "dayOfMonth"   TEXT DEFAULT '',
      notes          TEXT DEFAULT '',
      active         INTEGER DEFAULT 1,
      "customMonths" INTEGER DEFAULT 0,
      "deletedAt"    TEXT DEFAULT NULL,
      "lastApplied"  TEXT DEFAULT ''
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS savings_transfers (
      id              TEXT PRIMARY KEY,
      "userId"        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      "fromAccountId" TEXT NOT NULL,
      "toAccountId"   TEXT NOT NULL,
      amount          NUMERIC(15,4) NOT NULL,
      "dayOfMonth"    INTEGER DEFAULT 1,
      active          INTEGER DEFAULT 1,
      "lastApplied"   TEXT DEFAULT ''
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS financed_items (
      id              TEXT PRIMARY KEY,
      "userId"        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      "accountId"     TEXT NOT NULL,
      "totalAmount"   NUMERIC(15,4) NOT NULL,
      months          INTEGER NOT NULL,
      "monthlyAmount" NUMERIC(15,4) NOT NULL,
      "dayOfMonth"    INTEGER DEFAULT 1,
      "startDate"     TEXT NOT NULL DEFAULT '',
      "appliedCount"  INTEGER DEFAULT 0,
      active          INTEGER DEFAULT 1,
      "lastApplied"   TEXT DEFAULT ''
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budgets (
      id           TEXT PRIMARY KEY,
      "userId"     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "categoryId" TEXT NOT NULL,
      amount       NUMERIC(15,4) NOT NULL,
      period       TEXT DEFAULT 'monthly',
      "deletedAt"  TEXT DEFAULT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS goals (
      id              TEXT PRIMARY KEY,
      "userId"        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name            TEXT NOT NULL,
      "targetAmount"  NUMERIC(15,4) NOT NULL,
      "currentAmount" NUMERIC(15,4) DEFAULT 0,
      "targetDate"    TEXT DEFAULT '',
      "accountId"     TEXT DEFAULT '',
      icon            TEXT DEFAULT '🎯',
      "deletedAt"     TEXT DEFAULT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS debts (
      id            TEXT PRIMARY KEY,
      "userId"      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      "totalAmount" NUMERIC(15,4) NOT NULL,
      "paidAmount"  NUMERIC(15,4) DEFAULT 0,
      icon          TEXT DEFAULT '🏚️',
      color         TEXT DEFAULT '#7c3aed',
      notes         TEXT DEFAULT '',
      "startDate"   TEXT DEFAULT '',
      "targetDate"  TEXT DEFAULT '',
      active        INTEGER DEFAULT 1,
      "deletedAt"   TEXT DEFAULT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS loans (
      id                TEXT PRIMARY KEY,
      "userId"          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name              TEXT NOT NULL,
      "totalAmount"     NUMERIC(15,4) NOT NULL,
      "collectedAmount" NUMERIC(15,4) DEFAULT 0,
      icon              TEXT DEFAULT '🤝',
      color             TEXT DEFAULT '#10b981',
      notes             TEXT DEFAULT '',
      "startDate"       TEXT DEFAULT '',
      "targetDate"      TEXT DEFAULT '',
      active            INTEGER DEFAULT 1,
      "deletedAt"       TEXT DEFAULT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          SERIAL PRIMARY KEY,
      "userId"    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "tokenHash" TEXT UNIQUE NOT NULL,
      "expiresAt" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id          SERIAL PRIMARY KEY,
      "userId"    INTEGER NOT NULL,
      entity      TEXT NOT NULL,
      "entityId"  TEXT NOT NULL,
      action      TEXT NOT NULL,
      payload     TEXT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS envelopes (
      id           TEXT PRIMARY KEY,
      "userId"     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year         INTEGER NOT NULL,
      month        INTEGER NOT NULL,
      "categoryId" TEXT NOT NULL,
      assigned     NUMERIC(15,4) DEFAULT 0,
      UNIQUE("userId", year, month, "categoryId")
    )
  `);
}

// Limpia refresh tokens expirados
async function cleanExpiredTokens() {
  const { rowCount } = await pool.query(
    `DELETE FROM refresh_tokens WHERE "expiresAt" <= NOW()::text`
  );
  if (rowCount > 0) logger.info({ changes: rowCount }, 'Refresh tokens expirados eliminados');
}

module.exports = { query, queryOne, execute, withTx, initSchema, cleanExpiredTokens, pool };
