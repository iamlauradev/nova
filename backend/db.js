const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.TEST_DB_PATH || path.join(DATA_DIR, 'finance.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT UNIQUE NOT NULL,
    name      TEXT NOT NULL,
    passHash  TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id        TEXT PRIMARY KEY,
    userId    INTEGER NOT NULL,
    name      TEXT NOT NULL,
    type      TEXT NOT NULL,
    balance   REAL DEFAULT 0,
    color     TEXT,
    archived  INTEGER DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id            TEXT PRIMARY KEY,
    userId        INTEGER NOT NULL,
    accountId     TEXT NOT NULL,
    type          TEXT NOT NULL,
    amount        REAL NOT NULL,
    description   TEXT DEFAULT '',
    category      TEXT DEFAULT '',
    date          TEXT,
    notes         TEXT DEFAULT '',
    transferGroup TEXT DEFAULT '',
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS recurringItems (
    id           TEXT PRIMARY KEY,
    userId       INTEGER NOT NULL,
    name         TEXT NOT NULL,
    type         TEXT NOT NULL,
    amount       REAL NOT NULL,
    category     TEXT DEFAULT '',
    accountId    TEXT DEFAULT '',
    frequency    TEXT DEFAULT 'monthly',
    dayOfMonth   TEXT DEFAULT '',
    notes        TEXT DEFAULT '',
    active       INTEGER DEFAULT 1,
    customMonths INTEGER DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS savingsTransfers (
    id            TEXT PRIMARY KEY,
    userId        INTEGER NOT NULL,
    name          TEXT NOT NULL,
    fromAccountId TEXT NOT NULL,
    toAccountId   TEXT NOT NULL,
    amount        REAL NOT NULL,
    dayOfMonth    INTEGER DEFAULT 1,
    active        INTEGER DEFAULT 1,
    lastApplied   TEXT DEFAULT '',
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS financedItems (
    id            TEXT PRIMARY KEY,
    userId        INTEGER NOT NULL,
    name          TEXT NOT NULL,
    accountId     TEXT NOT NULL,
    totalAmount   REAL NOT NULL,
    months        INTEGER NOT NULL,
    monthlyAmount REAL NOT NULL,
    dayOfMonth    INTEGER DEFAULT 1,
    startDate     TEXT NOT NULL,
    appliedCount  INTEGER DEFAULT 0,
    active        INTEGER DEFAULT 1,
    lastApplied   TEXT DEFAULT '',
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id         TEXT PRIMARY KEY,
    userId     INTEGER NOT NULL,
    categoryId TEXT NOT NULL,
    amount     REAL NOT NULL,
    period     TEXT DEFAULT 'monthly',
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS goals (
    id            TEXT PRIMARY KEY,
    userId        INTEGER NOT NULL,
    name          TEXT NOT NULL,
    targetAmount  REAL NOT NULL,
    currentAmount REAL DEFAULT 0,
    targetDate    TEXT DEFAULT '',
    accountId     TEXT DEFAULT '',
    icon          TEXT DEFAULT '🎯',
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS debts (
    id          TEXT PRIMARY KEY,
    userId      INTEGER NOT NULL,
    name        TEXT NOT NULL,
    totalAmount REAL NOT NULL,
    paidAmount  REAL DEFAULT 0,
    icon        TEXT DEFAULT '🏚️',
    color       TEXT DEFAULT '#7c3aed',
    notes       TEXT DEFAULT '',
    startDate   TEXT DEFAULT '',
    targetDate  TEXT DEFAULT '',
    active      INTEGER DEFAULT 1,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS loans (
    id               TEXT PRIMARY KEY,
    userId           INTEGER NOT NULL,
    name             TEXT NOT NULL,
    totalAmount      REAL NOT NULL,
    collectedAmount  REAL DEFAULT 0,
    icon             TEXT DEFAULT '🤝',
    color            TEXT DEFAULT '#10b981',
    notes            TEXT DEFAULT '',
    startDate        TEXT DEFAULT '',
    targetDate       TEXT DEFAULT '',
    active           INTEGER DEFAULT 1,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS refreshTokens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    userId     INTEGER NOT NULL,
    tokenHash  TEXT UNIQUE NOT NULL,
    expiresAt  DATETIME NOT NULL,
    createdAt  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT UNIQUE NOT NULL,
    appliedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

const MIGRATIONS = [
  { name: '001_accounts_archived',         sql: 'ALTER TABLE accounts ADD COLUMN archived INTEGER DEFAULT 0' },
  { name: '002_transactions_notes',        sql: 'ALTER TABLE transactions ADD COLUMN notes TEXT DEFAULT ""' },
  { name: '003_transactions_transferGroup',sql: 'ALTER TABLE transactions ADD COLUMN transferGroup TEXT DEFAULT ""' },
  { name: '004_recurring_customMonths',    sql: 'ALTER TABLE recurringItems ADD COLUMN customMonths INTEGER DEFAULT 0' },
  { name: '005_transactions_tags',         sql: 'ALTER TABLE transactions ADD COLUMN tags TEXT DEFAULT ""' },
  { name: '006_transactions_deletedAt',    sql: 'ALTER TABLE transactions ADD COLUMN deletedAt TEXT DEFAULT NULL' },
  { name: '007_goals_deletedAt',           sql: 'ALTER TABLE goals ADD COLUMN deletedAt TEXT DEFAULT NULL' },
  { name: '008_debts_deletedAt',           sql: 'ALTER TABLE debts ADD COLUMN deletedAt TEXT DEFAULT NULL' },
  { name: '009_loans_deletedAt',           sql: 'ALTER TABLE loans ADD COLUMN deletedAt TEXT DEFAULT NULL' },
  { name: '010_audit_log', sql: `CREATE TABLE IF NOT EXISTS audit_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    userId    INTEGER NOT NULL,
    entity    TEXT NOT NULL,
    entityId  TEXT NOT NULL,
    action    TEXT NOT NULL,
    payload   TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )` },
  // C12 — Split expenses: JSON array [{person, amount}]
  { name: '011_transactions_splits', sql: 'ALTER TABLE transactions ADD COLUMN splits TEXT DEFAULT NULL' },
];

const appliedMigrations = new Set(
  db.prepare('SELECT name FROM schema_migrations').all().map(r => r.name)
);

for (const { name, sql } of MIGRATIONS) {
  if (appliedMigrations.has(name)) continue;
  try {
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);
    logger.info({ migration: name }, 'Migración aplicada');
  } catch (e) {
    db.prepare('INSERT OR IGNORE INTO schema_migrations (name) VALUES (?)').run(name);
  }
}

// Limpia refresh tokens expirados al arrancar
db.prepare("DELETE FROM refreshTokens WHERE expiresAt <= datetime('now')").run();

// B8 — Limpieza semanal de refresh tokens expirados
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    const { changes } = db.prepare("DELETE FROM refreshTokens WHERE expiresAt <= datetime('now')").run();
    if (changes > 0) logger.info({ changes }, 'Refresh tokens expirados eliminados');
  }, 7 * 24 * 60 * 60 * 1000);
}

module.exports = db;
