const AppError = require('../utils/AppError');
const { ROLES, can } = require('../config/permissions');

// Use AFTER authenticate. Usage: router.get('/x', authenticate, requireRole('ADMIN', 'HR'), handler)
function requireRole(...roles) {
  const valid = Object.values(ROLES);
  roles.forEach((r) => {
    if (!valid.includes(r)) throw new Error(`requireRole: unknown role "${r}"`);
  });

  return (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
}

// Action-based variant that reads from the permission matrix.
// Usage: router.post('/jobs', authenticate, requirePermission('job:manage'), handler)
function requirePermission(action) {
  return (req, res, next) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!can(req.user.role, action)) return next(AppError.forbidden());
    next();
  };
}

module.exports = { requireRole, requirePermission };
