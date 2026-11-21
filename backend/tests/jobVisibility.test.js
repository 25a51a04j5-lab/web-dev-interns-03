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

async function loginStaff(role, email, companyId) {
  await authService.createStaff({
    name: `${role} Visibility`,
    email,
    password: PASSWORD,
    role,
    companyId,
  });
  const response = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return response.body.token;
}

async function loginCandidate(email) {
  const registered = await authService.registerCandidate({
    name: 'Candidate Visibility',
    email,
    password: PASSWORD,
  });
  return registered.token;
}

async function createDraft(token, title = 'Visibility Engineer') {
  return request(app)
    .post('/api/jobs')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title,
      description: 'Test company-scoped job visibility.',
      requirements: 'Node.js',
      location: 'Remote',
    });
}

describe('job visibility and role access', () => {
  test('public users see only published jobs, while staff see their own unpublished jobs', async () => {
    const hrToken = await loginStaff('HR', 'visibility-hr@example.com', 1);

    const draft = await createDraft(hrToken, 'Draft Visibility Job');
    expect(draft.status).toBe(201);

    const published = await createDraft(hrToken, 'Published Visibility Job');
    await request(app)
      .post(`/api/jobs/${published.body.job.id}/status`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ status: 'PUBLISHED' });

    const publicList = await request(app).get('/api/jobs');
    expect(publicList.status).toBe(200);
    expect(publicList.body.jobs.map((job) => job.status)).toEqual(['PUBLISHED']);

    const hrList = await request(app)
      .get('/api/jobs')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(hrList.status).toBe(200);
    expect(hrList.body.jobs).toHaveLength(2);
    expect(hrList.body.jobs.map((job) => job.status).sort()).toEqual(['DRAFT', 'PUBLISHED']);
  });

  test('unpublished jobs are hidden across companies and for candidates', async () => {
    const companyOne = await loginStaff('HR', 'visibility-company-one@example.com', 1);
    const companyTwo = await loginStaff('HR', 'visibility-company-two@example.com', 2);
    const candidate = await loginCandidate('visibility-candidate@example.com');

    const draft = await createDraft(companyOne);

    const companyOneDetail = await request(app)
      .get(`/api/jobs/${draft.body.job.id}`)
      .set('Authorization', `Bearer ${companyOne}`);
    expect(companyOneDetail.status).toBe(200);

    const companyTwoDetail = await request(app)
      .get(`/api/jobs/${draft.body.job.id}`)
      .set('Authorization', `Bearer ${companyTwo}`);
    expect(companyTwoDetail.status).toBe(404);

    const candidateDetail = await request(app)
      .get(`/api/jobs/${draft.body.job.id}`)
      .set('Authorization', `Bearer ${candidate}`);
    expect(candidateDetail.status).toBe(404);
  });

  test('published jobs remain publicly readable across companies', async () => {
    const companyOne = await loginStaff('ADMIN', 'visibility-admin-one@example.com', 1);
    const companyTwo = await loginStaff('HR', 'visibility-hr-two@example.com', 2);

    const draft = await createDraft(companyOne);
    await request(app)
      .post(`/api/jobs/${draft.body.job.id}/status`)
      .set('Authorization', `Bearer ${companyOne}`)
      .send({ status: 'PUBLISHED' });

    const publicDetail = await request(app).get(`/api/jobs/${draft.body.job.id}`);
    expect(publicDetail.status).toBe(200);

    const crossCompanyDetail = await request(app)
      .get(`/api/jobs/${draft.body.job.id}`)
      .set('Authorization', `Bearer ${companyTwo}`);
    expect(crossCompanyDetail.status).toBe(200);
  });

  test('staff accounts without a company cannot manage jobs', async () => {
    const staffToken = await loginStaff('HR', 'visibility-no-company@example.com', null);

    const createResponse = await createDraft(staffToken);
    expect(createResponse.status).toBe(403);
  });
});
