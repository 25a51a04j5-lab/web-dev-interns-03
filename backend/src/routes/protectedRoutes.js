// Sample routes that prove role enforcement works. Teammates replace the handlers with real
// features later (keep the authenticate + requireRole lines).
const express = require('express');
const authenticate = require('../middleware/authenticate');
const { requireRole } = require('../middleware/requireRole');
const { ROLES } = require('../config/permissions');

const router = express.Router();

router.get('/admin/ping', authenticate, requireRole(ROLES.ADMIN), (req, res) => {
  res.json({ message: 'Admin area', user: req.user });
});

router.get('/hr/ping', authenticate, requireRole(ROLES.ADMIN, ROLES.HR), (req, res) => {
  res.json({ message: 'HR area', user: req.user });
});

router.get('/candidate/ping', authenticate, requireRole(ROLES.CANDIDATE), (req, res) => {
  res.json({ message: 'Candidate area', user: req.user });
});

module.exports = router;
