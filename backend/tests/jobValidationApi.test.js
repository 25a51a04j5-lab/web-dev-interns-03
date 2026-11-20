const request = require('supertest');
const app = require('../src/app');
const authService = require('../src/services/authService');
const jobRepository = require('../src/repositories/jobRepository');
const userRepository = require('../src/repositories/userRepository');

const PASSWORD = 'Passw0rdOK';

beforeEach(() => {
  userRepository._reset();
  jobRepository._reset();
});

async function hrToken() {
  await authService.createStaff({
    name: 'Validation HR',
    email: 'validation-hr@example.com',
    password: PASSWORD,
    role: 'HR',
    companyId: 1,
  });
  const login = await request(app).post('/api/auth/login').send({
    email: 'validation-hr@example.com',
    password: PASSWORD,
  });
  return login.body.token;
}

describe('job validation API', () => {
  test('rejects unknown create fields and malformed IDs', async () => {
    const token = await hrToken();

    const unknown = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Validated Engineer',
        description: 'Build validated services',
        requirements: 'Node.js',
        status: 'PUBLISHED',
      });
    expect(unknown.status).toBe(400);

    const malformed = await request(app)
      .get('/api/jobs/not-an-id')
      .set('Authorization', `Bearer ${token}`);
    expect(malformed.status).toBe(400);
  });

  test('rejects empty updates and invalid lifecycle status values', async () => {
    const token = await hrToken();
    const created = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Update Engineer',
        description: 'Build updates',
        requirements: 'Node.js',
      });

    const empty = await request(app)
      .patch(`/api/jobs/${created.body.job.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(empty.status).toBe(400);

    const invalidStatus = await request(app)
      .post(`/api/jobs/${created.body.job.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'DELETED' });
    expect(invalidStatus.status).toBe(400);
  });
});
