const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { ROLES } = require('../config/permissions');
const userRepository = require('../repositories/userRepository');

// Used so login takes similar time whether or not the email exists (prevents user enumeration).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', env.bcryptRounds);

function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwtExpiresIn,
  });
}

async function createUser({ name, email, password, role, companyId = null }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) throw AppError.conflict('An account with this email already exists');
  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
  return userRepository.create({ name, email, passwordHash, role, companyId });
}

// Public sign-up: always a CANDIDATE.
async function registerCandidate({ name, email, password }) {
  const user = await createUser({ name, email, password, role: ROLES.CANDIDATE });
  return { user: toPublicUser(user), token: signToken(user) };
}

// Admin-only: create HR or Admin accounts.
async function createStaff({ name, email, password, role, companyId = null }) {
  const user = await createUser({ name, email, password, role, companyId });
  return { user: toPublicUser(user) };
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  // Same message for unknown email, wrong password and disabled account.
  if (!user || !ok || !user.isActive) throw AppError.unauthorized('Invalid email or password');

  return { user: toPublicUser(user), token: signToken(user) };
}

module.exports = { registerCandidate, createStaff, login, signToken, toPublicUser };
