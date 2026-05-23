const logger = require('./logger');

if (!process.env.JWT_SECRET) {
  logger.fatal('JWT_SECRET no está definido. Establece la variable de entorno antes de arrancar.');
  process.exit(1);
}

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET,
  ACCESS_TOKEN_EXPIRY: '1h',
  REFRESH_TOKEN_EXPIRY: '30d',
  REFRESH_TOKEN_MS: 30 * 24 * 60 * 60 * 1000,
  PORT: parseInt(process.env.PORT, 10) || 3000,
};
