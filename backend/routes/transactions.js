const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { validate } = require('../helpers');
const { audit } = require('../middleware/audit');
const { notifyUser } = require('../sse');

const router = express.Router();
const VALID_TX_TYPES = ['income', 'expense', 'transfer-in', 'transfer-out', 'transfer'];

router.get('/', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM transactions WHERE userId=? AND deletedAt IS NULL ORDER BY date DESC').all(req.user.id));
});

router.post('/', auth, (req, res) => {
  const { id, accountId, type, amount, description, category, date, notes, transferGroup, tags, splits } = req.body;
  const err = validate({
    id:        { required: true, type: 'string' },
    accountId: { required: true, type: 'string' },
    type:      { required: true, enum: VALID_TX_TYPES },
    amount:    { required: true, type: 'number', min: 0 },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  const delta = type === 'income' ? amount : (type === 'expense' ? -amount : 0);
  if (delta !== 0) {
    db.prepare('UPDATE accounts SET balance = ROUND(balance + ?, 2) WHERE id=? AND userId=?')
      .run(delta, accountId, req.user.id);
  }
  const splitsJson = splits ? JSON.stringify(splits) : null;
  db.prepare(`
    INSERT INTO transactions (id, userId, accountId, type, amount, description, category, date, notes, transferGroup, tags, splits)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, accountId, type, amount, description ?? '', category ?? '', date,
         notes ?? '', transferGroup ?? '', tags ?? '', splitsJson);
  audit(req.user.id, 'transaction', id, 'create', { type, amount, category });
  notifyUser(req.user.id);
  res.json({ ok: true });
});

router.put('/:id', auth, (req, res) => {
  const old = db.prepare('SELECT * FROM transactions WHERE id=? AND userId=?')
    .get(req.params.id, req.user.id);
  if (!old) return res.status(404).json({ error: 'Transacción no encontrada' });

  const validationErr = validate({
    accountId: { required: true, type: 'string' },
    type:      { required: true, enum: VALID_TX_TYPES },
    amount:    { required: true, type: 'number', min: 0 },
  }, req.body);
  if (validationErr) return res.status(400).json({ error: validationErr });

  const { accountId, type, amount, description, category, date, notes, tags, splits } = req.body;

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

  const splitsJson = splits !== undefined ? (splits ? JSON.stringify(splits) : null) : old.splits;
  db.prepare(`
    UPDATE transactions SET accountId=?, type=?, amount=?, description=?, category=?, date=?, notes=?, tags=?, splits=?
    WHERE id=? AND userId=?
  `).run(accountId, type, amount, description ?? '', category ?? '', date, notes ?? '', tags ?? '', splitsJson,
         req.params.id, req.user.id);
  audit(req.user.id, 'transaction', req.params.id, 'update', { type, amount, category });
  res.json({ ok: true });
});

router.delete('/:id', auth, (req, res) => {
  const tx = db.prepare('SELECT * FROM transactions WHERE id=? AND userId=?')
    .get(req.params.id, req.user.id);
  if (tx) {
    if (tx.type === 'income' || tx.type === 'transfer-in') {
      db.prepare('UPDATE accounts SET balance = ROUND(balance - ?, 2) WHERE id=? AND userId=?')
        .run(tx.amount, tx.accountId, req.user.id);
    } else if (tx.type === 'expense' || tx.type === 'transfer-out') {
      db.prepare('UPDATE accounts SET balance = ROUND(balance + ?, 2) WHERE id=? AND userId=?')
        .run(tx.amount, tx.accountId, req.user.id);
    }
    if (tx.transferGroup) {
      const paired = db.prepare('SELECT * FROM transactions WHERE transferGroup=? AND id!=? AND userId=? AND deletedAt IS NULL')
        .get(tx.transferGroup, req.params.id, req.user.id);
      if (paired) {
        if (paired.type === 'income' || paired.type === 'transfer-in') {
          db.prepare('UPDATE accounts SET balance = ROUND(balance - ?, 2) WHERE id=? AND userId=?')
            .run(paired.amount, paired.accountId, req.user.id);
        } else if (paired.type === 'expense' || paired.type === 'transfer-out') {
          db.prepare('UPDATE accounts SET balance = ROUND(balance + ?, 2) WHERE id=? AND userId=?')
            .run(paired.amount, paired.accountId, req.user.id);
        }
        db.prepare("UPDATE transactions SET deletedAt = datetime('now') WHERE id=? AND userId=?").run(paired.id, req.user.id);
      }
    }
    db.prepare("UPDATE transactions SET deletedAt = datetime('now') WHERE id=? AND userId=?").run(req.params.id, req.user.id);
    audit(req.user.id, 'transaction', req.params.id, 'delete', null);
  }
  res.json({ ok: true });
});

router.post('/transfer', auth, (req, res) => {
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

module.exports = router;
