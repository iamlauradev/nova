const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const rows = await db.query(`SELECT * FROM savings_transfers WHERE "userId"=$1`, [req.user.id]);
  res.json(rows.map(r => ({ ...r, active: r.active === 1 })));
});

router.post('/', auth, async (req, res) => {
  const { id, name, fromAccountId, toAccountId, amount, dayOfMonth, active } = req.body;
  await db.execute(
    `INSERT INTO savings_transfers (id,"userId",name,"fromAccountId","toAccountId",amount,"dayOfMonth",active,"lastApplied")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'')`,
    [id, req.user.id, name, fromAccountId, toAccountId, amount, dayOfMonth ?? 1, active !== false ? 1 : 0]
  );
  res.json({ ok: true });
});

router.put('/:id', auth, async (req, res) => {
  const { name, fromAccountId, toAccountId, amount, dayOfMonth, active } = req.body;
  await db.execute(
    `UPDATE savings_transfers SET name=$1,"fromAccountId"=$2,"toAccountId"=$3,amount=$4,"dayOfMonth"=$5,active=$6
     WHERE id=$7 AND "userId"=$8`,
    [name, fromAccountId, toAccountId, amount, dayOfMonth, active ? 1 : 0, req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

router.delete('/:id', auth, async (req, res) => {
  await db.execute(`DELETE FROM savings_transfers WHERE id=$1 AND "userId"=$2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
});

router.post('/:id/apply', auth, async (req, res) => {
  const transfer = await db.queryOne(
    `SELECT * FROM savings_transfers WHERE id=$1 AND "userId"=$2`,
    [req.params.id, req.user.id]
  );
  if (!transfer) return res.status(404).json({ error: 'Transferencia no encontrada' });
  if (!transfer.active) return res.status(400).json({ error: 'Transferencia inactiva' });

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (transfer.lastApplied === yearMonth) return res.status(400).json({ error: 'Ya aplicada este mes' });

  const txDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const txIdOut = `stx_out_${Date.now()}`;
  const txIdIn  = `stx_in_${Date.now() + 1}`;

  await db.withTx(async (client) => {
    await client.query(`UPDATE accounts SET balance = ROUND(balance - $1, 2) WHERE id=$2 AND "userId"=$3`,
      [transfer.amount, transfer.fromAccountId, req.user.id]);
    await client.query(
      `INSERT INTO transactions (id,"userId","accountId",type,amount,description,category,date,notes,"transferGroup")
       VALUES ($1,$2,$3,'expense',$4,$5,'ahorro',$6,'','')`,
      [txIdOut, req.user.id, transfer.fromAccountId, transfer.amount, `Ahorro: ${transfer.name}`, txDate]
    );
    await client.query(`UPDATE accounts SET balance = ROUND(balance + $1, 2) WHERE id=$2 AND "userId"=$3`,
      [transfer.amount, transfer.toAccountId, req.user.id]);
    await client.query(
      `INSERT INTO transactions (id,"userId","accountId",type,amount,description,category,date,notes,"transferGroup")
       VALUES ($1,$2,$3,'income',$4,$5,'ahorro',$6,'','')`,
      [txIdIn, req.user.id, transfer.toAccountId, transfer.amount, `Ahorro: ${transfer.name}`, txDate]
    );
    await client.query(`UPDATE savings_transfers SET "lastApplied"=$1 WHERE id=$2 AND "userId"=$3`,
      [yearMonth, req.params.id, req.user.id]);
  });

  res.json({ ok: true, yearMonth });
});

module.exports = router;
