const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { validate } = require('../helpers');
const { audit } = require('../middleware/audit');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const rows = await db.query(`SELECT * FROM debts WHERE "userId"=$1 AND "deletedAt" IS NULL`, [req.user.id]);
  res.json(rows.map(r => ({ ...r, active: r.active === 1 })));
});

router.post('/', auth, async (req, res) => {
  const { id, name, totalAmount, paidAmount, icon, color, notes, startDate, targetDate } = req.body;
  const err = validate({
    id:          { required: true, type: 'string' },
    name:        { required: true, type: 'string', maxLen: 100 },
    totalAmount: { required: true, type: 'number', min: 0.01 },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  await db.execute(
    `INSERT INTO debts (id,"userId",name,"totalAmount","paidAmount",icon,color,notes,"startDate","targetDate",active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1)`,
    [id, req.user.id, name, totalAmount, paidAmount ?? 0,
     icon ?? '🏚️', color ?? '#7c3aed', notes ?? '',
     startDate ?? '', targetDate ?? '']
  );
  await audit(req.user.id, 'debt', id, 'create', { name, totalAmount });
  res.json({ ok: true });
});

router.put('/:id', auth, async (req, res) => {
  const err = validate({
    name:        { required: true, type: 'string', maxLen: 100 },
    totalAmount: { required: true, type: 'number', min: 0.01 },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  const { name, totalAmount, paidAmount, icon, color, notes, targetDate, active } = req.body;
  await db.execute(
    `UPDATE debts SET name=$1,"totalAmount"=$2,"paidAmount"=$3,icon=$4,color=$5,notes=$6,"targetDate"=$7,active=$8
     WHERE id=$9 AND "userId"=$10`,
    [name, totalAmount, paidAmount ?? 0, icon ?? '🏚️', color ?? '#7c3aed',
     notes ?? '', targetDate ?? '', active !== false ? 1 : 0,
     req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

router.delete('/:id', auth, async (req, res) => {
  await db.execute(`UPDATE debts SET "deletedAt" = NOW()::text WHERE id=$1 AND "userId"=$2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
});

router.post('/:id/pay', auth, async (req, res) => {
  const debt = await db.queryOne(`SELECT * FROM debts WHERE id=$1 AND "userId"=$2`, [req.params.id, req.user.id]);
  if (!debt) return res.status(404).json({ error: 'Deuda no encontrada' });

  const { amount, accountId, date, description } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Importe inválido' });
  if (!accountId) return res.status(400).json({ error: 'Cuenta requerida' });

  const txId = `debt_${Date.now()}`;
  const now = new Date();
  const txDate = date || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const desc = description || `Pago: ${debt.name}`;

  await db.execute(`UPDATE accounts SET balance = ROUND(balance - $1, 2) WHERE id=$2 AND "userId"=$3`,
    [amount, accountId, req.user.id]);
  await db.execute(
    `INSERT INTO transactions (id,"userId","accountId",type,amount,description,category,date,notes,"transferGroup")
     VALUES ($1,$2,$3,'expense',$4,$5,'deuda',$6,$7,'')`,
    [txId, req.user.id, accountId, amount, desc, txDate, `Pago deuda: ${debt.name}`]
  );

  const newPaid = Math.min(Number(debt.paidAmount) + amount, Number(debt.totalAmount));
  const completed = newPaid >= Number(debt.totalAmount);
  await db.execute(`UPDATE debts SET "paidAmount"=$1,active=$2 WHERE id=$3 AND "userId"=$4`,
    [newPaid, completed ? 0 : 1, req.params.id, req.user.id]);

  res.json({ ok: true, paidAmount: newPaid, completed });
});

module.exports = router;
