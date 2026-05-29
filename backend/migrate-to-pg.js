const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');

const sqlite = new Database(path.join(__dirname, 'data', 'finance.db'), { readonly: true });

const pool = new Pool({
  host:     process.env.PG_HOST     || 'shared_postgres',
  port:     parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'novadb',
  user:     process.env.PG_USER     || 'nova',
  password: process.env.PG_PASSWORD,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        username   TEXT UNIQUE NOT NULL,
        name       TEXT NOT NULL,
        "passHash" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
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
    await client.query(`
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
    await client.query(`
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
    await client.query(`
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
    await client.query(`
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        id           TEXT PRIMARY KEY,
        "userId"     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "categoryId" TEXT NOT NULL,
        amount       NUMERIC(15,4) NOT NULL,
        period       TEXT DEFAULT 'monthly',
        "deletedAt"  TEXT DEFAULT NULL
      )
    `);
    await client.query(`
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
    await client.query(`
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
    await client.query(`
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id          SERIAL PRIMARY KEY,
        "userId"    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "tokenHash" TEXT UNIQUE NOT NULL,
        "expiresAt" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
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
    await client.query(`
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

    // --- Migrar datos ---

    const users = sqlite.prepare('SELECT * FROM users').all();
    console.log(`users: ${users.length}`);
    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, username, name, "passHash", "createdAt") VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [u.id, u.username, u.name, u.passHash, u.createdAt]
      );
    }
    if (users.length) {
      const maxId = Math.max(...users.map(u => u.id));
      await client.query(`SELECT setval('users_id_seq', $1)`, [maxId]);
    }

    const accounts = sqlite.prepare('SELECT * FROM accounts').all();
    console.log(`accounts: ${accounts.length}`);
    for (const r of accounts) {
      await client.query(
        `INSERT INTO accounts (id,"userId",name,type,balance,color,archived) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [r.id, r.userId, r.name, r.type, r.balance ?? 0, r.color ?? '', r.archived ?? 0]
      );
    }

    const transactions = sqlite.prepare('SELECT * FROM transactions').all();
    console.log(`transactions: ${transactions.length}`);
    for (const r of transactions) {
      await client.query(
        `INSERT INTO transactions (id,"userId","accountId",type,amount,description,category,date,notes,"transferGroup",tags,splits,"deletedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT DO NOTHING`,
        [r.id, r.userId, r.accountId, r.type, r.amount, r.description ?? '', r.category ?? '',
         r.date, r.notes ?? '', r.transferGroup ?? '', r.tags ?? '', r.splits ?? null, r.deletedAt ?? null]
      );
    }

    const recurring = sqlite.prepare('SELECT * FROM recurringItems').all();
    console.log(`recurring_items: ${recurring.length}`);
    for (const r of recurring) {
      await client.query(
        `INSERT INTO recurring_items (id,"userId",name,type,amount,category,"accountId",frequency,"dayOfMonth",notes,active,"customMonths","deletedAt","lastApplied")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT DO NOTHING`,
        [r.id, r.userId, r.name, r.type, r.amount, r.category ?? '', r.accountId ?? '',
         r.frequency ?? 'monthly', r.dayOfMonth ?? '', r.notes ?? '', r.active ?? 1,
         r.customMonths ?? 0, r.deletedAt ?? null, r.lastApplied ?? '']
      );
    }

    const savings = sqlite.prepare('SELECT * FROM savingsTransfers').all();
    console.log(`savings_transfers: ${savings.length}`);
    for (const r of savings) {
      await client.query(
        `INSERT INTO savings_transfers (id,"userId",name,"fromAccountId","toAccountId",amount,"dayOfMonth",active,"lastApplied")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
        [r.id, r.userId, r.name, r.fromAccountId, r.toAccountId, r.amount,
         r.dayOfMonth ?? 1, r.active ?? 1, r.lastApplied ?? '']
      );
    }

    const financed = sqlite.prepare('SELECT * FROM financedItems').all();
    console.log(`financed_items: ${financed.length}`);
    for (const r of financed) {
      await client.query(
        `INSERT INTO financed_items (id,"userId",name,"accountId","totalAmount",months,"monthlyAmount","dayOfMonth","startDate","appliedCount",active,"lastApplied")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING`,
        [r.id, r.userId, r.name, r.accountId, r.totalAmount, r.months, r.monthlyAmount,
         r.dayOfMonth ?? 1, r.startDate ?? '', r.appliedCount ?? 0, r.active ?? 1, r.lastApplied ?? '']
      );
    }

    const budgets = sqlite.prepare('SELECT * FROM budgets').all();
    console.log(`budgets: ${budgets.length}`);
    for (const r of budgets) {
      await client.query(
        `INSERT INTO budgets (id,"userId","categoryId",amount,period,"deletedAt") VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [r.id, r.userId, r.categoryId, r.amount, r.period ?? 'monthly', r.deletedAt ?? null]
      );
    }

    const goals = sqlite.prepare('SELECT * FROM goals').all();
    console.log(`goals: ${goals.length}`);
    for (const r of goals) {
      await client.query(
        `INSERT INTO goals (id,"userId",name,"targetAmount","currentAmount","targetDate","accountId",icon,"deletedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
        [r.id, r.userId, r.name, r.targetAmount, r.currentAmount ?? 0,
         r.targetDate ?? '', r.accountId ?? '', r.icon ?? '🎯', r.deletedAt ?? null]
      );
    }

    const debts = sqlite.prepare('SELECT * FROM debts').all();
    console.log(`debts: ${debts.length}`);
    for (const r of debts) {
      await client.query(
        `INSERT INTO debts (id,"userId",name,"totalAmount","paidAmount",icon,color,notes,"startDate","targetDate",active,"deletedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING`,
        [r.id, r.userId, r.name, r.totalAmount, r.paidAmount ?? 0,
         r.icon ?? '🏚️', r.color ?? '#7c3aed', r.notes ?? '',
         r.startDate ?? '', r.targetDate ?? '', r.active ?? 1, r.deletedAt ?? null]
      );
    }

    const loans = sqlite.prepare('SELECT * FROM loans').all();
    console.log(`loans: ${loans.length}`);
    for (const r of loans) {
      await client.query(
        `INSERT INTO loans (id,"userId",name,"totalAmount","collectedAmount",icon,color,notes,"startDate","targetDate",active,"deletedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING`,
        [r.id, r.userId, r.name, r.totalAmount, r.collectedAmount ?? 0,
         r.icon ?? '🤝', r.color ?? '#10b981', r.notes ?? '',
         r.startDate ?? '', r.targetDate ?? '', r.active ?? 1, r.deletedAt ?? null]
      );
    }

    // refresh_tokens: migrar solo los no expirados
    const tokens = sqlite.prepare("SELECT * FROM refreshTokens WHERE expiresAt > datetime('now')").all();
    console.log(`refresh_tokens (vigentes): ${tokens.length}`);
    for (const r of tokens) {
      await client.query(
        `INSERT INTO refresh_tokens (id,"userId","tokenHash","expiresAt","createdAt") VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [r.id, r.userId, r.tokenHash, r.expiresAt, r.createdAt]
      );
    }
    if (tokens.length) {
      const maxId = Math.max(...tokens.map(r => r.id));
      await client.query(`SELECT setval('refresh_tokens_id_seq', $1)`, [maxId]);
    }

    const auditLogs = sqlite.prepare('SELECT * FROM audit_log').all();
    console.log(`audit_log: ${auditLogs.length}`);
    for (const r of auditLogs) {
      await client.query(
        `INSERT INTO audit_log (id,"userId",entity,"entityId",action,payload,"createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [r.id, r.userId, r.entity, r.entityId, r.action, r.payload ?? null, r.createdAt]
      );
    }
    if (auditLogs.length) {
      const maxId = Math.max(...auditLogs.map(r => r.id));
      await client.query(`SELECT setval('audit_log_id_seq', $1)`, [maxId]);
    }

    const envelopes = sqlite.prepare('SELECT * FROM envelopes').all();
    console.log(`envelopes: ${envelopes.length}`);
    for (const r of envelopes) {
      await client.query(
        `INSERT INTO envelopes (id,"userId",year,month,"categoryId",assigned) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [r.id, r.userId, r.year, r.month, r.categoryId, r.assigned ?? 0]
      );
    }

    await client.query('COMMIT');
    console.log('Migración completada.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error, rollback:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

run();
