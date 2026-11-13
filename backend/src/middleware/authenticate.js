const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const userRepository = require('../repositories/userRepository');

// Verifies the Bearer token and attaches the current user to req.user.
// Missing / invalid / expired token -> 401.
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw AppError.unauthorized('Missing or malformed Authorization header');
    }

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
    } catch (err) {
      throw AppError.unauthorized(
        err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token'
      );
    }

    // Re-check the user so deactivated or demoted accounts lose access immediately.
    const user = await userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Account not found or disabled');
    }

    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;
