const AppError = require('../utils/AppError');
const jobRepository = require('../repositories/jobRepository');

const transitions = {
  DRAFT: ['PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['CLOSED', 'ARCHIVED'],
  CLOSED: ['ARCHIVED'],
  ARCHIVED: [],
};

const { can } = require('../config/permissions');

function requireCompanyScope(user) {
  if (!user || !can(user.role, 'job:manage')) {
    throw AppError.forbidden();
  }
  if (!Number.isInteger(user.companyId) || user.companyId <= 0) {
    throw AppError.forbidden('Staff accounts must belong to a company');
  }
  return user.companyId;
}

async function getVisibleJob(id, user) {
  const isStaff = user && can(user.role, 'job:view-unpublished');
  const job = await jobRepository.findById(id);
  if (!job) throw AppError.notFound('Job not found');
  if (job.status === 'PUBLISHED') return job;
  if (!isStaff) throw AppError.notFound('Job not found');

  if (!Number.isInteger(user.companyId) || user.companyId <= 0) {
    throw AppError.notFound('Job not found');
  }
  if (job.companyId !== user.companyId) throw AppError.notFound('Job not found');
  return job;
}

async function createJob(data, user) {
  const companyId = requireCompanyScope(user);
  return jobRepository.create({ ...data, companyId, createdBy: user.id });
}

async function updateJob(id, data, user) {
  const companyId = requireCompanyScope(user);
  const job = await jobRepository.findById(id, { companyId });
  if (!job) throw AppError.notFound('Job not found');
  if (job.status === 'ARCHIVED') throw AppError.conflict('Archived jobs cannot be edited');
  if (!['DRAFT', 'PUBLISHED', 'CLOSED'].includes(job.status)) {
    throw AppError.conflict('Job status does not allow editing');
  }
  return jobRepository.update(id, data);
}

async function changeStatus(id, status, user) {
  const companyId = requireCompanyScope(user);
  const job = await jobRepository.findById(id, { companyId });
  if (!job) throw AppError.notFound('Job not found');
  if (job.status === 'ARCHIVED') {
    throw new AppError(422, 'INVALID_TRANSITION', 'Archived jobs are final and cannot be changed');
  }
  if (status === 'PUBLISHED' && job.status !== 'DRAFT') {
    throw new AppError(422, 'INVALID_TRANSITION', 'Only draft jobs can be published');
  }
  if (!transitions[job.status].includes(status)) {
    throw new AppError(422, 'INVALID_TRANSITION', `Cannot move job from ${job.status} to ${status}`);
  }
  return jobRepository.setStatus(id, status);
}

module.exports = { changeStatus, createJob, getVisibleJob, updateJob };
