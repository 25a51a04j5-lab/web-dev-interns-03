const request = require('supertest');
const app = require('../src/app');
const authService = require('../src/services/authService');
const jobRepository = require('../src/repositories/jobRepository');
const userRepository = require('../src/repositories/userRepository');

const PASSWORD = 'Passw0rdOK';

async function login(name, email, role) {
  await authService.createStaff({ name, email, password: PASSWORD, role });
  const response = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return response.body.token;
}

beforeEach(() => {
  userRepository._reset();
  jobRepository._reset();
});

describe('jobs', () => {
  test('public users can list only published jobs', async () => {
    const hrToken = await login('HR User', 'hr-jobs@example.com', 'HR');
    await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        title: 'Draft Engineer',
        description: 'Draft description',
        requirements: 'JavaScript',
      });

    const published = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        title: 'Published Engineer',
        description: 'Published description',
        requirements: 'JavaScript',
      });
    await request(app)
      .post(`/api/jobs/${published.body.job.id}/status`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ status: 'PUBLISHED' });

    const response = await request(app).get('/api/jobs');
    expect(response.status).toBe(200);
    expect(response.body.jobs).toHaveLength(1);
    expect(response.body.jobs[0].status).toBe('PUBLISHED');
  });

  test('HR can create and publish a job, but candidates cannot manage jobs', async () => {
    const hrToken = await login('HR User', 'hr-manage@example.com', 'HR');
    const candidateToken = await login('Candidate User', 'candidate-jobs@example.com', 'CANDIDATE');

    const created = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        title: 'Platform Engineer',
        description: 'Build platform features',
        requirements: 'Node.js and SQL',
      });

    expect(created.status).toBe(201);
    expect(created.body.job.status).toBe('DRAFT');

    const denied = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        title: 'Unauthorized Job',
        description: 'Should fail',
        requirements: 'None',
      });
    expect(denied.status).toBe(403);

    const published = await request(app)
      .post(`/api/jobs/${created.body.job.id}/status`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ status: 'PUBLISHED' });
    expect(published.status).toBe(200);
    expect(published.body.job.status).toBe('PUBLISHED');
  });

  test('rejects invalid job data and invalid status transitions', async () => {
    const hrToken = await login('HR User', 'hr-validation@example.com', 'HR');
    const invalid = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ title: '', description: 'x' });
    expect(invalid.status).toBe(400);

    const created = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        title: 'Transition Engineer',
        description: 'Description',
        requirements: 'Requirements',
      });
    await request(app)
      .post(`/api/jobs/${created.body.job.id}/status`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ status: 'PUBLISHED' });
    const invalidTransition = await request(app)
      .post(`/api/jobs/${created.body.job.id}/status`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ status: 'DRAFT' });
    expect(invalidTransition.status).toBe(422);
  });
});
