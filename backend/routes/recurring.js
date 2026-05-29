const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const items = db.prepare('SELECT * FROM recurringItems WHERE userId=? AND deletedAt IS NULL').all(req.user.id);
  res.json(items.map(r => ({ ...r, active: r.active === 1 })));
});

router.post('/', auth, (req, res) => {
  const { id, name, type, amount, category, accountId, frequency, dayOfMonth, notes, active, customMonths } = req.body;
  db.prepare(`
    INSERT INTO recurringItems (id, userId, name, type, amount, category, accountId, frequency, dayOfMonth, notes, active, customMonths)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, name, type, amount, category ?? '', accountId ?? '',
         frequency ?? 'monthly', dayOfMonth ?? '', notes ?? '', active !== false ? 1 : 0,
         customMonths ?? 0);
  res.json({ ok: true });
});

router.put('/:id', auth, (req, res) => {
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

router.post('/:id/apply', auth, (req, res) => {
  const item = db.prepare('SELECT * FROM recurringItems WHERE id=? AND userId=? AND deletedAt IS NULL').get(req.params.id, req.user.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (!item.accountId) return res.status(400).json({ error: 'No account associated' });

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const txId = `tx_rec_${Date.now()}`;
  const delta = item.type === 'income' ? item.amount : -item.amount;

  db.transaction(() => {
    db.prepare(
      `INSERT INTO transactions (id, userId, accountId, type, amount, description, category, date, notes, transferGroup)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '')`
    ).run(txId, req.user.id, item.accountId, item.type, item.amount, item.name, item.category || '', now.toISOString());
    db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ? AND userId = ?').run(delta, item.accountId, req.user.id);
    db.prepare('UPDATE recurringItems SET lastApplied = ? WHERE id = ? AND userId = ?').run(yearMonth, item.id, req.user.id);
  })();

  res.json({ ok: true, txId });
});

router.delete('/:id', auth, (req, res) => {
  db.prepare("UPDATE recurringItems SET deletedAt = datetime('now') WHERE id=? AND userId=?").run(req.params.id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
