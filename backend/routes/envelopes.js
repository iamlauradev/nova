const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/envelopes?year=2026&month=4
router.get('/', auth, (req, res) => {
  const { year, month } = req.query;
  res.json(db.prepare('SELECT * FROM envelopes WHERE userId=? AND year=? AND month=?')
    .all(req.user.id, year, month));
});

// PUT /api/envelopes — upsert a single envelope
router.put('/', auth, (req, res) => {
  const { year, month, categoryId, assigned } = req.body;
  const id = `env_${req.user.id}_${year}_${month}_${categoryId}`;
  db.prepare(`
    INSERT INTO envelopes (id, userId, year, month, categoryId, assigned)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(userId, year, month, categoryId) DO UPDATE SET assigned=excluded.assigned
  `).run(id, req.user.id, year, month, categoryId, assigned ?? 0);
  res.json({ ok: true });
});

// DELETE /api/envelopes/:categoryId?year=X&month=X
router.delete('/:categoryId', auth, (req, res) => {
  const { year, month } = req.query;
  db.prepare('DELETE FROM envelopes WHERE userId=? AND year=? AND month=? AND categoryId=?')
    .run(req.user.id, year, month, req.params.categoryId);
  res.json({ ok: true });
});

module.exports = router;
