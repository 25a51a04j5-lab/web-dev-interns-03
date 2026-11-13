const AppError = require('../utils/AppError');
const { ROLES } = require('../config/permissions');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function validateEmail(value, errors) {
  const email = str(value).toLowerCase();
  if (!email) errors.push({ field: 'email', message: 'Email is required' });
  else if (email.length > 254 || !EMAIL_RE.test(email))
    errors.push({ field: 'email', message: 'Email format is invalid' });
  return email;
}

function validatePassword(value, errors) {
  const password = typeof value === 'string' ? value : '';
  if (!password) {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (
    password.length < 8 ||
    password.length > 72 || // bcrypt only uses the first 72 bytes
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password)
  ) {
    errors.push({
      field: 'password',
      message: 'Password must be 8-72 characters with an uppercase letter, a lowercase letter and a digit',
    });
  }
  return password;
}

function validateName(value, errors) {
  const name = str(value);
  if (name.length < 2 || name.length > 100)
    errors.push({ field: 'name', message: 'Name must be 2-100 characters' });
  return name;
}

function finish(errors, data) {
  if (errors.length) throw AppError.badRequest('Validation failed', errors);
  return data;
}

// Public registration: role is intentionally NOT read from the body.
function validateRegister(body = {}) {
  const errors = [];
  const data = {
    name: validateName(body.name, errors),
    email: validateEmail(body.email, errors),
    password: validatePassword(body.password, errors),
  };
  return finish(errors, data);
}

function validateLogin(body = {}) {
  const errors = [];
  const email = validateEmail(body.email, errors);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) errors.push({ field: 'password', message: 'Password is required' });
  return finish(errors, { email, password });
}

// Admin-only staff creation: role must be ADMIN or HR.
function validateStaffCreate(body = {}) {
  const errors = [];
  const data = {
    name: validateName(body.name, errors),
    email: validateEmail(body.email, errors),
    password: validatePassword(body.password, errors),
    role: body.role,
  };
  if (![ROLES.ADMIN, ROLES.HR].includes(data.role))
    errors.push({ field: 'role', message: 'Role must be ADMIN or HR' });
  return finish(errors, data);
}

module.exports = { validateRegister, validateLogin, validateStaffCreate };
