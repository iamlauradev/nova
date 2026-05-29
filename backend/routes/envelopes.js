const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const { year, month } = req.query;
  res.json(await db.query(
    `SELECT * FROM envelopes WHERE "userId"=$1 AND year=$2 AND month=$3`,
    [req.user.id, year, month]
  ));
});

router.put('/', auth, async (req, res) => {
  const { year, month, categoryId, assigned } = req.body;
  const id = `env_${req.user.id}_${year}_${month}_${categoryId}`;
  await db.execute(
    `INSERT INTO envelopes (id,"userId",year,month,"categoryId",assigned)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT("userId",year,month,"categoryId") DO UPDATE SET assigned=EXCLUDED.assigned`,
    [id, req.user.id, year, month, categoryId, assigned ?? 0]
  );
  res.json({ ok: true });
});

router.delete('/:categoryId', auth, async (req, res) => {
  const { year, month } = req.query;
  await db.execute(
    `DELETE FROM envelopes WHERE "userId"=$1 AND year=$2 AND month=$3 AND "categoryId"=$4`,
    [req.user.id, year, month, req.params.categoryId]
  );
  res.json({ ok: true });
});

module.exports = router;
