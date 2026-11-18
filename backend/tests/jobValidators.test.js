const {
  validateJobCreate,
  validateJobId,
  validateJobUpdate,
  validateStatus,
} = require('../src/validators/jobValidators');

function errorFor(fn) {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected validation to fail');
}

describe('job validators', () => {
  test('creates a normalized, valid job payload', () => {
    expect(validateJobCreate({
      title: '  Backend Engineer  ',
      description: '  Build APIs  ',
      requirements: '  Node.js  ',
      location: '  Remote  ',
      employmentType: '  Full-time  ',
      closesAt: '2026-12-31T23:59:59Z',
    })).toEqual({
      title: 'Backend Engineer',
      description: 'Build APIs',
      requirements: 'Node.js',
      location: 'Remote',
      employmentType: 'Full-time',
      closesAt: '2026-12-31T23:59:59Z',
    });
  });

  test('rejects missing fields, unknown fields, and invalid field types', () => {
    const missing = errorFor(() => validateJobCreate({ title: '', description: 'x' }));
    expect(missing.status).toBe(400);
    expect(missing.details.map((detail) => detail.field)).toEqual(expect.arrayContaining(['title', 'requirements']));

    const unknown = errorFor(() => validateJobCreate({
      title: 'Engineer',
      description: 'Build services',
      requirements: 'Node.js',
      status: 'PUBLISHED',
    }));
    expect(unknown.details).toEqual([
      { field: 'status', message: 'Field cannot be submitted' },
    ]);

    const arrayBody = errorFor(() => validateJobCreate([]));
    expect(arrayBody.details[0].field).toBe('body');
  });

  test('enforces length limits and valid optional values', () => {
    const error = errorFor(() => validateJobCreate({
      title: 'x'.repeat(181),
      description: 'Description',
      requirements: 'Requirements',
      location: 'x'.repeat(161),
      employmentType: 42,
      closesAt: 'not-a-date',
    }));

    expect(error.details.map((detail) => detail.field)).toEqual(
      expect.arrayContaining(['title', 'location', 'employmentType', 'closesAt']),
    );
  });

  test('validates updates as partial payloads', () => {
    expect(validateJobUpdate({ title: '  Updated  ', location: null })).toEqual({
      title: 'Updated',
      location: null,
    });

    expect(errorFor(() => validateJobUpdate({})).details[0].field).toBe('body');
    expect(errorFor(() => validateJobUpdate({ status: 'PUBLISHED' })).details[0].field).toBe('status');
  });

  test('validates IDs and lifecycle status values', () => {
    expect(validateJobId('42')).toBe(42);
    expect(errorFor(() => validateJobId('0')).status).toBe(400);
    expect(errorFor(() => validateJobId('-1')).status).toBe(400);

    expect(validateStatus('PUBLISHED')).toBe('PUBLISHED');
    expect(errorFor(() => validateStatus('DELETED')).status).toBe(400);
    expect(errorFor(() => validateStatus()).status).toBe(400);
  });
});
