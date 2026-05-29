const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const rows = await db.query(`SELECT * FROM financed_items WHERE "userId"=$1`, [req.user.id]);
  res.json(rows.map(r => ({ ...r, active: r.active === 1 })));
});

router.post('/', auth, async (req, res) => {
  const { id, name, accountId, totalAmount, months, monthlyAmount, dayOfMonth, startDate, active } = req.body;
  await db.execute(
    `INSERT INTO financed_items (id,"userId",name,"accountId","totalAmount",months,"monthlyAmount","dayOfMonth","startDate","appliedCount",active,"lastApplied")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,'')`,
    [id, req.user.id, name, accountId, totalAmount, months, monthlyAmount,
     dayOfMonth ?? 1, startDate, active !== false ? 1 : 0]
  );
  res.json({ ok: true });
});

router.put('/:id', auth, async (req, res) => {
  const { name, accountId, totalAmount, months, monthlyAmount, dayOfMonth, active } = req.body;
  await db.execute(
    `UPDATE financed_items SET name=$1,"accountId"=$2,"totalAmount"=$3,months=$4,"monthlyAmount"=$5,"dayOfMonth"=$6,active=$7
     WHERE id=$8 AND "userId"=$9`,
    [name, accountId, totalAmount, months, monthlyAmount, dayOfMonth, active ? 1 : 0,
     req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

router.delete('/:id', auth, async (req, res) => {
  await db.execute(`DELETE FROM financed_items WHERE id=$1 AND "userId"=$2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
});

router.post('/:id/apply', auth, async (req, res) => {
  const item = await db.queryOne(
    `SELECT * FROM financed_items WHERE id=$1 AND "userId"=$2`,
    [req.params.id, req.user.id]
  );
  if (!item) return res.status(404).json({ error: 'Pago no encontrado' });
  if (!item.active) return res.status(400).json({ error: 'Pago inactivo' });
  if (item.appliedCount >= item.months) return res.status(400).json({ error: 'Pago completado' });

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (item.lastApplied === yearMonth) return res.status(400).json({ error: 'Ya aplicado este mes' });

  const newCount = item.appliedCount + 1;
  const txId = `fi_${Date.now()}`;
  const done = newCount >= item.months;
  const txDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  await db.withTx(async (client) => {
    await client.query(`UPDATE accounts SET balance = ROUND(balance - $1, 2) WHERE id=$2 AND "userId"=$3`,
      [item.monthlyAmount, item.accountId, req.user.id]);
    await client.query(
      `INSERT INTO transactions (id,"userId","accountId",type,amount,description,category,date,notes,"transferGroup")
       VALUES ($1,$2,$3,'expense',$4,$5,'financiado',$6,$7,'')`,
      [txId, req.user.id, item.accountId, item.monthlyAmount,
       `${item.name} (${newCount}/${item.months})`, txDate,
       `Cargo ${newCount} de ${item.months}`]
    );
    await client.query(
      `UPDATE financed_items SET "appliedCount"=$1,"lastApplied"=$2,active=$3 WHERE id=$4 AND "userId"=$5`,
      [newCount, yearMonth, done ? 0 : 1, req.params.id, req.user.id]
    );
  });

  res.json({ ok: true, appliedCount: newCount, completed: done });
});

module.exports = router;
