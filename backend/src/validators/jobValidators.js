const AppError = require('../utils/AppError');

const STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'];
const CREATE_FIELDS = [
  'title',
  'description',
  'requirements',
  'location',
  'employmentType',
  'closesAt',
];
const UPDATE_FIELDS = CREATE_FIELDS;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertPlainObject(body) {
  if (!isPlainObject(body)) {
    throw AppError.badRequest('Validation failed', [
      { field: 'body', message: 'Request body must be a JSON object' },
    ]);
  }
}

function rejectUnknownFields(body, allowedFields) {
  const unknown = Object.keys(body).filter((field) => !allowedFields.includes(field));
  if (unknown.length) {
    throw AppError.badRequest('Validation failed', unknown.map((field) => ({
      field,
      message: 'Field cannot be submitted',
    })));
  }
}

function requiredString(body, field, details, maxLength) {
  if (typeof body[field] !== 'string' || !body[field].trim()) {
    details.push({ field, message: `${field} is required` });
    return;
  }
  if (body[field].trim().length > maxLength) {
    details.push({ field, message: `${field} must be ${maxLength} characters or fewer` });
  }
}

function optionalString(body, field, details, maxLength) {
  if (body[field] === undefined) return;
  if (body[field] !== null && typeof body[field] !== 'string') {
    details.push({ field, message: `${field} must be a string or null` });
    return;
  }
  if (typeof body[field] === 'string' && body[field].trim().length > maxLength) {
    details.push({ field, message: `${field} must be ${maxLength} characters or fewer` });
  }
}

function validateDateField(body, field, details) {
  if (body[field] === undefined || body[field] === null) return;
  if (typeof body[field] !== 'string' || Number.isNaN(Date.parse(body[field]))) {
    details.push({ field, message: `${field} must be a valid date string or null` });
  }
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) return null;
  return value.trim() || null;
}

function validateJobCreate(body = {}) {
  assertPlainObject(body);
  rejectUnknownFields(body, CREATE_FIELDS);

  const details = [];
  requiredString(body, 'title', details, 180);
  requiredString(body, 'description', details, 10000);
  requiredString(body, 'requirements', details, 10000);
  optionalString(body, 'location', details, 160);
  optionalString(body, 'employmentType', details, 80);
  validateDateField(body, 'closesAt', details);

  if (details.length) throw AppError.badRequest('Validation failed', details);

  return {
    title: body.title.trim(),
    description: body.description.trim(),
    requirements: body.requirements.trim(),
    location: normalizeOptionalString(body.location),
    employmentType: normalizeOptionalString(body.employmentType),
    closesAt: body.closesAt ?? null,
  };
}

function validateJobUpdate(body = {}) {
  assertPlainObject(body);
  rejectUnknownFields(body, UPDATE_FIELDS);

  const details = [];
  if (!Object.keys(body).length) {
    details.push({ field: 'body', message: 'At least one field is required' });
  }

  for (const field of ['title', 'description', 'requirements']) {
    if (body[field] !== undefined) requiredString(body, field, details, field === 'title' ? 180 : 10000);
  }
  optionalString(body, 'location', details, 160);
  optionalString(body, 'employmentType', details, 80);
  validateDateField(body, 'closesAt', details);

  if (details.length) throw AppError.badRequest('Validation failed', details);

  const normalized = { ...body };
  for (const field of ['title', 'description', 'requirements']) {
    if (normalized[field] !== undefined) normalized[field] = normalized[field].trim();
  }
  if ('location' in normalized) normalized.location = normalizeOptionalString(normalized.location);
  if ('employmentType' in normalized) normalized.employmentType = normalizeOptionalString(normalized.employmentType);
  if ('closesAt' in normalized && normalized.closesAt === undefined) normalized.closesAt = null;

  return normalized;
}

function validateJobId(value) {
  if (!/^\d+$/.test(String(value))) {
    throw AppError.badRequest('Validation failed', [{ field: 'id', message: 'id must be a positive integer' }]);
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw AppError.badRequest('Validation failed', [{ field: 'id', message: 'id must be a positive integer' }]);
  }
  return id;
}

function validateStatus(status) {
  if (typeof status !== 'string' || !STATUSES.includes(status)) {
    throw AppError.badRequest('Validation failed', [{ field: 'status', message: 'Invalid job status' }]);
  }
  return status;
}

module.exports = { validateJobCreate, validateJobId, validateJobUpdate, validateStatus };
