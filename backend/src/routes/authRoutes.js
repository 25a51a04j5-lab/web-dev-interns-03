const express = require('express');
const controller = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/requireRole');

const router = express.Router();

// Public
router.post('/register', controller.register);
router.post('/login', controller.login);

// Any logged-in user
router.get('/me', authenticate, controller.me);

// Admin only: create HR / Admin accounts and list users
router.post('/users', authenticate, requirePermission('user:create-staff'), controller.createStaff);
router.get('/users', authenticate, requirePermission('user:list'), controller.listUsers);

module.exports = router;
