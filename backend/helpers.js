const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db');
const { JWT_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY, REFRESH_TOKEN_MS } = require('./config');

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueTokens(userId, username) {
  const jti = crypto.randomBytes(16).toString('hex');
  const accessToken  = jwt.sign({ id: userId, username, jti }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign({ id: userId, username, type: 'refresh', jti }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  const tokenHash    = hashRefreshToken(refreshToken);
  const expiresAt    = new Date(Date.now() + REFRESH_TOKEN_MS).toISOString();
  await db.execute(
    `INSERT INTO refresh_tokens ("userId", "tokenHash", "expiresAt") VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
  return { accessToken, refreshToken };
}

function validate(rules, body) {
  for (const [field, checks] of Object.entries(rules)) {
    const val   = body[field];
    const empty = val === undefined || val === null || (typeof val === 'string' && !val.trim());
    if (checks.required && empty)
      return `El campo "${field}" es requerido`;
    if (empty) continue;
    if (checks.type === 'number' && (typeof val !== 'number' || isNaN(val)))
      return `"${field}" debe ser un número`;
    if (checks.type === 'string' && typeof val !== 'string')
      return `"${field}" debe ser texto`;
    if (checks.min !== undefined && typeof val === 'number' && val < checks.min)
      return `"${field}" debe ser mayor que ${checks.min}`;
    if (checks.maxLen && typeof val === 'string' && val.length > checks.maxLen)
      return `"${field}" excede ${checks.maxLen} caracteres`;
    if (checks.minLen && typeof val === 'string' && val.trim().length < checks.minLen)
      return `"${field}" debe tener al menos ${checks.minLen} caracteres`;
    if (checks.enum && !checks.enum.includes(val))
      return `"${field}" contiene un valor no permitido`;
  }
  return null;
}

module.exports = { hashRefreshToken, issueTokens, validate, bcrypt };
