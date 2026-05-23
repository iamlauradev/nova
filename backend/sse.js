const sseClients = new Map(); // userId → Set<res>

function notifyUser(userId) {
  const clients = sseClients.get(userId);
  if (!clients || clients.size === 0) return;
  for (const res of clients) {
    try { res.write('data: {"type":"refresh"}\n\n'); } catch (_) {}
  }
}

module.exports = { sseClients, notifyUser };
