const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { validate } = require('../helpers');
const { audit } = require('../middleware/audit');

const router = express.Router();

router.get('/', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM goals WHERE userId=? AND deletedAt IS NULL').all(req.user.id));
});

router.post('/', auth, (req, res) => {
  const { id, name, targetAmount, currentAmount, targetDate, accountId, icon } = req.body;
  const err = validate({
    id:           { required: true, type: 'string' },
    name:         { required: true, type: 'string', maxLen: 100 },
    targetAmount: { required: true, type: 'number', min: 0.01 },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  db.prepare(`INSERT INTO goals (id, userId, name, targetAmount, currentAmount, targetDate, accountId, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, req.user.id, name, targetAmount, currentAmount ?? 0, targetDate ?? '', accountId ?? '', icon ?? '🎯');
  audit(req.user.id, 'goal', id, 'create', { name, targetAmount });
  res.json({ ok: true });
});

router.put('/:id', auth, (req, res) => {
  const err = validate({
    name:         { required: true, type: 'string', maxLen: 100 },
    targetAmount: { required: true, type: 'number', min: 0.01 },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  const { name, targetAmount, currentAmount, targetDate, accountId, icon } = req.body;
  db.prepare(`UPDATE goals SET name=?, targetAmount=?, currentAmount=?, targetDate=?, accountId=?, icon=?
    WHERE id=? AND userId=?`)
    .run(name, targetAmount, currentAmount ?? 0, targetDate ?? '', accountId ?? '', icon ?? '🎯',
         req.params.id, req.user.id);
  res.json({ ok: true });
});

router.delete('/:id', auth, (req, res) => {
  db.prepare("UPDATE goals SET deletedAt = datetime('now') WHERE id=? AND userId=?").run(req.params.id, req.user.id);
  audit(req.user.id, 'goal', req.params.id, 'delete', null);
  res.json({ ok: true });
});

module.exports = router;
