const resumeService = require('../services/resumeService');
const { validateId } = require('../validators/applicationValidators');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function sendResume(res, resume, contents) {
  res.type(resume.mimeType);
  res.set('Content-Disposition', `attachment; filename="${resume.originalFilename.replace(/["\r\n]/g, '')}"`);
  res.send(contents);
}

const upload = wrap(async (req, res) => {
  const resume = await resumeService.upload(req.file, req.user.id);
  res.status(201).json({ resume });
});

const downloadOwn = wrap(async (req, res) => {
  const resume = await resumeService.getOwn(req.user.id);
  sendResume(res, resume, await resumeService.readFile(resume));
});

const downloadForApplication = wrap(async (req, res) => {
  const resume = await resumeService.getForApplication(validateId(req.params.id));
  sendResume(res, resume, await resumeService.readFile(resume));
});

module.exports = { downloadForApplication, downloadOwn, upload };
