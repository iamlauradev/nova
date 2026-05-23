const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth, authLimiter, refreshLimiter } = require('../middleware/auth');
const { hashRefreshToken, issueTokens, validate, bcrypt } = require('../helpers');
const { JWT_SECRET } = require('../config');

const router = express.Router();

router.post('/register', authLimiter, (req, res) => {
  const { username, name, password } = req.body;
  const err = validate({
    username: { required: true, type: 'string', minLen: 3, maxLen: 30 },
    name:     { required: true, type: 'string', minLen: 1, maxLen: 50 },
    password: { required: true, type: 'string', minLen: 8 },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  try {
    const passHash = bcrypt.hashSync(password, 10);
    const { lastInsertRowid: id } = db
      .prepare('INSERT INTO users (username, name, passHash) VALUES (?, ?, ?)')
      .run(username.toLowerCase().trim(), name.trim(), passHash);
    const { accessToken, refreshToken } = issueTokens(id, username.toLowerCase().trim());
    res.json({ token: accessToken, refreshToken, user: { id, username: username.toLowerCase().trim(), name: name.trim() } });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Ese usuario ya existe' });
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', authLimiter, (req, res) => {
  const err = validate({
    username: { required: true, type: 'string' },
    password: { required: true, type: 'string' },
  }, req.body);
  if (err) return res.status(400).json({ error: err });

  const user = db.prepare('SELECT * FROM users WHERE username = ?')
    .get(req.body.username.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(req.body.password, user.passHash))
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  const { accessToken, refreshToken } = issueTokens(user.id, user.username);
  res.json({ token: accessToken, refreshToken, user: { id: user.id, username: user.username, name: user.name } });
});

router.post('/refresh', refreshLimiter, (req, res) => {
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
  const stored = db.prepare(
    "SELECT * FROM refreshTokens WHERE tokenHash=? AND expiresAt > datetime('now')"
  ).get(tokenHash);

  if (!stored) return res.status(401).json({ error: 'Sesión inválida o expirada. Inicia sesión de nuevo.' });

  db.prepare('DELETE FROM refreshTokens WHERE tokenHash=?').run(tokenHash);
  const { accessToken, refreshToken: newRefreshToken } = issueTokens(payload.id, payload.username);
  res.json({ token: accessToken, refreshToken: newRefreshToken });
});

router.post('/logout', auth, (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const tokenHash = hashRefreshToken(refreshToken);
    db.prepare('DELETE FROM refreshTokens WHERE tokenHash=?').run(tokenHash);
  }
  res.json({ ok: true });
});

router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, name FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

router.put('/me', auth, (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
  db.prepare('UPDATE users SET name=? WHERE id=?').run(name.trim(), req.user.id);
  const user = db.prepare('SELECT id, username, name FROM users WHERE id=?').get(req.user.id);
  res.json(user);
});

router.put('/me/password', auth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Faltan campos' });
  if (typeof newPassword !== 'string' || newPassword.length < 8)
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.passHash))
    return res.status(401).json({ error: 'Contraseña actual incorrecta' });
  db.prepare('UPDATE users SET passHash=? WHERE id=?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ ok: true });
});

router.delete('/me', auth, (req, res) => {
  db.prepare('DELETE FROM users WHERE id=?').run(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
