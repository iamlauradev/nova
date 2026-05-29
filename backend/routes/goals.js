const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { validate } = require('../helpers');
const { audit } = require('../middleware/audit');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  res.json(await db.query(`SELECT * FROM goals WHERE "userId"=$1 AND "deletedAt" IS NULL`, [req.user.id]));
});

router.post('/', auth, async (req, res) => {
  const { id, name, targetAmount, currentAmount, targetDate, accountId, icon } = req.body;
  const err = validate({
    id:           { required: true, type: 'string' },
    name:         { required: true, type: 'string', maxLen: 100 },
    targetAmount: { required: true, type: 'number', min: 0.01 },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  await db.execute(
    `INSERT INTO goals (id,"userId",name,"targetAmount","currentAmount","targetDate","accountId",icon)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, req.user.id, name, targetAmount, currentAmount ?? 0, targetDate ?? '', accountId ?? '', icon ?? '🎯']
  );
  await audit(req.user.id, 'goal', id, 'create', { name, targetAmount });
  res.json({ ok: true });
});

router.put('/:id', auth, async (req, res) => {
  const err = validate({
    name:         { required: true, type: 'string', maxLen: 100 },
    targetAmount: { required: true, type: 'number', min: 0.01 },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  const { name, targetAmount, currentAmount, targetDate, accountId, icon } = req.body;
  await db.execute(
    `UPDATE goals SET name=$1,"targetAmount"=$2,"currentAmount"=$3,"targetDate"=$4,"accountId"=$5,icon=$6
     WHERE id=$7 AND "userId"=$8`,
    [name, targetAmount, currentAmount ?? 0, targetDate ?? '', accountId ?? '', icon ?? '🎯',
     req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

router.delete('/:id', auth, async (req, res) => {
  await db.execute(`UPDATE goals SET "deletedAt" = NOW()::text WHERE id=$1 AND "userId"=$2`, [req.params.id, req.user.id]);
  await audit(req.user.id, 'goal', req.params.id, 'delete', null);
  res.json({ ok: true });
});

module.exports = router;
