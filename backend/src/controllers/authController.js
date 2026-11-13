const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');
const {
  validateRegister,
  validateLogin,
  validateStaffCreate,
} = require('../validators/authValidators');

// Small wrapper so thrown/rejected errors reach the central error handler.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const register = wrap(async (req, res) => {
  const data = validateRegister(req.body);
  const result = await authService.registerCandidate(data);
  res.status(201).json(result);
});

const login = wrap(async (req, res) => {
  const data = validateLogin(req.body);
  const result = await authService.login(data);
  res.json(result);
});

const me = wrap(async (req, res) => {
  res.json({ user: req.user });
});

const createStaff = wrap(async (req, res) => {
  const data = validateStaffCreate(req.body);
  const result = await authService.createStaff(data);
  res.status(201).json(result);
});

const listUsers = wrap(async (req, res) => {
  const users = await userRepository.list();
  res.json({ users: users.map(authService.toPublicUser) });
});

module.exports = { register, login, me, createStaff, listUsers };
