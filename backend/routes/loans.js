const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { validate } = require('../helpers');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM loans WHERE userId=? AND deletedAt IS NULL').all(req.user.id);
  res.json(rows.map(r => ({ ...r, active: r.active === 1 })));
});

router.post('/', auth, (req, res) => {
  const { id, name, totalAmount, collectedAmount, icon, color, notes, startDate, targetDate } = req.body;
  const err = validate({
    id:          { required: true, type: 'string' },
    name:        { required: true, type: 'string', maxLen: 100 },
    totalAmount: { required: true, type: 'number', min: 0.01 },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  db.prepare(`INSERT INTO loans (id, userId, name, totalAmount, collectedAmount, icon, color, notes, startDate, targetDate, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
    .run(id, req.user.id, name, totalAmount, collectedAmount ?? 0,
         icon ?? '🤝', color ?? '#10b981', notes ?? '',
         startDate ?? '', targetDate ?? '');
  res.json({ ok: true });
});

router.put('/:id', auth, (req, res) => {
  const err = validate({
    name:        { required: true, type: 'string', maxLen: 100 },
    totalAmount: { required: true, type: 'number', min: 0.01 },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  const { name, totalAmount, collectedAmount, icon, color, notes, targetDate, active } = req.body;
  db.prepare(`UPDATE loans SET name=?, totalAmount=?, collectedAmount=?, icon=?, color=?, notes=?, targetDate=?, active=?
    WHERE id=? AND userId=?`)
    .run(name, totalAmount, collectedAmount ?? 0, icon ?? '🤝', color ?? '#10b981',
         notes ?? '', targetDate ?? '', active !== false ? 1 : 0,
         req.params.id, req.user.id);
  res.json({ ok: true });
});

router.delete('/:id', auth, (req, res) => {
  db.prepare("UPDATE loans SET deletedAt = datetime('now') WHERE id=? AND userId=?").run(req.params.id, req.user.id);
  res.json({ ok: true });
});

router.post('/:id/collect', auth, (req, res) => {
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

module.exports = router;
