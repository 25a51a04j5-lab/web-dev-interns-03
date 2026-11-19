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

async function account(name, email, role, companyId) {
  if (role === 'CANDIDATE') {
    const registered = await authService.registerCandidate({ name, email, password: PASSWORD });
    return registered.token;
  }
  await authService.createStaff({ name, email, password: PASSWORD, role, companyId });
  const login = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return login.body.token;
}

async function createDraft(token, title = 'CRUD Engineer') {
  return request(app)
    .post('/api/jobs')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title,
      description: 'Build reliable job CRUD workflows.',
      requirements: 'Node.js and SQL',
      location: 'Remote',
    });
}

describe('job CRUD API', () => {
  test('HR and Admin can create and HR can read a draft, but public and Candidate users cannot', async () => {
    const hrToken = await account('HR CRUD', 'hr-crud@example.com', 'HR', 1);
    const adminToken = await account('Admin CRUD', 'admin-crud@example.com', 'ADMIN', 1);
    const candidateToken = await account('Candidate CRUD', 'candidate-crud@example.com', 'CANDIDATE');

    const hrCreated = await createDraft(hrToken);
    expect(hrCreated.status).toBe(201);
    expect(hrCreated.body.job.status).toBe('DRAFT');

    const adminCreated = await createDraft(adminToken, 'Admin CRUD Engineer');
    expect(adminCreated.status).toBe(201);

    const hrDetail = await request(app)
      .get(`/api/jobs/${hrCreated.body.job.id}`)
      .set('Authorization', `Bearer ${hrToken}`);
    expect(hrDetail.status).toBe(200);

    const publicDetail = await request(app).get(`/api/jobs/${hrCreated.body.job.id}`);
    expect(publicDetail.status).toBe(404);

    const candidateDetail = await request(app)
      .get(`/api/jobs/${hrCreated.body.job.id}`)
      .set('Authorization', `Bearer ${candidateToken}`);
    expect(candidateDetail.status).toBe(404);
  });

  test('HR can edit a draft and published job but cannot edit an archived job', async () => {
    const hrToken = await account('HR Update', 'hr-update@example.com', 'HR', 1);
    const created = await createDraft(hrToken);

    const draftUpdate = await request(app)
      .patch(`/api/jobs/${created.body.job.id}`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ title: 'Updated Draft Engineer', location: null });
    expect(draftUpdate.status).toBe(200);
    expect(draftUpdate.body.job.title).toBe('Updated Draft Engineer');
    expect(draftUpdate.body.job.location).toBeNull();

    const published = await request(app)
      .post(`/api/jobs/${created.body.job.id}/status`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ status: 'PUBLISHED' });
    expect(published.status).toBe(200);

    const publishedUpdate = await request(app)
      .patch(`/api/jobs/${created.body.job.id}`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ description: 'Updated published description' });
    expect(publishedUpdate.status).toBe(200);

    await request(app)
      .post(`/api/jobs/${created.body.job.id}/status`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ status: 'CLOSED' });
    await request(app)
      .post(`/api/jobs/${created.body.job.id}/status`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ status: 'ARCHIVED' });

    const archivedUpdate = await request(app)
      .patch(`/api/jobs/${created.body.job.id}`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ title: 'Should fail' });
    expect(archivedUpdate.status).toBe(409);
  });

  test('Candidate cannot create or edit jobs and missing jobs return 404', async () => {
    const candidateToken = await account('Candidate Denied', 'candidate-denied@example.com', 'CANDIDATE');

    const deniedCreate = await createDraft(candidateToken);
    expect(deniedCreate.status).toBe(403);

    const missingUpdate = await request(app)
      .patch('/api/jobs/999')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ title: 'No access' });
    expect(missingUpdate.status).toBe(403);

    const hrToken = await account('HR Missing', 'hr-missing@example.com', 'HR', 1);
    const missingForHr = await request(app)
      .patch('/api/jobs/999')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ title: 'Missing job' });
    expect(missingForHr.status).toBe(404);
  });

  test('a published job is publicly readable while the same ID is hidden in drafts for other companies', async () => {
    const companyOneHr = await account('Company One HR', 'company-one@example.com', 'HR', 1);
    const companyTwoHr = await account('Company Two HR', 'company-two@example.com', 'HR', 2);
    const created = await createDraft(companyOneHr);

    const crossCompanyDraft = await request(app)
      .get(`/api/jobs/${created.body.job.id}`)
      .set('Authorization', `Bearer ${companyTwoHr}`);
    expect(crossCompanyDraft.status).toBe(404);

    await request(app)
      .post(`/api/jobs/${created.body.job.id}/status`)
      .set('Authorization', `Bearer ${companyOneHr}`)
      .send({ status: 'PUBLISHED' });

    const publicDetail = await request(app).get(`/api/jobs/${created.body.job.id}`);
    expect(publicDetail.status).toBe(200);

    const crossCompanyDetail = await request(app)
      .get(`/api/jobs/${created.body.job.id}`)
      .set('Authorization', `Bearer ${companyTwoHr}`);
    expect(crossCompanyDetail.status).toBe(200);

    const crossCompanyUpdate = await request(app)
      .patch(`/api/jobs/${created.body.job.id}`)
      .set('Authorization', `Bearer ${companyTwoHr}`)
      .send({ title: 'Unauthorized company edit' });
    expect(crossCompanyUpdate.status).toBe(404);
  });
});
