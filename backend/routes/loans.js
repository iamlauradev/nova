const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { validate } = require('../helpers');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const rows = await db.query(`SELECT * FROM loans WHERE "userId"=$1 AND "deletedAt" IS NULL`, [req.user.id]);
  res.json(rows.map(r => ({ ...r, active: r.active === 1 })));
});

router.post('/', auth, async (req, res) => {
  const { id, name, totalAmount, collectedAmount, icon, color, notes, startDate, targetDate } = req.body;
  const err = validate({
    id:          { required: true, type: 'string' },
    name:        { required: true, type: 'string', maxLen: 100 },
    totalAmount: { required: true, type: 'number', min: 0.01 },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  await db.execute(
    `INSERT INTO loans (id,"userId",name,"totalAmount","collectedAmount",icon,color,notes,"startDate","targetDate",active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1)`,
    [id, req.user.id, name, totalAmount, collectedAmount ?? 0,
     icon ?? '🤝', color ?? '#10b981', notes ?? '',
     startDate ?? '', targetDate ?? '']
  );
  res.json({ ok: true });
});

router.put('/:id', auth, async (req, res) => {
  const err = validate({
    name:        { required: true, type: 'string', maxLen: 100 },
    totalAmount: { required: true, type: 'number', min: 0.01 },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  const { name, totalAmount, collectedAmount, icon, color, notes, targetDate, active } = req.body;
  await db.execute(
    `UPDATE loans SET name=$1,"totalAmount"=$2,"collectedAmount"=$3,icon=$4,color=$5,notes=$6,"targetDate"=$7,active=$8
     WHERE id=$9 AND "userId"=$10`,
    [name, totalAmount, collectedAmount ?? 0, icon ?? '🤝', color ?? '#10b981',
     notes ?? '', targetDate ?? '', active !== false ? 1 : 0,
     req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

router.delete('/:id', auth, async (req, res) => {
  await db.execute(`UPDATE loans SET "deletedAt" = NOW()::text WHERE id=$1 AND "userId"=$2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
});

router.post('/:id/collect', auth, async (req, res) => {
  const loan = await db.queryOne(`SELECT * FROM loans WHERE id=$1 AND "userId"=$2`, [req.params.id, req.user.id]);
  if (!loan) return res.status(404).json({ error: 'Préstamo no encontrado' });

  const { amount, accountId, date, description } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Importe inválido' });
  if (!accountId) return res.status(400).json({ error: 'Cuenta requerida' });

  const txId = `loan_${Date.now()}`;
  const now = new Date();
  const txDate = date || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const desc = description || `Cobro: ${loan.name}`;

  const newCollected = Math.min(Number(loan.collectedAmount) + amount, Number(loan.totalAmount));
  const completed = newCollected >= Number(loan.totalAmount);

  await db.withTx(async (client) => {
    await client.query(`UPDATE accounts SET balance = ROUND(balance + $1, 2) WHERE id=$2 AND "userId"=$3`,
      [amount, accountId, req.user.id]);
    await client.query(
      `INSERT INTO transactions (id,"userId","accountId",type,amount,description,category,date,notes,"transferGroup")
       VALUES ($1,$2,$3,'income',$4,$5,'prestamo',$6,$7,'')`,
      [txId, req.user.id, accountId, amount, desc, txDate, `Cobro préstamo: ${loan.name}`]
    );
    await client.query(`UPDATE loans SET "collectedAmount"=$1,active=$2 WHERE id=$3 AND "userId"=$4`,
      [newCollected, completed ? 0 : 1, req.params.id, req.user.id]);
  });

  res.json({ ok: true, collectedAmount: newCollected, completed });
});

module.exports = router;
