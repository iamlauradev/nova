const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'cambia_esto_urgente';
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'finance.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Tablas base
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
`);

// Migraciones para bases de datos existentes
const migrations = [
  'ALTER TABLE accounts ADD COLUMN archived INTEGER DEFAULT 0',
  'ALTER TABLE transactions ADD COLUMN notes TEXT DEFAULT ""',
  'ALTER TABLE transactions ADD COLUMN transferGroup TEXT DEFAULT ""',
  'ALTER TABLE recurringItems ADD COLUMN customMonths INTEGER DEFAULT 0',
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (_) { /* columna ya existe */ }
}

app.use(cors());
app.use(express.json());

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Sin token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ============================================================
// AUTH
// ============================================================

app.post('/auth/register', (req, res) => {
  const { username, name, password } = req.body;
  if (!username?.trim() || !name?.trim() || !password)
    return res.status(400).json({ error: 'Faltan campos' });
  try {
    const passHash = bcrypt.hashSync(password, 10);
    const { lastInsertRowid: id } = db
      .prepare('INSERT INTO users (username, name, passHash) VALUES (?, ?, ?)')
      .run(username.toLowerCase().trim(), name.trim(), passHash);
    const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '365d' });
    res.json({ token, user: { id, username: username.toLowerCase().trim(), name: name.trim() } });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Ese usuario ya existe' });
    res.status(500).json({ error: e.message });
  }
});

app.post('/auth/login', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?')
    .get(req.body.username?.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(req.body.password, user.passHash))
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '365d' });
  res.json({ token, user: { id: user.id, username: user.username, name: user.name } });
});

app.get('/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, name FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

app.put('/auth/me', auth, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  db.prepare('UPDATE users SET name=? WHERE id=?').run(name.trim(), req.user.id);
  const user = db.prepare('SELECT id, username, name FROM users WHERE id=?').get(req.user.id);
  res.json(user);
});

app.put('/auth/me/password', auth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Faltan campos' });
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.passHash))
    return res.status(401).json({ error: 'Contraseña actual incorrecta' });
  db.prepare('UPDATE users SET passHash=? WHERE id=?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ ok: true });
});

app.delete('/auth/me', auth, (req, res) => {
  db.prepare('DELETE FROM users WHERE id=?').run(req.user.id);
  res.json({ ok: true });
});

// ============================================================
// CUENTAS
// ============================================================

app.get('/api/accounts', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM accounts WHERE userId = ? AND archived = 0').all(req.user.id));
});

app.get('/api/accounts/archived', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM accounts WHERE userId = ? AND archived = 1').all(req.user.id));
});

app.post('/api/accounts', auth, (req, res) => {
  const { id, name, type, balance, color } = req.body;
  db.prepare('INSERT INTO accounts (id, userId, name, type, balance, color) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.user.id, name, type, balance ?? 0, color ?? '');
  res.json({ ok: true });
});

app.put('/api/accounts/:id', auth, (req, res) => {
  const { name, type, balance, color } = req.body;
  db.prepare('UPDATE accounts SET name=?, type=?, balance=?, color=? WHERE id=? AND userId=?')
    .run(name, type, balance, color, req.params.id, req.user.id);
  res.json({ ok: true });
});

app.delete('/api/accounts/:id', auth, (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE accounts SET archived=1 WHERE id=? AND userId=?').run(id, req.user.id);
  db.prepare('UPDATE recurringItems SET active=0 WHERE accountId=? AND userId=?').run(id, req.user.id);
  db.prepare('UPDATE savingsTransfers SET active=0 WHERE (fromAccountId=? OR toAccountId=?) AND userId=?').run(id, id, req.user.id);
  db.prepare('UPDATE financedItems SET active=0 WHERE accountId=? AND userId=?').run(id, req.user.id);
  res.json({ ok: true });
});

// ============================================================
// TRANSACCIONES
// ============================================================

app.get('/api/transactions', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM transactions WHERE userId=? ORDER BY date DESC').all(req.user.id));
});

app.post('/api/transactions', auth, (req, res) => {
  const { id, accountId, type, amount, description, category, date, notes, transferGroup } = req.body;
  const delta = type === 'income' ? amount : (type === 'expense' ? -amount : 0);
  if (delta !== 0) {
    db.prepare('UPDATE accounts SET balance = ROUND(balance + ?, 2) WHERE id=? AND userId=?')
      .run(delta, accountId, req.user.id);
  }
  db.prepare(`
    INSERT INTO transactions (id, userId, accountId, type, amount, description, category, date, notes, transferGroup)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, accountId, type, amount, description ?? '', category ?? '', date,
         notes ?? '', transferGroup ?? '');
  res.json({ ok: true });
});

app.put('/api/transactions/:id', auth, (req, res) => {
  const old = db.prepare('SELECT * FROM transactions WHERE id=? AND userId=?')
    .get(req.params.id, req.user.id);
  if (!old) return res.status(404).json({ error: 'Transacción no encontrada' });

  const { accountId, type, amount, description, category, date, notes } = req.body;

  if (old.type === 'income') {
    db.prepare('UPDATE accounts SET balance = ROUND(balance - ?, 2) WHERE id=? AND userId=?')
      .run(old.amount, old.accountId, req.user.id);
  } else if (old.type === 'expense') {
    db.prepare('UPDATE accounts SET balance = ROUND(balance + ?, 2) WHERE id=? AND userId=?')
      .run(old.amount, old.accountId, req.user.id);
  }

  if (type === 'income') {
    db.prepare('UPDATE accounts SET balance = ROUND(balance + ?, 2) WHERE id=? AND userId=?')
      .run(amount, accountId, req.user.id);
  } else if (type === 'expense') {
    db.prepare('UPDATE accounts SET balance = ROUND(balance - ?, 2) WHERE id=? AND userId=?')
      .run(amount, accountId, req.user.id);
  }

  db.prepare(`
    UPDATE transactions SET accountId=?, type=?, amount=?, description=?, category=?, date=?, notes=?
    WHERE id=? AND userId=?
  `).run(accountId, type, amount, description ?? '', category ?? '', date, notes ?? '',
         req.params.id, req.user.id);

  res.json({ ok: true });
});

app.delete('/api/transactions/:id', auth, (req, res) => {
  const tx = db.prepare('SELECT * FROM transactions WHERE id=? AND userId=?')
    .get(req.params.id, req.user.id);
  if (tx) {
    if (tx.type === 'income') {
      db.prepare('UPDATE accounts SET balance = ROUND(balance - ?, 2) WHERE id=? AND userId=?')
        .run(tx.amount, tx.accountId, req.user.id);
    } else if (tx.type === 'expense') {
      db.prepare('UPDATE accounts SET balance = ROUND(balance + ?, 2) WHERE id=? AND userId=?')
        .run(tx.amount, tx.accountId, req.user.id);
    }
    if (tx.transferGroup) {
      const paired = db.prepare('SELECT * FROM transactions WHERE transferGroup=? AND id!=? AND userId=?')
        .get(tx.transferGroup, req.params.id, req.user.id);
      if (paired) {
        if (paired.type === 'income') {
          db.prepare('UPDATE accounts SET balance = ROUND(balance - ?, 2) WHERE id=? AND userId=?')
            .run(paired.amount, paired.accountId, req.user.id);
        } else if (paired.type === 'expense') {
          db.prepare('UPDATE accounts SET balance = ROUND(balance + ?, 2) WHERE id=? AND userId=?')
            .run(paired.amount, paired.accountId, req.user.id);
        }
        db.prepare('DELETE FROM transactions WHERE id=? AND userId=?').run(paired.id, req.user.id);
      }
    }
    db.prepare('DELETE FROM transactions WHERE id=? AND userId=?').run(req.params.id, req.user.id);
  }
  res.json({ ok: true });
});

app.post('/api/transactions/transfer', auth, (req, res) => {
  const { fromAccountId, toAccountId, amount, description, date } = req.body;
  const group = `trf_${Date.now()}`;
  const idOut = `tx_out_${Date.now()}`;
  const idIn  = `tx_in_${Date.now() + 1}`;
  const desc = description || 'Transferencia';

  db.prepare('UPDATE accounts SET balance = ROUND(balance - ?, 2) WHERE id=? AND userId=?')
    .run(amount, fromAccountId, req.user.id);
  db.prepare(`INSERT INTO transactions (id, userId, accountId, type, amount, description, category, date, notes, transferGroup)
    VALUES (?, ?, ?, 'transfer-out', ?, ?, 'transferencia', ?, '', ?)`)
    .run(idOut, req.user.id, fromAccountId, amount, desc, date, group);

  db.prepare('UPDATE accounts SET balance = ROUND(balance + ?, 2) WHERE id=? AND userId=?')
    .run(amount, toAccountId, req.user.id);
  db.prepare(`INSERT INTO transactions (id, userId, accountId, type, amount, description, category, date, notes, transferGroup)
    VALUES (?, ?, ?, 'transfer-in', ?, ?, 'transferencia', ?, '', ?)`)
    .run(idIn, req.user.id, toAccountId, amount, desc, date, group);

  res.json({ ok: true, group });
});

// ============================================================
// FIJOS / RECURRENTES
// ============================================================

app.get('/api/recurring', auth, (req, res) => {
  const items = db.prepare('SELECT * FROM recurringItems WHERE userId=?').all(req.user.id);
  res.json(items.map(r => ({ ...r, active: r.active === 1 })));
});

app.post('/api/recurring', auth, (req, res) => {
  const { id, name, type, amount, category, accountId, frequency, dayOfMonth, notes, active, customMonths } = req.body;
  db.prepare(`
    INSERT INTO recurringItems (id, userId, name, type, amount, category, accountId, frequency, dayOfMonth, notes, active, customMonths)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, name, type, amount, category ?? '', accountId ?? '',
         frequency ?? 'monthly', dayOfMonth ?? '', notes ?? '', active !== false ? 1 : 0,
         customMonths ?? 0);
  res.json({ ok: true });
});

app.put('/api/recurring/:id', auth, (req, res) => {
  const { name, type, amount, category, accountId, frequency, dayOfMonth, notes, active, customMonths } = req.body;
  db.prepare(`
    UPDATE recurringItems
    SET name=?, type=?, amount=?, category=?, accountId=?, frequency=?, dayOfMonth=?, notes=?, active=?, customMonths=?
    WHERE id=? AND userId=?
  `).run(name, type, amount, category ?? '', accountId ?? '', frequency,
         dayOfMonth ?? '', notes ?? '', active ? 1 : 0, customMonths ?? 0,
         req.params.id, req.user.id);
  res.json({ ok: true });
});

app.delete('/api/recurring/:id', auth, (req, res) => {
  db.prepare('DELETE FROM recurringItems WHERE id=? AND userId=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// ============================================================
// TRANSFERENCIAS DE AHORRO
// ============================================================

app.get('/api/savings-transfers', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM savingsTransfers WHERE userId=?').all(req.user.id);
  res.json(rows.map(r => ({ ...r, active: r.active === 1 })));
});

app.post('/api/savings-transfers', auth, (req, res) => {
  const { id, name, fromAccountId, toAccountId, amount, dayOfMonth, active } = req.body;
  db.prepare(`
    INSERT INTO savingsTransfers (id, userId, name, fromAccountId, toAccountId, amount, dayOfMonth, active, lastApplied)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, '')
  `).run(id, req.user.id, name, fromAccountId, toAccountId, amount, dayOfMonth ?? 1, active !== false ? 1 : 0);
  res.json({ ok: true });
});

app.put('/api/savings-transfers/:id', auth, (req, res) => {
  const { name, fromAccountId, toAccountId, amount, dayOfMonth, active } = req.body;
  db.prepare(`UPDATE savingsTransfers SET name=?, fromAccountId=?, toAccountId=?, amount=?, dayOfMonth=?, active=?
    WHERE id=? AND userId=?`)
    .run(name, fromAccountId, toAccountId, amount, dayOfMonth, active ? 1 : 0, req.params.id, req.user.id);
  res.json({ ok: true });
});

app.delete('/api/savings-transfers/:id', auth, (req, res) => {
  db.prepare('DELETE FROM savingsTransfers WHERE id=? AND userId=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

app.post('/api/savings-transfers/:id/apply', auth, (req, res) => {
  const transfer = db.prepare('SELECT * FROM savingsTransfers WHERE id=? AND userId=?')
    .get(req.params.id, req.user.id);
  if (!transfer) return res.status(404).json({ error: 'Transferencia no encontrada' });
  if (!transfer.active) return res.status(400).json({ error: 'Transferencia inactiva' });

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (transfer.lastApplied === yearMonth) return res.status(400).json({ error: 'Ya aplicada este mes' });

  const txDate = now.toISOString();
  const txIdOut = `stx_out_${Date.now()}`;
  const txIdIn  = `stx_in_${Date.now() + 1}`;

  db.prepare('UPDATE accounts SET balance = ROUND(balance - ?, 2) WHERE id=? AND userId=?')
    .run(transfer.amount, transfer.fromAccountId, req.user.id);
  db.prepare(`INSERT INTO transactions (id, userId, accountId, type, amount, description, category, date, notes, transferGroup)
    VALUES (?, ?, ?, 'expense', ?, ?, 'ahorro', ?, '', '')`)
    .run(txIdOut, req.user.id, transfer.fromAccountId, transfer.amount, `Ahorro: ${transfer.name}`, txDate);

  db.prepare('UPDATE accounts SET balance = ROUND(balance + ?, 2) WHERE id=? AND userId=?')
    .run(transfer.amount, transfer.toAccountId, req.user.id);
  db.prepare(`INSERT INTO transactions (id, userId, accountId, type, amount, description, category, date, notes, transferGroup)
    VALUES (?, ?, ?, 'income', ?, ?, 'ahorro', ?, '', '')`)
    .run(txIdIn, req.user.id, transfer.toAccountId, transfer.amount, `Ahorro: ${transfer.name}`, txDate);

  db.prepare('UPDATE savingsTransfers SET lastApplied=? WHERE id=? AND userId=?')
    .run(yearMonth, req.params.id, req.user.id);

  res.json({ ok: true, yearMonth });
});

// ============================================================
// PAGOS APLAZADOS / FINANCIADOS
// ============================================================

app.get('/api/financed-items', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM financedItems WHERE userId=?').all(req.user.id);
  res.json(rows.map(r => ({ ...r, active: r.active === 1 })));
});

app.post('/api/financed-items', auth, (req, res) => {
  const { id, name, accountId, totalAmount, months, monthlyAmount, dayOfMonth, startDate, active } = req.body;
  db.prepare(`
    INSERT INTO financedItems (id, userId, name, accountId, totalAmount, months, monthlyAmount, dayOfMonth, startDate, appliedCount, active, lastApplied)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, '')
  `).run(id, req.user.id, name, accountId, totalAmount, months, monthlyAmount,
         dayOfMonth ?? 1, startDate, active !== false ? 1 : 0);
  res.json({ ok: true });
});

app.put('/api/financed-items/:id', auth, (req, res) => {
  const { name, accountId, totalAmount, months, monthlyAmount, dayOfMonth, active } = req.body;
  db.prepare(`UPDATE financedItems SET name=?, accountId=?, totalAmount=?, months=?, monthlyAmount=?, dayOfMonth=?, active=?
    WHERE id=? AND userId=?`)
    .run(name, accountId, totalAmount, months, monthlyAmount, dayOfMonth, active ? 1 : 0,
         req.params.id, req.user.id);
  res.json({ ok: true });
});

app.delete('/api/financed-items/:id', auth, (req, res) => {
  db.prepare('DELETE FROM financedItems WHERE id=? AND userId=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

app.post('/api/financed-items/:id/apply', auth, (req, res) => {
  const item = db.prepare('SELECT * FROM financedItems WHERE id=? AND userId=?')
    .get(req.params.id, req.user.id);
  if (!item) return res.status(404).json({ error: 'Pago no encontrado' });
  if (!item.active) return res.status(400).json({ error: 'Pago inactivo' });
  if (item.appliedCount >= item.months) return res.status(400).json({ error: 'Pago completado' });

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (item.lastApplied === yearMonth) return res.status(400).json({ error: 'Ya aplicado este mes' });

  const newCount = item.appliedCount + 1;
  const txId = `fi_${Date.now()}`;

  db.prepare('UPDATE accounts SET balance = ROUND(balance - ?, 2) WHERE id=? AND userId=?')
    .run(item.monthlyAmount, item.accountId, req.user.id);
  db.prepare(`INSERT INTO transactions (id, userId, accountId, type, amount, description, category, date, notes, transferGroup)
    VALUES (?, ?, ?, 'expense', ?, ?, 'financiado', ?, ?, '')`)
    .run(txId, req.user.id, item.accountId, item.monthlyAmount,
         `${item.name} (${newCount}/${item.months})`, now.toISOString(),
         `Cargo ${newCount} de ${item.months}`);

  const done = newCount >= item.months;
  db.prepare('UPDATE financedItems SET appliedCount=?, lastApplied=?, active=? WHERE id=? AND userId=?')
    .run(newCount, yearMonth, done ? 0 : 1, req.params.id, req.user.id);

  res.json({ ok: true, appliedCount: newCount, completed: done });
});

// ============================================================
// PRESUPUESTOS
// ============================================================

app.get('/api/budgets', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM budgets WHERE userId=?').all(req.user.id));
});

app.post('/api/budgets', auth, (req, res) => {
  const { id, categoryId, amount, period } = req.body;
  const existing = db.prepare('SELECT id FROM budgets WHERE userId=? AND categoryId=?')
    .get(req.user.id, categoryId);
  if (existing) {
    db.prepare('UPDATE budgets SET amount=? WHERE id=? AND userId=?')
      .run(amount, existing.id, req.user.id);
  } else {
    db.prepare('INSERT INTO budgets (id, userId, categoryId, amount, period) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.user.id, categoryId, amount, period ?? 'monthly');
  }
  res.json({ ok: true });
});

app.delete('/api/budgets/:id', auth, (req, res) => {
  db.prepare('DELETE FROM budgets WHERE id=? AND userId=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// ============================================================
// OBJETIVOS DE AHORRO
// ============================================================

app.get('/api/goals', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM goals WHERE userId=?').all(req.user.id));
});

app.post('/api/goals', auth, (req, res) => {
  const { id, name, targetAmount, currentAmount, targetDate, accountId, icon } = req.body;
  db.prepare(`INSERT INTO goals (id, userId, name, targetAmount, currentAmount, targetDate, accountId, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.user.id, name, targetAmount, currentAmount ?? 0, targetDate ?? '', accountId ?? '', icon ?? '🎯');
  res.json({ ok: true });
});

app.put('/api/goals/:id', auth, (req, res) => {
  const { name, targetAmount, currentAmount, targetDate, accountId, icon } = req.body;
  db.prepare(`UPDATE goals SET name=?, targetAmount=?, currentAmount=?, targetDate=?, accountId=?, icon=?
    WHERE id=? AND userId=?`)
    .run(name, targetAmount, currentAmount, targetDate ?? '', accountId ?? '', icon ?? '🎯',
         req.params.id, req.user.id);
  res.json({ ok: true });
});

app.delete('/api/goals/:id', auth, (req, res) => {
  db.prepare('DELETE FROM goals WHERE id=? AND userId=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// ============================================================
// DEUDAS
// ============================================================

app.get('/api/debts', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM debts WHERE userId=?').all(req.user.id);
  res.json(rows.map(r => ({ ...r, active: r.active === 1 })));
});

app.post('/api/debts', auth, (req, res) => {
  const { id, name, totalAmount, paidAmount, icon, color, notes, startDate, targetDate } = req.body;
  db.prepare(`INSERT INTO debts (id, userId, name, totalAmount, paidAmount, icon, color, notes, startDate, targetDate, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
    .run(id, req.user.id, name, totalAmount, paidAmount ?? 0,
         icon ?? '🏚️', color ?? '#7c3aed', notes ?? '',
         startDate ?? '', targetDate ?? '');
  res.json({ ok: true });
});

app.put('/api/debts/:id', auth, (req, res) => {
  const { name, totalAmount, paidAmount, icon, color, notes, targetDate, active } = req.body;
  db.prepare(`UPDATE debts SET name=?, totalAmount=?, paidAmount=?, icon=?, color=?, notes=?, targetDate=?, active=?
    WHERE id=? AND userId=?`)
    .run(name, totalAmount, paidAmount, icon ?? '🏚️', color ?? '#7c3aed',
         notes ?? '', targetDate ?? '', active !== false ? 1 : 0,
         req.params.id, req.user.id);
  res.json({ ok: true });
});

app.delete('/api/debts/:id', auth, (req, res) => {
  db.prepare('DELETE FROM debts WHERE id=? AND userId=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// Registrar un pago de deuda: crea transacción de gasto + actualiza paidAmount
app.post('/api/debts/:id/pay', auth, (req, res) => {
  const debt = db.prepare('SELECT * FROM debts WHERE id=? AND userId=?')
    .get(req.params.id, req.user.id);
  if (!debt) return res.status(404).json({ error: 'Deuda no encontrada' });

  const { amount, accountId, date, description } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Importe inválido' });
  if (!accountId) return res.status(400).json({ error: 'Cuenta requerida' });

  const txId = `debt_${Date.now()}`;
  const txDate = date || new Date().toISOString();
  const desc = description || `Pago: ${debt.name}`;

  // Crear transacción de gasto
  db.prepare('UPDATE accounts SET balance = ROUND(balance - ?, 2) WHERE id=? AND userId=?')
    .run(amount, accountId, req.user.id);
  db.prepare(`INSERT INTO transactions (id, userId, accountId, type, amount, description, category, date, notes, transferGroup)
    VALUES (?, ?, ?, 'expense', ?, ?, 'deuda', ?, ?, '')`)
    .run(txId, req.user.id, accountId, amount, desc, txDate, `Pago deuda: ${debt.name}`);

  // Actualizar paidAmount de la deuda
  const newPaid = Math.min(debt.paidAmount + amount, debt.totalAmount);
  const completed = newPaid >= debt.totalAmount;
  db.prepare('UPDATE debts SET paidAmount=?, active=? WHERE id=? AND userId=?')
    .run(newPaid, completed ? 0 : 1, req.params.id, req.user.id);

  res.json({ ok: true, paidAmount: newPaid, completed });
});

// ============================================================
// PRÉSTAMOS (dinero que tú has prestado a otros)
// ============================================================

app.get('/api/loans', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM loans WHERE userId=?').all(req.user.id);
  res.json(rows.map(r => ({ ...r, active: r.active === 1 })));
});

app.post('/api/loans', auth, (req, res) => {
  const { id, name, totalAmount, collectedAmount, icon, color, notes, startDate, targetDate } = req.body;
  db.prepare(`INSERT INTO loans (id, userId, name, totalAmount, collectedAmount, icon, color, notes, startDate, targetDate, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
    .run(id, req.user.id, name, totalAmount, collectedAmount ?? 0,
         icon ?? '🤝', color ?? '#10b981', notes ?? '',
         startDate ?? '', targetDate ?? '');
  res.json({ ok: true });
});

app.put('/api/loans/:id', auth, (req, res) => {
  const { name, totalAmount, collectedAmount, icon, color, notes, targetDate, active } = req.body;
  db.prepare(`UPDATE loans SET name=?, totalAmount=?, collectedAmount=?, icon=?, color=?, notes=?, targetDate=?, active=?
    WHERE id=? AND userId=?`)
    .run(name, totalAmount, collectedAmount, icon ?? '🤝', color ?? '#10b981',
         notes ?? '', targetDate ?? '', active !== false ? 1 : 0,
         req.params.id, req.user.id);
  res.json({ ok: true });
});

app.delete('/api/loans/:id', auth, (req, res) => {
  db.prepare('DELETE FROM loans WHERE id=? AND userId=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

// Registrar cobro parcial: crea transacción de ingreso + actualiza collectedAmount
app.post('/api/loans/:id/collect', auth, (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id=? AND userId=?')
    .get(req.params.id, req.user.id);
  if (!loan) return res.status(404).json({ error: 'Préstamo no encontrado' });

  const { amount, accountId, date, description } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Importe inválido' });
  if (!accountId) return res.status(400).json({ error: 'Cuenta requerida' });

  const txId = `loan_${Date.now()}`;
  const txDate = date || new Date().toISOString();
  const desc = description || `Cobro: ${loan.name}`;

  db.prepare('UPDATE accounts SET balance = ROUND(balance + ?, 2) WHERE id=? AND userId=?')
    .run(amount, accountId, req.user.id);
  db.prepare(`INSERT INTO transactions (id, userId, accountId, type, amount, description, category, date, notes, transferGroup)
    VALUES (?, ?, ?, 'income', ?, ?, 'prestamo', ?, ?, '')`)
    .run(txId, req.user.id, accountId, amount, desc, txDate, `Cobro préstamo: ${loan.name}`);

  const newCollected = Math.min(loan.collectedAmount + amount, loan.totalAmount);
  const completed = newCollected >= loan.totalAmount;
  db.prepare('UPDATE loans SET collectedAmount=?, active=? WHERE id=? AND userId=?')
    .run(newCollected, completed ? 0 : 1, req.params.id, req.user.id);

  res.json({ ok: true, collectedAmount: newCollected, completed });
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Nova API] Puerto ${PORT} — ${new Date().toISOString()}`);
});
