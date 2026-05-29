const db = require('../db');

async function audit(userId, entity, entityId, action, payload) {
  try {
    await db.execute(
      `INSERT INTO audit_log ("userId", entity, "entityId", action, payload) VALUES ($1, $2, $3, $4, $5)`,
      [userId, entity, String(entityId), action, payload ? JSON.stringify(payload) : null]
    );
  } catch (_) {}
}

module.exports = { audit };
