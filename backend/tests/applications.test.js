const request = require('supertest');
const app = require('../src/app');
const authService = require('../src/services/authService');
const applicationRepository = require('../src/repositories/applicationRepository');
const jobRepository = require('../src/repositories/jobRepository');
const userRepository = require('../src/repositories/userRepository');

const PASSWORD = 'Passw0rdOK';

async function tokenFor(name, email, role) {
  if (role === 'CANDIDATE') {
    const result = await authService.registerCandidate({ name, email, password: PASSWORD });
    return { token: result.token, id: result.user.id };
  }
  await authService.createStaff({ name, email, password: PASSWORD, role, companyId: 1 });
  const response = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { token: response.body.token };
}

async function publishedJob(token) {
  const created = await request(app)
    .post('/api/jobs')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Application Engineer',
      description: 'Build application workflows',
      requirements: 'Node.js and SQL',
    });
  await request(app)
    .post(`/api/jobs/${created.body.job.id}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'PUBLISHED' });
  return created.body.job.id;
}

beforeEach(() => {
  userRepository._reset();
  jobRepository._reset();
  applicationRepository._reset();
});

describe('applications and candidate pipeline', () => {
  test('candidate can apply to a published job and view own application', async () => {
    const hr = await tokenFor('HR User', 'hr-application@example.com', 'HR');
    const candidate = await tokenFor('Candidate User', 'candidate-application@example.com', 'CANDIDATE');
    const jobId = await publishedJob(hr.token);

    const submitted = await request(app)
      .post(`/api/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${candidate.token}`)
      .send({ coverLetter: 'I would like to join this team.' });

    expect(submitted.status).toBe(201);
    expect(submitted.body.application.stage).toBe('APPLIED');

    const own = await request(app)
      .get(`/api/applications/${submitted.body.application.id}`)
      .set('Authorization', `Bearer ${candidate.token}`);
    expect(own.status).toBe(200);
    expect(own.body.application.candidateId).toBe(candidate.id);
  });

  test('candidate cannot submit twice or view another candidate application', async () => {
    const hr = await tokenFor('HR User', 'hr-duplicate@example.com', 'HR');
    const first = await tokenFor('First Candidate', 'first-application@example.com', 'CANDIDATE');
    const second = await tokenFor('Second Candidate', 'second-application@example.com', 'CANDIDATE');
    const jobId = await publishedJob(hr.token);

    const submitted = await request(app)
      .post(`/api/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${first.token}`)
      .send({});
    const duplicate = await request(app)
      .post(`/api/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${first.token}`)
      .send({});
    expect(duplicate.status).toBe(409);

    const hidden = await request(app)
      .get(`/api/applications/${submitted.body.application.id}`)
      .set('Authorization', `Bearer ${second.token}`);
    expect(hidden.status).toBe(404);
  });

  test('HR can move an application through valid stages and inspect history', async () => {
    const hr = await tokenFor('HR User', 'hr-pipeline@example.com', 'HR');
    const candidate = await tokenFor('Candidate User', 'candidate-pipeline@example.com', 'CANDIDATE');
    const jobId = await publishedJob(hr.token);
    const submitted = await request(app)
      .post(`/api/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${candidate.token}`)
      .send({});

    const screening = await request(app)
      .patch(`/api/applications/${submitted.body.application.id}/stage`)
      .set('Authorization', `Bearer ${hr.token}`)
      .send({ stage: 'SCREENING' });
    expect(screening.status).toBe(200);
    expect(screening.body.application.stage).toBe('SCREENING');

    const interview = await request(app)
      .patch(`/api/applications/${submitted.body.application.id}/stage`)
      .set('Authorization', `Bearer ${hr.token}`)
      .send({ stage: 'INTERVIEW' });
    expect(interview.status).toBe(200);

    const history = await request(app)
      .get(`/api/applications/${submitted.body.application.id}/history`)
      .set('Authorization', `Bearer ${hr.token}`);
    expect(history.status).toBe(200);
    expect(history.body.history).toHaveLength(3);

    const invalid = await request(app)
      .patch(`/api/applications/${submitted.body.application.id}/stage`)
      .set('Authorization', `Bearer ${hr.token}`)
      .send({ stage: 'OFFERED' });
    expect(invalid.status).toBe(422);
  });

  test('candidates cannot list all applications or change stages', async () => {
    const candidate = await tokenFor('Candidate User', 'candidate-denied@example.com', 'CANDIDATE');
    const list = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${candidate.token}`);
    expect(list.status).toBe(403);
  });
});
