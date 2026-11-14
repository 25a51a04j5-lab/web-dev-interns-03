const AppError = require('../utils/AppError');

const STAGES = ['APPLIED', 'SCREENING', 'INTERVIEW', 'SELECTED', 'OFFERED', 'REJECTED', 'WITHDRAWN'];

function validateId(value, field = 'id') {
  if (!/^\d+$/.test(String(value))) {
    throw AppError.badRequest('Validation failed', [{ field, message: `${field} must be a number` }]);
  }
  return Number(value);
}

function validateApplication(body = {}) {
  if (body.coverLetter !== undefined && typeof body.coverLetter !== 'string') {
    throw AppError.badRequest('Validation failed', [
      { field: 'coverLetter', message: 'coverLetter must be a string' },
    ]);
  }
  if (body.coverLetter && body.coverLetter.length > 10000) {
    throw AppError.badRequest('Validation failed', [
      { field: 'coverLetter', message: 'coverLetter must be 10000 characters or fewer' },
    ]);
  }
  return { coverLetter: body.coverLetter?.trim() || null };
}

function validateStage(body = {}) {
  if (!STAGES.includes(body.stage)) {
    throw AppError.badRequest('Validation failed', [
      { field: 'stage', message: 'Invalid application stage' },
    ]);
  }
  return body.stage;
}

module.exports = { STAGES, validateApplication, validateId, validateStage };
