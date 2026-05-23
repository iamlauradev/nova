const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM budgets WHERE userId=?').all(req.user.id));
});

router.post('/', auth, (req, res) => {
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

router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM budgets WHERE id=? AND userId=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
