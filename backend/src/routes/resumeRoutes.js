const express = require('express');
const multer = require('multer');
const controller = require('../controllers/resumeController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/requireRole');
const storage = require('../config/storage');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: storage.maxResumeBytes },
});
const router = express.Router();

router.post(
  '/candidates/me/resume',
  authenticate,
  requirePermission('resume:upload-own'),
  upload.single('resume'),
  controller.upload,
);
router.get(
  '/candidates/me/resume',
  authenticate,
  requirePermission('resume:download-own'),
  controller.downloadOwn,
);
router.get(
  '/applications/:id/resume',
  authenticate,
  requirePermission('resume:download-any'),
  controller.downloadForApplication,
);

module.exports = router;
