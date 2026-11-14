const AppError = require('../utils/AppError');
const jobRepository = require('../repositories/jobRepository');

const transitions = {
  DRAFT: ['PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['CLOSED', 'ARCHIVED'],
  CLOSED: ['ARCHIVED'],
  ARCHIVED: [],
};

async function getVisibleJob(id, canViewUnpublished) {
  const job = await jobRepository.findById(id);
  if (!job || (!canViewUnpublished && job.status !== 'PUBLISHED')) {
    throw AppError.notFound('Job not found');
  }
  return job;
}

async function createJob(data, user) {
  return jobRepository.create({ ...data, companyId: user.companyId || 1, createdBy: user.id });
}

async function updateJob(id, data) {
  const job = await jobRepository.findById(id);
  if (!job) throw AppError.notFound('Job not found');
  if (job.status !== 'DRAFT') throw AppError.conflict('Only draft jobs can be edited');
  return jobRepository.update(id, data);
}

async function changeStatus(id, status) {
  const job = await jobRepository.findById(id);
  if (!job) throw AppError.notFound('Job not found');
  if (!transitions[job.status].includes(status)) {
    throw new AppError(422, 'INVALID_TRANSITION', `Cannot move job from ${job.status} to ${status}`);
  }
  return jobRepository.setStatus(id, status);
}

module.exports = { changeStatus, createJob, getVisibleJob, updateJob };
