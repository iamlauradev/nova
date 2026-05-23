const db = require('../db');

const auditLog = db.prepare(
  'INSERT INTO audit_log (userId, entity, entityId, action, payload) VALUES (?, ?, ?, ?, ?)'
);

function audit(userId, entity, entityId, action, payload) {
  try {
    auditLog.run(userId, entity, String(entityId), action, payload ? JSON.stringify(payload) : null);
  } catch (_) {}
}

module.exports = { audit };
