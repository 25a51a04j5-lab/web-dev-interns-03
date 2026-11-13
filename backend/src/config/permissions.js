// Single source of truth for roles and permissions.
// Mirrors docs/permission-matrix.md - update both together.

const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  HR: 'HR',
  CANDIDATE: 'CANDIDATE',
});

const { ADMIN, HR, CANDIDATE } = ROLES;

// action -> roles allowed. "Own records only" checks happen in the service layer.
const PERMISSIONS = Object.freeze({
  // Users
  'user:create-staff': [ADMIN],
  'user:list': [ADMIN],
  'user:update-role': [ADMIN],

  // Company
  'company:configure': [ADMIN],

  // Jobs
  'job:view-unpublished': [ADMIN, HR],
  'job:manage': [ADMIN, HR],

  // Applications
  'application:submit': [CANDIDATE],
  'application:view-own': [CANDIDATE],
  'application:view-all': [ADMIN, HR],
  'application:change-stage': [ADMIN, HR],
  'application:view-history': [ADMIN, HR],

  // Resumes
  'resume:upload-own': [CANDIDATE],
  'resume:download-own': [CANDIDATE],
  'resume:download-any': [ADMIN, HR],

  // Interviews
  'interview:manage': [ADMIN, HR],
  'interview:view-all': [ADMIN, HR],
  'interview:view-own': [CANDIDATE],
  'interview:feedback': [ADMIN, HR],

  // Offers
  'offer:issue': [ADMIN, HR],
  'offer:view-own': [CANDIDATE],
  'offer:respond-own': [CANDIDATE],
  'onboarding:manage': [ADMIN, HR],

  // Analytics / system
  'analytics:view': [ADMIN, HR],
  'system:activity-log': [ADMIN],
});

function can(role, action) {
  const allowed = PERMISSIONS[action];
  return Array.isArray(allowed) && allowed.includes(role);
}

module.exports = { ROLES, PERMISSIONS, can };
