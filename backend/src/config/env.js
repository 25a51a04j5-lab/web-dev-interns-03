require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-me')) {
  throw new Error('JWT_SECRET must be set to a strong value in production');
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  databaseHost: process.env.DATABASE_HOST || 'localhost',
  databasePort: Number(process.env.DATABASE_PORT) || 3306,
  databaseName: process.env.DATABASE_NAME || '',
  databaseUser: process.env.DATABASE_USER || '',
  databasePassword: process.env.DATABASE_PASSWORD || '',
  // The fallback is for local dev/tests only; production refuses to start without a real secret.
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
};
