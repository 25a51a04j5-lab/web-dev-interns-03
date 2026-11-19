const jobService = require('../services/jobService');
const jobRepository = require('../repositories/jobRepository');
const { ROLES } = require('../config/permissions');
const {
  validateJobCreate,
  validateJobId,
  validateJobUpdate,
  validateStatus,
} = require('../validators/jobValidators');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const list = wrap(async (req, res) => {
  const isStaff = req.user && [ROLES.ADMIN, ROLES.HR].includes(req.user.role);
  res.json({
    jobs: await jobRepository.list({
      includeUnpublished: Boolean(isStaff),
      companyId: isStaff ? req.user.companyId : undefined,
    }),
  });
});

const get = wrap(async (req, res) => {
  const id = validateJobId(req.params.id);
  const job = await jobService.getVisibleJob(id, req.user);
  res.json({ job });
});

const create = wrap(async (req, res) => {
  const job = await jobService.createJob(validateJobCreate(req.body), req.user);
  res.status(201).json({ job });
});

const update = wrap(async (req, res) => {
  const job = await jobService.updateJob(
    validateJobId(req.params.id),
    validateJobUpdate(req.body),
    req.user,
  );
  res.json({ job });
});

const changeStatus = wrap(async (req, res) => {
  const job = await jobService.changeStatus(
    validateJobId(req.params.id),
    validateStatus(req.body.status),
    req.user,
  );
  res.json({ job });
});

module.exports = { changeStatus, create, get, list, update };
