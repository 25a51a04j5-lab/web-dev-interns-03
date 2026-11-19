
const express = require('express');
const candidateController = require('../controllers/candidateController');
const authenticate = require('../middleware/authenticate');
const { requireRole } = require('../middleware/requireRole');
const { ROLES } = require('../config/permissions');

const router = express.Router();

// All candidate profile routes require candidate authentication.
router.use(authenticate, requireRole(ROLES.CANDIDATE));

// Get the logged-in candidate's profile.
router.get('/me', candidateController.getMyProfile);

// Update the logged-in candidate's profile.
router.patch('/me', candidateController.updateMyProfile);

module.exports = router;
