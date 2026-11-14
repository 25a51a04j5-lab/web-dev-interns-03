const AppError = require('../utils/AppError');
const applicationRepository = require('../repositories/applicationRepository');
const jobRepository = require('../repositories/jobRepository');

const transitions = {
  APPLIED: ['SCREENING', 'REJECTED', 'WITHDRAWN'],
  SCREENING: ['INTERVIEW', 'REJECTED', 'WITHDRAWN'],
  INTERVIEW: ['SELECTED', 'REJECTED', 'WITHDRAWN'],
  SELECTED: ['OFFERED', 'REJECTED', 'WITHDRAWN'],
  OFFERED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

async function submit(jobId, candidateId, data) {
  const job = await jobRepository.findById(jobId);
  if (!job || job.status !== 'PUBLISHED') throw AppError.notFound('Published job not found');
  const existing = await applicationRepository.findByJobAndCandidate(jobId, candidateId);
  if (existing) throw AppError.conflict('You have already applied to this job');
  return applicationRepository.create({ jobId, candidateId, ...data });
}

async function getVisible(id, user) {
  const application = await applicationRepository.findById(id);
  if (!application) throw AppError.notFound('Application not found');
  const staff = user.role === 'ADMIN' || user.role === 'HR';
  if (!staff && application.candidateId !== user.id) throw AppError.notFound('Application not found');
  return application;
}

async function changeStage(id, stage, changedBy) {
  const application = await applicationRepository.findById(id);
  if (!application) throw AppError.notFound('Application not found');
  if (!transitions[application.stage].includes(stage)) {
    throw new AppError(
      422,
      'INVALID_TRANSITION',
      `Cannot move application from ${application.stage} to ${stage}`,
    );
  }
  const updated = await applicationRepository.updateStage(id, stage);
  await applicationRepository.addHistory(
    id,
    changedBy,
    application.stage,
    stage,
    `Application moved from ${application.stage} to ${stage}.`,
  );
  return updated;
}

async function getHistory(id, user) {
  await getVisible(id, user);
  return applicationRepository.getHistory(id);
}

module.exports = { changeStage, getHistory, getVisible, submit };
