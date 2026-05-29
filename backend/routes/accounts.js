const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const { validate } = require('../helpers');

const router = express.Router();
const VALID_ACCOUNT_TYPES = ['checking', 'savings', 'cash', 'investment', 'other'];

router.get('/', auth, async (req, res) => {
  res.json(await db.query(`SELECT * FROM accounts WHERE "userId" = $1 AND archived = 0`, [req.user.id]));
});

router.get('/archived', auth, async (req, res) => {
  res.json(await db.query(`SELECT * FROM accounts WHERE "userId" = $1 AND archived = 1`, [req.user.id]));
});

router.post('/', auth, async (req, res) => {
  const { id, name, type, balance, color } = req.body;
  const err = validate({
    id:   { required: true, type: 'string' },
    name: { required: true, type: 'string', maxLen: 50 },
    type: { required: true, enum: VALID_ACCOUNT_TYPES },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  if (balance !== undefined && (typeof balance !== 'number' || isNaN(balance)))
    return res.status(400).json({ error: '"balance" debe ser un número' });

  await db.execute(
    `INSERT INTO accounts (id, "userId", name, type, balance, color) VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, req.user.id, name, type, balance ?? 0, color ?? '']
  );
  res.json({ ok: true });
});

router.put('/:id', auth, async (req, res) => {
  const err = validate({
    name: { required: true, type: 'string', maxLen: 50 },
    type: { required: true, enum: VALID_ACCOUNT_TYPES },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  const { name, type, color } = req.body;
  await db.execute(
    `UPDATE accounts SET name=$1, type=$2, color=$3 WHERE id=$4 AND "userId"=$5`,
    [name, type, color ?? '', req.params.id, req.user.id]
  );
  res.json({ ok: true });
});

router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  await db.execute(`UPDATE accounts SET archived=1 WHERE id=$1 AND "userId"=$2`, [id, req.user.id]);
  await db.execute(`UPDATE recurring_items SET active=0 WHERE "accountId"=$1 AND "userId"=$2`, [id, req.user.id]);
  await db.execute(`UPDATE savings_transfers SET active=0 WHERE ("fromAccountId"=$1 OR "toAccountId"=$2) AND "userId"=$3`, [id, id, req.user.id]);
  await db.execute(`UPDATE financed_items SET active=0 WHERE "accountId"=$1 AND "userId"=$2`, [id, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
