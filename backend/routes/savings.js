const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM savingsTransfers WHERE userId=?').all(req.user.id);
  res.json(rows.map(r => ({ ...r, active: r.active === 1 })));
});

router.post('/', auth, (req, res) => {
  const { id, name, fromAccountId, toAccountId, amount, dayOfMonth, active } = req.body;
  db.prepare(`
    INSERT INTO savingsTransfers (id, userId, name, fromAccountId, toAccountId, amount, dayOfMonth, active, lastApplied)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, '')
  `).run(id, req.user.id, name, fromAccountId, toAccountId, amount, dayOfMonth ?? 1, active !== false ? 1 : 0);
  res.json({ ok: true });
});

router.put('/:id', auth, (req, res) => {
  const { name, fromAccountId, toAccountId, amount, dayOfMonth, active } = req.body;
  db.prepare(`UPDATE savingsTransfers SET name=?, fromAccountId=?, toAccountId=?, amount=?, dayOfMonth=?, active=?
    WHERE id=? AND userId=?`)
    .run(name, fromAccountId, toAccountId, amount, dayOfMonth, active ? 1 : 0, req.params.id, req.user.id);
  res.json({ ok: true });
});

router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM savingsTransfers WHERE id=? AND userId=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

router.post('/:id/apply', auth, (req, res) => {
  const transfer = db.prepare('SELECT * FROM savingsTransfers WHERE id=? AND userId=?')
    .get(req.params.id, req.user.id);
  if (!transfer) return res.status(404).json({ error: 'Transferencia no encontrada' });
  if (!transfer.active) return res.status(400).json({ error: 'Transferencia inactiva' });

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (transfer.lastApplied === yearMonth) return res.status(400).json({ error: 'Ya aplicada este mes' });

  const txDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const txIdOut = `stx_out_${Date.now()}`;
  const txIdIn  = `stx_in_${Date.now() + 1}`;

  db.transaction(() => {
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
  })();

  res.json({ ok: true, yearMonth });
});

module.exports = router;
