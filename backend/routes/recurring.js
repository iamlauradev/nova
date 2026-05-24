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

router.delete('/:id', auth, (req, res) => {
  db.prepare("UPDATE recurringItems SET deletedAt = datetime('now') WHERE id=? AND userId=?").run(req.params.id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
