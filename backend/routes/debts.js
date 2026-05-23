const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { validate } = require('../helpers');
const { audit } = require('../middleware/audit');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM debts WHERE userId=? AND deletedAt IS NULL').all(req.user.id);
  res.json(rows.map(r => ({ ...r, active: r.active === 1 })));
});

router.post('/', auth, (req, res) => {
  const { id, name, totalAmount, paidAmount, icon, color, notes, startDate, targetDate } = req.body;
  const err = validate({
    id:          { required: true, type: 'string' },
    name:        { required: true, type: 'string', maxLen: 100 },
    totalAmount: { required: true, type: 'number', min: 0.01 },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  db.prepare(`INSERT INTO debts (id, userId, name, totalAmount, paidAmount, icon, color, notes, startDate, targetDate, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
    .run(id, req.user.id, name, totalAmount, paidAmount ?? 0,
         icon ?? '🏚️', color ?? '#7c3aed', notes ?? '',
         startDate ?? '', targetDate ?? '');
  audit(req.user.id, 'debt', id, 'create', { name, totalAmount });
  res.json({ ok: true });
});

router.put('/:id', auth, (req, res) => {
  const err = validate({
    name:        { required: true, type: 'string', maxLen: 100 },
    totalAmount: { required: true, type: 'number', min: 0.01 },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  const { name, totalAmount, paidAmount, icon, color, notes, targetDate, active } = req.body;
  db.prepare(`UPDATE debts SET name=?, totalAmount=?, paidAmount=?, icon=?, color=?, notes=?, targetDate=?, active=?
    WHERE id=? AND userId=?`)
    .run(name, totalAmount, paidAmount ?? 0, icon ?? '🏚️', color ?? '#7c3aed',
         notes ?? '', targetDate ?? '', active !== false ? 1 : 0,
         req.params.id, req.user.id);
  res.json({ ok: true });
});

router.delete('/:id', auth, (req, res) => {
  db.prepare("UPDATE debts SET deletedAt = datetime('now') WHERE id=? AND userId=?").run(req.params.id, req.user.id);
  res.json({ ok: true });
});

router.post('/:id/pay', auth, (req, res) => {
  const debt = db.prepare('SELECT * FROM debts WHERE id=? AND userId=?')
    .get(req.params.id, req.user.id);
  if (!debt) return res.status(404).json({ error: 'Deuda no encontrada' });

  const { amount, accountId, date, description } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Importe inválido' });
  if (!accountId) return res.status(400).json({ error: 'Cuenta requerida' });

  const txId = `debt_${Date.now()}`;
  const txDate = date || new Date().toISOString();
  const desc = description || `Pago: ${debt.name}`;

  db.prepare('UPDATE accounts SET balance = ROUND(balance - ?, 2) WHERE id=? AND userId=?')
    .run(amount, accountId, req.user.id);
  db.prepare(`INSERT INTO transactions (id, userId, accountId, type, amount, description, category, date, notes, transferGroup)
    VALUES (?, ?, ?, 'expense', ?, ?, 'deuda', ?, ?, '')`)
    .run(txId, req.user.id, accountId, amount, desc, txDate, `Pago deuda: ${debt.name}`);

  const newPaid = Math.min(debt.paidAmount + amount, debt.totalAmount);
  const completed = newPaid >= debt.totalAmount;
  db.prepare('UPDATE debts SET paidAmount=?, active=? WHERE id=? AND userId=?')
    .run(newPaid, completed ? 0 : 1, req.params.id, req.user.id);

  res.json({ ok: true, paidAmount: newPaid, completed });
});

module.exports = router;
