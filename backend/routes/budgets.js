const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  res.json(await db.query(`SELECT * FROM budgets WHERE "userId"=$1 AND "deletedAt" IS NULL`, [req.user.id]));
});

router.post('/', auth, async (req, res) => {
  const { id, categoryId, amount, period } = req.body;
  const existing = await db.queryOne(
    `SELECT id FROM budgets WHERE "userId"=$1 AND "categoryId"=$2 AND "deletedAt" IS NULL`,
    [req.user.id, categoryId]
  );
  if (existing) {
    await db.execute(`UPDATE budgets SET amount=$1, period=$2 WHERE id=$3 AND "userId"=$4`, [amount, period ?? 'monthly', existing.id, req.user.id]);
  } else {
    await db.execute(
      `INSERT INTO budgets (id,"userId","categoryId",amount,period) VALUES ($1,$2,$3,$4,$5)`,
      [id, req.user.id, categoryId, amount, period ?? 'monthly']
    );
  }
  res.json({ ok: true });
});

router.delete('/:id', auth, async (req, res) => {
  await db.execute(`UPDATE budgets SET "deletedAt" = NOW()::text WHERE id=$1 AND "userId"=$2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
