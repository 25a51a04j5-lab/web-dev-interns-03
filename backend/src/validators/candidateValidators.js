
const AppError = require('../utils/AppError');

const MAX_LENGTHS = {
  headline: 120,
  summary: 2000,
  phone: 25,
  location: 120,
  portfolioUrl: 2048,
  linkedinUrl: 2048,
  githubUrl: 2048,
};

function validationError(field, message) {
  throw AppError.badRequest('Candidate profile validation failed', [
    { field, message },
  ]);
}

function optionalString(value, field, maxLength) {
  if (value === undefined || value === null) return undefined;

  if (typeof value !== 'string') {
    validationError(field, `${field} must be a string`);
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    validationError(
      field,
      `${field} must be ${maxLength} characters or fewer`
    );
  }

  return normalized || null;
}

function optionalUrl(value, field) {
  const normalized = optionalString(
    value,
    field,
    MAX_LENGTHS[field]
  );

  if (normalized === undefined || normalized === null) {
    return normalized;
  }

  let parsed;

  try {
    parsed = new URL(normalized);
  } catch {
    validationError(field, `${field} must be a valid URL`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    validationError(field, `${field} must use http or https`);
  }

  return parsed.toString();
}

function validateCandidateProfile(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    validationError('body', 'Request body must be a JSON object');
  }

  const allowedFields = [
    'headline',
    'summary',
    'phone',
    'location',
    'skills',
    'education',
    'experienceYears',
    'portfolioUrl',
    'linkedinUrl',
    'githubUrl',
  ];

  const unknownFields = Object.keys(body).filter(
    (field) => !allowedFields.includes(field)
  );

  if (unknownFields.length) {
    validationError(
      unknownFields[0],
      `Unsupported profile field: ${unknownFields[0]}`
    );
  }

  const profile = {};

  for (const field of [
    'headline',
    'summary',
    'phone',
    'location',
  ]) {
    const value = optionalString(
      body[field],
      field,
      MAX_LENGTHS[field]
    );

    if (value !== undefined) {
      profile[field] = value;
    }
  }

  for (const field of [
    'portfolioUrl',
    'linkedinUrl',
    'githubUrl',
  ]) {
    const value = optionalUrl(body[field], field);

    if (value !== undefined) {
      profile[field] = value;
    }
  }

  if (body.skills !== undefined) {
    if (!Array.isArray(body.skills) || body.skills.length > 50) {
      validationError(
        'skills',
        'skills must be an array containing at most 50 items'
      );
    }

    const skills = body.skills.map((skill) => {
      if (
        typeof skill !== 'string' ||
        !skill.trim() ||
        skill.trim().length > 60
      ) {
        validationError(
          'skills',
          'Each skill must be a non-empty string of at most 60 characters'
        );
      }

      return skill.trim();
    });

    profile.skills = [...new Set(skills)];
  }

  if (body.education !== undefined) {
    if (
      !Array.isArray(body.education) ||
      body.education.length > 20
    ) {
      validationError(
        'education',
        'education must be an array containing at most 20 items'
      );
    }

    profile.education = body.education.map((entry, index) => {
      if (
        !entry ||
        typeof entry !== 'object' ||
        Array.isArray(entry)
      ) {
        validationError(
          `education[${index}]`,
          'Each education entry must be an object'
        );
      }

      const allowed = [
        'institution',
        'degree',
        'fieldOfStudy',
        'startYear',
        'endYear',
      ];

      const extra = Object.keys(entry).find(
        (key) => !allowed.includes(key)
      );

      if (extra) {
        validationError(
          `education[${index}].${extra}`,
          'Unsupported education field'
        );
      }

      const result = {};

      for (const field of [
        'institution',
        'degree',
        'fieldOfStudy',
      ]) {
        const value = optionalString(
          entry[field],
          `education[${index}].${field}`,
          120
        );

        if (value !== undefined) {
          result[field] = value;
        }
      }

      for (const field of ['startYear', 'endYear']) {
        if (
          entry[field] !== undefined &&
          entry[field] !== null &&
          entry[field] !== ''
        ) {
          const year = Number(entry[field]);
          const currentYear = new Date().getFullYear();

          if (
            !Number.isInteger(year) ||
            year < 1950 ||
            year > currentYear + 10
          ) {
            validationError(
              `education[${index}].${field}`,
              `${field} must be a valid year`
            );
          }

          result[field] = year;
        }
      }

      return result;
    });
  }

  if (body.experienceYears !== undefined) {
    const years = Number(body.experienceYears);

    if (
      !Number.isFinite(years) ||
      years < 0 ||
      years > 60
    ) {
      validationError(
        'experienceYears',
        'experienceYears must be between 0 and 60'
      );
    }

    profile.experienceYears = years;
  }

  if (Object.keys(profile).length === 0) {
    validationError(
      'body',
      'Provide at least one supported profile field'
    );
  }

  return profile;
}

module.exports = {
  validateCandidateProfile,
};
