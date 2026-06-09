const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { validate } = require('../helpers');
const { audit } = require('../middleware/audit');
const { notifyUser } = require('../sse');

const router = express.Router();
const VALID_TX_TYPES = ['income', 'expense', 'transfer-in', 'transfer-out', 'transfer'];

router.get('/', auth, async (req, res) => {
  res.json(await db.query(
    `SELECT * FROM transactions WHERE "userId"=$1 AND "deletedAt" IS NULL ORDER BY date DESC`,
    [req.user.id]
  ));
});

router.post('/', auth, async (req, res) => {
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
    await db.execute(
      `UPDATE accounts SET balance = ROUND(balance + $1, 2) WHERE id=$2 AND "userId"=$3`,
      [delta, accountId, req.user.id]
    );
  }
  const splitsJson = splits ? JSON.stringify(splits) : null;
  await db.execute(
    `INSERT INTO transactions (id,"userId","accountId",type,amount,description,category,date,notes,"transferGroup",tags,splits)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [id, req.user.id, accountId, type, amount, description ?? '', category ?? '', date,
     notes ?? '', transferGroup ?? '', tags ?? '', splitsJson]
  );
  await audit(req.user.id, 'transaction', id, 'create', { type, amount, category });
  notifyUser(req.user.id);
  res.json({ ok: true });
});

router.put('/:id', auth, async (req, res) => {
  const old = await db.queryOne(
    `SELECT * FROM transactions WHERE id=$1 AND "userId"=$2`,
    [req.params.id, req.user.id]
  );
  if (!old) return res.status(404).json({ error: 'Transacción no encontrada' });

  const validationErr = validate({
    accountId: { required: true, type: 'string' },
    type:      { required: true, enum: VALID_TX_TYPES },
    amount:    { required: true, type: 'number', min: 0 },
  }, req.body);
  if (validationErr) return res.status(400).json({ error: validationErr });

  const { accountId, type, amount, description, category, date, notes, tags, splits } = req.body;

  if (old.type === 'income') {
    await db.execute(`UPDATE accounts SET balance = ROUND(balance - $1, 2) WHERE id=$2 AND "userId"=$3`,
      [old.amount, old.accountId, req.user.id]);
  } else if (old.type === 'expense') {
    await db.execute(`UPDATE accounts SET balance = ROUND(balance + $1, 2) WHERE id=$2 AND "userId"=$3`,
      [old.amount, old.accountId, req.user.id]);
  }

  if (type === 'income') {
    await db.execute(`UPDATE accounts SET balance = ROUND(balance + $1, 2) WHERE id=$2 AND "userId"=$3`,
      [amount, accountId, req.user.id]);
  } else if (type === 'expense') {
    await db.execute(`UPDATE accounts SET balance = ROUND(balance - $1, 2) WHERE id=$2 AND "userId"=$3`,
      [amount, accountId, req.user.id]);
  }

  const splitsJson = splits !== undefined ? (splits ? JSON.stringify(splits) : null) : old.splits;
  await db.execute(
    `UPDATE transactions SET "accountId"=$1,type=$2,amount=$3,description=$4,category=$5,date=$6,notes=$7,tags=$8,splits=$9
     WHERE id=$10 AND "userId"=$11`,
    [accountId, type, amount, description ?? '', category ?? '', date, notes ?? '', tags ?? '', splitsJson,
     req.params.id, req.user.id]
  );
  await audit(req.user.id, 'transaction', req.params.id, 'update', { type, amount, category });
  res.json({ ok: true });
});

router.delete('/:id', auth, async (req, res) => {
  const tx = await db.queryOne(
    `SELECT * FROM transactions WHERE id=$1 AND "userId"=$2`,
    [req.params.id, req.user.id]
  );
  if (tx) {
    if (tx.type === 'income' || tx.type === 'transfer-in') {
      await db.execute(`UPDATE accounts SET balance = ROUND(balance - $1, 2) WHERE id=$2 AND "userId"=$3`,
        [tx.amount, tx.accountId, req.user.id]);
    } else if (tx.type === 'expense' || tx.type === 'transfer-out') {
      await db.execute(`UPDATE accounts SET balance = ROUND(balance + $1, 2) WHERE id=$2 AND "userId"=$3`,
        [tx.amount, tx.accountId, req.user.id]);
    }
    if (tx.transferGroup) {
      const paired = await db.queryOne(
        `SELECT * FROM transactions WHERE "transferGroup"=$1 AND id!=$2 AND "userId"=$3 AND "deletedAt" IS NULL`,
        [tx.transferGroup, req.params.id, req.user.id]
      );
      if (paired) {
        if (paired.type === 'income' || paired.type === 'transfer-in') {
          await db.execute(`UPDATE accounts SET balance = ROUND(balance - $1, 2) WHERE id=$2 AND "userId"=$3`,
            [paired.amount, paired.accountId, req.user.id]);
        } else if (paired.type === 'expense' || paired.type === 'transfer-out') {
          await db.execute(`UPDATE accounts SET balance = ROUND(balance + $1, 2) WHERE id=$2 AND "userId"=$3`,
            [paired.amount, paired.accountId, req.user.id]);
        }
        await db.execute(`UPDATE transactions SET "deletedAt" = NOW()::text WHERE id=$1 AND "userId"=$2`,
          [paired.id, req.user.id]);
      }
    }
    await db.execute(`UPDATE transactions SET "deletedAt" = NOW()::text WHERE id=$1 AND "userId"=$2`,
      [req.params.id, req.user.id]);
    await audit(req.user.id, 'transaction', req.params.id, 'delete', null);
  }
  res.json({ ok: true });
});

router.post('/transfer', auth, async (req, res) => {
  const { fromAccountId, toAccountId, amount, description, date } = req.body;
  const group = `trf_${Date.now()}`;
  const idOut = `tx_out_${Date.now()}`;
  const idIn  = `tx_in_${Date.now() + 1}`;
  const desc = description || 'Transferencia';

  await db.execute(`UPDATE accounts SET balance = ROUND(balance - $1, 2) WHERE id=$2 AND "userId"=$3`,
    [amount, fromAccountId, req.user.id]);
  await db.execute(
    `INSERT INTO transactions (id,"userId","accountId",type,amount,description,category,date,notes,"transferGroup")
     VALUES ($1,$2,$3,'transfer-out',$4,$5,'transferencia',$6,'',$7)`,
    [idOut, req.user.id, fromAccountId, amount, desc, date, group]
  );

  await db.execute(`UPDATE accounts SET balance = ROUND(balance + $1, 2) WHERE id=$2 AND "userId"=$3`,
    [amount, toAccountId, req.user.id]);
  await db.execute(
    `INSERT INTO transactions (id,"userId","accountId",type,amount,description,category,date,notes,"transferGroup")
     VALUES ($1,$2,$3,'transfer-in',$4,$5,'transferencia',$6,'',$7)`,
    [idIn, req.user.id, toAccountId, amount, desc, date, group]
  );

  res.json({ ok: true, group });
});

module.exports = router;
