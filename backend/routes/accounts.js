const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { validate } = require('../helpers');

const router = express.Router();
const VALID_ACCOUNT_TYPES = ['checking', 'savings', 'cash', 'investment', 'other'];

router.get('/', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM accounts WHERE userId = ? AND archived = 0').all(req.user.id));
});

router.get('/archived', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM accounts WHERE userId = ? AND archived = 1').all(req.user.id));
});

router.post('/', auth, (req, res) => {
  const { id, name, type, balance, color } = req.body;
  const err = validate({
    id:   { required: true, type: 'string' },
    name: { required: true, type: 'string', maxLen: 50 },
    type: { required: true, enum: VALID_ACCOUNT_TYPES },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  if (balance !== undefined && (typeof balance !== 'number' || isNaN(balance)))
    return res.status(400).json({ error: '"balance" debe ser un número' });

  db.prepare('INSERT INTO accounts (id, userId, name, type, balance, color) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.user.id, name, type, balance ?? 0, color ?? '');
  res.json({ ok: true });
});

router.put('/:id', auth, (req, res) => {
  const err = validate({
    name: { required: true, type: 'string', maxLen: 50 },
    type: { required: true, enum: VALID_ACCOUNT_TYPES },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  const { name, type, balance, color } = req.body;
  if (balance !== undefined && (typeof balance !== 'number' || isNaN(balance)))
    return res.status(400).json({ error: '"balance" debe ser un número' });

  db.prepare('UPDATE accounts SET name=?, type=?, balance=?, color=? WHERE id=? AND userId=?')
    .run(name, type, balance ?? 0, color ?? '', req.params.id, req.user.id);
  res.json({ ok: true });
});

router.delete('/:id', auth, (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE accounts SET archived=1 WHERE id=? AND userId=?').run(id, req.user.id);
  db.prepare('UPDATE recurringItems SET active=0 WHERE accountId=? AND userId=?').run(id, req.user.id);
  db.prepare('UPDATE savingsTransfers SET active=0 WHERE (fromAccountId=? OR toAccountId=?) AND userId=?').run(id, id, req.user.id);
  db.prepare('UPDATE financedItems SET active=0 WHERE accountId=? AND userId=?').run(id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
