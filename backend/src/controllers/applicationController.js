const applicationRepository = require('../repositories/applicationRepository');
const applicationService = require('../services/applicationService');
const {
  validateApplication,
  validateId,
  validateStage,
} = require('../validators/applicationValidators');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const submit = wrap(async (req, res) => {
  const application = await applicationService.submit(
    validateId(req.params.jobId, 'jobId'),
    req.user.id,
    validateApplication(req.body),
  );
  res.status(201).json({ application });
});

const list = wrap(async (req, res) => {
  res.json({ applications: await applicationRepository.list() });
});

const get = wrap(async (req, res) => {
  const application = await applicationService.getVisible(validateId(req.params.id), req.user);
  res.json({ application });
});

const changeStage = wrap(async (req, res) => {
  const application = await applicationService.changeStage(
    validateId(req.params.id),
    validateStage(req.body),
    req.user.id,
  );
  res.json({ application });
});

const history = wrap(async (req, res) => {
  const entries = await applicationService.getHistory(validateId(req.params.id), req.user);
  res.json({ history: entries });
});

module.exports = { changeStage, get, history, list, submit };
