const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const items = await db.query(
    `SELECT * FROM recurring_items WHERE "userId"=$1 AND "deletedAt" IS NULL`,
    [req.user.id]
  );
  res.json(items.map(r => ({ ...r, active: r.active === 1 })));
});

router.post('/', auth, async (req, res) => {
  const { id, name, type, amount, category, accountId, frequency, dayOfMonth, notes, active, customMonths } = req.body;
  await db.execute(
    `INSERT INTO recurring_items (id,"userId",name,type,amount,category,"accountId",frequency,"dayOfMonth",notes,active,"customMonths")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [id, req.user.id, name, type, amount, category ?? '', accountId ?? '',
     frequency ?? 'monthly', dayOfMonth ?? '', notes ?? '', active !== false ? 1 : 0,
     customMonths ?? 0]
  );
  res.json({ ok: true });
});

router.put('/:id', auth, async (req, res) => {
  const { name, type, amount, category, accountId, frequency, dayOfMonth, notes, active, customMonths } = req.body;
  await db.execute(
    `UPDATE recurring_items
     SET name=$1,type=$2,amount=$3,category=$4,"accountId"=$5,frequency=$6,"dayOfMonth"=$7,notes=$8,active=$9,"customMonths"=$10
     WHERE id=$11 AND "userId"=$12`,
    [name, type, amount, category ?? '', accountId ?? '', frequency,
     dayOfMonth ?? '', notes ?? '', active ? 1 : 0, customMonths ?? 0,
     req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

router.post('/:id/apply', auth, async (req, res) => {
  const item = await db.queryOne(
    `SELECT * FROM recurring_items WHERE id=$1 AND "userId"=$2 AND "deletedAt" IS NULL`,
    [req.params.id, req.user.id]
  );
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (!item.accountId) return res.status(400).json({ error: 'No account associated' });

  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const txId = `tx_rec_${Date.now()}`;
  const delta = item.type === 'income' ? item.amount : -item.amount;

  await db.withTx(async (client) => {
    await client.query(
      `INSERT INTO transactions (id,"userId","accountId",type,amount,description,category,date,notes,"transferGroup")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'','')`,
      [txId, req.user.id, item.accountId, item.type, item.amount, item.name, item.category || '', now.toISOString()]
    );
    await client.query(
      `UPDATE accounts SET balance = balance + $1 WHERE id=$2 AND "userId"=$3`,
      [delta, item.accountId, req.user.id]
    );
    await client.query(
      `UPDATE recurring_items SET "lastApplied"=$1 WHERE id=$2 AND "userId"=$3`,
      [yearMonth, item.id, req.user.id]
    );
  });

  res.json({ ok: true, txId });
});

router.delete('/:id', auth, async (req, res) => {
  await db.execute(
    `UPDATE recurring_items SET "deletedAt" = NOW()::text WHERE id=$1 AND "userId"=$2`,
    [req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

module.exports = router;
