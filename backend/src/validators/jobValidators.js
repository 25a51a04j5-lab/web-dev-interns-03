const AppError = require('../utils/AppError');

const STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'];

function requiredString(body, field, details, maxLength) {
  if (typeof body[field] !== 'string' || !body[field].trim()) {
    details.push({ field, message: `${field} is required` });
    return;
  }
  if (body[field].trim().length > maxLength) {
    details.push({ field, message: `${field} must be ${maxLength} characters or fewer` });
  }
}

function validateJobCreate(body = {}) {
  const details = [];
  requiredString(body, 'title', details, 180);
  requiredString(body, 'description', details, 10000);
  requiredString(body, 'requirements', details, 10000);
  if (body.location !== undefined && typeof body.location !== 'string') {
    details.push({ field: 'location', message: 'location must be a string' });
  }
  if (body.employmentType !== undefined && typeof body.employmentType !== 'string') {
    details.push({ field: 'employmentType', message: 'employmentType must be a string' });
  }
  if (body.closesAt !== undefined && Number.isNaN(Date.parse(body.closesAt))) {
    details.push({ field: 'closesAt', message: 'closesAt must be a valid date' });
  }
  if (details.length) throw AppError.badRequest('Validation failed', details);
  return {
    title: body.title.trim(),
    description: body.description.trim(),
    requirements: body.requirements.trim(),
    location: body.location?.trim() || null,
    employmentType: body.employmentType?.trim() || null,
    closesAt: body.closesAt || null,
  };
}

function validateJobUpdate(body = {}) {
  const allowed = ['title', 'description', 'requirements', 'location', 'employmentType', 'closesAt'];
  const unknown = Object.keys(body).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    throw AppError.badRequest('Validation failed', unknown.map((field) => ({
      field,
      message: 'Field cannot be updated',
    })));
  }
  const details = [];
  for (const field of ['title', 'description', 'requirements']) {
    if (body[field] !== undefined) requiredString(body, field, details, 10000);
  }
  for (const field of ['location', 'employmentType']) {
    if (body[field] !== undefined && typeof body[field] !== 'string') {
      details.push({ field, message: `${field} must be a string` });
    }
  }
  if (body.closesAt !== undefined && body.closesAt !== null && Number.isNaN(Date.parse(body.closesAt))) {
    details.push({ field: 'closesAt', message: 'closesAt must be a valid date' });
  }
  if (!Object.keys(body).length) {
    details.push({ field: 'body', message: 'At least one field is required' });
  }
  if (details.length) throw AppError.badRequest('Validation failed', details);
  return {
    ...body,
    title: body.title?.trim(),
    description: body.description?.trim(),
    requirements: body.requirements?.trim(),
    location: body.location?.trim(),
    employmentType: body.employmentType?.trim(),
  };
}

function validateJobId(value) {
  if (!/^\d+$/.test(String(value))) {
    throw AppError.badRequest('Validation failed', [{ field: 'id', message: 'id must be a number' }]);
  }
  return Number(value);
}

function validateStatus(status) {
  if (!STATUSES.includes(status)) {
    throw AppError.badRequest('Validation failed', [{ field: 'status', message: 'Invalid job status' }]);
  }
  return status;
}

module.exports = { validateJobCreate, validateJobId, validateJobUpdate, validateStatus };
