const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM financedItems WHERE userId=?').all(req.user.id);
  res.json(rows.map(r => ({ ...r, active: r.active === 1 })));
});

router.post('/', auth, (req, res) => {
  const { id, name, accountId, totalAmount, months, monthlyAmount, dayOfMonth, startDate, active } = req.body;
  db.prepare(`
    INSERT INTO financedItems (id, userId, name, accountId, totalAmount, months, monthlyAmount, dayOfMonth, startDate, appliedCount, active, lastApplied)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, '')
  `).run(id, req.user.id, name, accountId, totalAmount, months, monthlyAmount,
         dayOfMonth ?? 1, startDate, active !== false ? 1 : 0);
  res.json({ ok: true });
});

router.put('/:id', auth, (req, res) => {
  const { name, accountId, totalAmount, months, monthlyAmount, dayOfMonth, active } = req.body;
  db.prepare(`UPDATE financedItems SET name=?, accountId=?, totalAmount=?, months=?, monthlyAmount=?, dayOfMonth=?, active=?
    WHERE id=? AND userId=?`)
    .run(name, accountId, totalAmount, months, monthlyAmount, dayOfMonth, active ? 1 : 0,
         req.params.id, req.user.id);
  res.json({ ok: true });
});

router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM financedItems WHERE id=? AND userId=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

router.post('/:id/apply', auth, (req, res) => {
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

  const done = newCount >= item.months;
  db.transaction(() => {
    db.prepare('UPDATE accounts SET balance = ROUND(balance - ?, 2) WHERE id=? AND userId=?')
      .run(item.monthlyAmount, item.accountId, req.user.id);
    db.prepare(`INSERT INTO transactions (id, userId, accountId, type, amount, description, category, date, notes, transferGroup)
      VALUES (?, ?, ?, 'expense', ?, ?, 'financiado', ?, ?, '')`)
      .run(txId, req.user.id, item.accountId, item.monthlyAmount,
           `${item.name} (${newCount}/${item.months})`, `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,
           `Cargo ${newCount} de ${item.months}`);
    db.prepare('UPDATE financedItems SET appliedCount=?, lastApplied=?, active=? WHERE id=? AND userId=?')
      .run(newCount, yearMonth, done ? 0 : 1, req.params.id, req.user.id);
  })();

  res.json({ ok: true, appliedCount: newCount, completed: done });
});

module.exports = router;
