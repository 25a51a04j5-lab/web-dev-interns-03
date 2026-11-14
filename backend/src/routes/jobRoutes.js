const express = require('express');
const controller = require('../controllers/jobController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/requireRole');

const router = express.Router();

router.get('/', controller.list);
router.get('/:id', controller.get);
router.post('/', authenticate, requirePermission('job:manage'), controller.create);
router.patch('/:id', authenticate, requirePermission('job:manage'), controller.update);
router.post('/:id/status', authenticate, requirePermission('job:manage'), controller.changeStatus);

module.exports = router;
