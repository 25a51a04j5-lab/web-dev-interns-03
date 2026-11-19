
const AppError = require('../utils/AppError');
const candidateRepository = require('../repositories/candidateRepository');

const FIELD_LIMITS = {
  phone: 40,
  location: 160,
  headline: 180,
  bio: 5000,
};

function validateProfileInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw AppError.badRequest('Profile data must be an object');
  }

  const allowedFields = Object.keys(FIELD_LIMITS);
  const unknownField = Object.keys(input).find(
    (field) => !allowedFields.includes(field),
  );

  if (unknownField) {
    throw AppError.badRequest(`Unsupported profile field: ${unknownField}`);
  }

  if (Object.keys(input).length === 0) {
    throw AppError.badRequest('Provide at least one profile field');
  }

  const profile = {};

  for (const field of allowedFields) {
    if (input[field] === undefined) continue;

    if (input[field] !== null && typeof input[field] !== 'string') {
      throw AppError.badRequest(`${field} must be a string`);
    }

    const value = input[field] === null ? '' : input[field].trim();

    if (value.length > FIELD_LIMITS[field]) {
      throw AppError.badRequest(
        `${field} must be ${FIELD_LIMITS[field]} characters or fewer`,
      );
    }

    profile[field] = value || null;
  }

  return profile;
}

function validateUserId(userId) {
  const id = Number(userId);

  if (!Number.isInteger(id) || id <= 0) {
    throw AppError.badRequest('A valid candidate user ID is required');
  }

  return id;
}

async function getProfile(userId) {
  const id = validateUserId(userId);
  return candidateRepository.findByUserId(id);
}

async function updateProfile(userId, input) {
  const id = validateUserId(userId);
  const updates = validateProfileInput(input);

  const existing = await candidateRepository.findByUserId(id);

  const profile = {
    phone: existing?.phone ?? null,
    location: existing?.location ?? null,
    headline: existing?.headline ?? null,
    bio: existing?.bio ?? null,
    ...updates,
  };

  return candidateRepository.createOrUpdate(id, profile);
}

module.exports = {
  getProfile,
  updateProfile,
};
