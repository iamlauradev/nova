const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth, authLimiter, refreshLimiter } = require('../middleware/auth');
const { hashRefreshToken, issueTokens, validate, bcrypt } = require('../helpers');
const { JWT_SECRET } = require('../config');

const router = express.Router();

router.post('/register', authLimiter, async (req, res) => {
  const { username, name, password } = req.body;
  const err = validate({
    username: { required: true, type: 'string', minLen: 3, maxLen: 30 },
    name:     { required: true, type: 'string', minLen: 1, maxLen: 50 },
    password: { required: true, type: 'string', minLen: 8 },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  try {
    const passHash = bcrypt.hashSync(password, 10);
    const result = await db.execute(
      `INSERT INTO users (username, name, "passHash") VALUES ($1, $2, $3) RETURNING id`,
      [username.toLowerCase().trim(), name.trim(), passHash]
    );
    const id = result.rows[0].id;
    const { accessToken, refreshToken } = await issueTokens(id, username.toLowerCase().trim());
    res.json({ token: accessToken, refreshToken, user: { id, username: username.toLowerCase().trim(), name: name.trim() } });
  } catch (e) {
    if (e.message.includes('unique') || e.message.includes('duplicate')) return res.status(409).json({ error: 'Ese usuario ya existe' });
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const err = validate({
    username: { required: true, type: 'string' },
    password: { required: true, type: 'string' },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  const user = await db.queryOne(
    `SELECT * FROM users WHERE username = $1`,
    [req.body.username.toLowerCase().trim()]
  );
  if (!user || !bcrypt.compareSync(req.body.password, user.passHash))
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  const { accessToken, refreshToken } = await issueTokens(user.id, user.username);
  res.json({ token: accessToken, refreshToken, user: { id: user.id, username: user.username, name: user.name } });
});

router.post('/refresh', refreshLimiter, async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token requerido' });

  let payload;
  try {
    payload = jwt.verify(refreshToken, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  if (payload.type !== 'refresh') return res.status(401).json({ error: 'Token inválido' });

  const tokenHash = hashRefreshToken(refreshToken);
  const stored = await db.queryOne(
    `SELECT * FROM refresh_tokens WHERE "tokenHash"=$1 AND "expiresAt" > NOW()::text`,
    [tokenHash]
  );

  if (!stored) return res.status(401).json({ error: 'Sesión inválida o expirada. Inicia sesión de nuevo.' });

  await db.execute(`DELETE FROM refresh_tokens WHERE "tokenHash"=$1`, [tokenHash]);
  const { accessToken, refreshToken: newRefreshToken } = await issueTokens(payload.id, payload.username);
  res.json({ token: accessToken, refreshToken: newRefreshToken });
});

router.post('/logout', auth, async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const tokenHash = hashRefreshToken(refreshToken);
    await db.execute(`DELETE FROM refresh_tokens WHERE "tokenHash"=$1`, [tokenHash]);
  }
  res.json({ ok: true });
});

router.get('/me', auth, async (req, res) => {
  const user = await db.queryOne(`SELECT id, username, name FROM users WHERE id = $1`, [req.user.id]);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

router.put('/me', auth, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  await db.execute(`UPDATE users SET name=$1 WHERE id=$2`, [name.trim(), req.user.id]);
  const user = await db.queryOne(`SELECT id, username, name FROM users WHERE id=$1`, [req.user.id]);
  res.json(user);
});

router.put('/me/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Faltan campos' });
  if (typeof newPassword !== 'string' || newPassword.length < 8)
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });

  const user = await db.queryOne(`SELECT * FROM users WHERE id=$1`, [req.user.id]);
  if (!bcrypt.compareSync(currentPassword, user.passHash))
    return res.status(401).json({ error: 'Contraseña actual incorrecta' });
  await db.execute(`UPDATE users SET "passHash"=$1 WHERE id=$2`, [bcrypt.hashSync(newPassword, 10), req.user.id]);
  res.json({ ok: true });
});

router.delete('/me', auth, async (req, res) => {
  await db.execute(`DELETE FROM users WHERE id=$1`, [req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
