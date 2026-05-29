const express = require('express');
const cors = require('cors');
const Sentry = require('@sentry/node');
const logger = require('./logger');
const db = require('./db');
const { PORT } = require('./config');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.2,
  });
}

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: ['https://nova.iamlaura.dev', 'http://localhost:8081'] }));
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    logger.info({ method: req.method, url: req.url, status: res.statusCode, ms });
  });
  next();
});

app.use('/auth',                  require('./routes/auth'));
app.use('/api/accounts',          require('./routes/accounts'));
app.use('/api/transactions',      require('./routes/transactions'));
app.use('/api/recurring',         require('./routes/recurring'));
app.use('/api/savings-transfers', require('./routes/savings'));
app.use('/api/financed-items',    require('./routes/financed'));
app.use('/api/budgets',           require('./routes/budgets'));
app.use('/api/goals',             require('./routes/goals'));
app.use('/api/debts',             require('./routes/debts'));
app.use('/api/loans',             require('./routes/loans'));
app.use('/api/envelopes',         require('./routes/envelopes'));
app.use('/api/events',            require('./routes/events'));

app.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use((err, req, res, next) => {
  logger.error({ err, method: req.method, url: req.url }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await db.initSchema();
  await db.cleanExpiredTokens();
  if (process.env.NODE_ENV !== 'test') {
    setInterval(() => db.cleanExpiredTokens(), 7 * 24 * 60 * 60 * 1000);
    app.listen(PORT, '0.0.0.0', () => {
      logger.info({ port: PORT }, 'Nova API arrancada');
    });
  }
}

if (process.env.NODE_ENV !== 'test') {
  start().catch(err => {
    logger.fatal({ err }, 'Error arrancando la API');
    process.exit(1);
  });
}

module.exports = { app, db };
