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

async function createStaffToken(role, email, companyId = 1) {
  await authService.createStaff({
    name: `${role} Publishing`,
    email,
    password: PASSWORD,
    role,
    companyId,
  });
  const login = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return login.body.token;
}

async function createDraft(token, title = 'Publishing Engineer') {
  return request(app)
    .post('/api/jobs')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title,
      description: 'Build publishing workflow behavior.',
      requirements: 'Node.js and SQL',
    });
}

async function changeStatus(token, jobId, status) {
  return request(app)
    .post(`/api/jobs/${jobId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status });
}

describe('job publishing lifecycle', () => {
  test('publishes a draft and records the publication timestamp', async () => {
    const hrToken = await createStaffToken('HR', 'publish-hr@example.com');
    const created = await createDraft(hrToken);

    const published = await changeStatus(hrToken, created.body.job.id, 'PUBLISHED');

    expect(published.status).toBe(200);
    expect(published.body.job.status).toBe('PUBLISHED');
    expect(published.body.job.publishedAt).toBeTruthy();
  });

  test('allows draft to archive, published to close or archive, and closed to archive', async () => {
    const hrToken = await createStaffToken('HR', 'lifecycle-hr@example.com');

    const draft = await createDraft(hrToken, 'Draft Archive');
    const draftArchive = await changeStatus(hrToken, draft.body.job.id, 'ARCHIVED');
    expect(draftArchive.status).toBe(200);
    expect(draftArchive.body.job.status).toBe('ARCHIVED');

    const published = await createDraft(hrToken, 'Published Lifecycle');
    await changeStatus(hrToken, published.body.job.id, 'PUBLISHED');

    const closed = await changeStatus(hrToken, published.body.job.id, 'CLOSED');
    expect(closed.status).toBe(200);
    expect(closed.body.job.status).toBe('CLOSED');

    const archived = await changeStatus(hrToken, published.body.job.id, 'ARCHIVED');
    expect(archived.status).toBe(200);
    expect(archived.body.job.status).toBe('ARCHIVED');
    expect(archived.body.job.archivedAt).toBeTruthy();
  });

  test('rejects re-publishing and every transition from archived', async () => {
    const hrToken = await createStaffToken('HR', 'terminal-hr@example.com');
    const created = await createDraft(hrToken);

    await changeStatus(hrToken, created.body.job.id, 'PUBLISHED');
    const republish = await changeStatus(hrToken, created.body.job.id, 'PUBLISHED');
    expect(republish.status).toBe(422);

    await changeStatus(hrToken, created.body.job.id, 'ARCHIVED');

    for (const status of ['PUBLISHED', 'CLOSED', 'ARCHIVED']) {
      const terminal = await changeStatus(hrToken, created.body.job.id, status);
      expect(terminal.status).toBe(422);
    }
  });

  test('rejects closed jobs being published and hides cross-company lifecycle changes', async () => {
    const companyOneHr = await createStaffToken('HR', 'company-one-hr@example.com', 1);
    const companyTwoHr = await createStaffToken('HR', 'company-two-hr@example.com', 2);
    const created = await createDraft(companyOneHr);

    await changeStatus(companyOneHr, created.body.job.id, 'PUBLISHED');
    await changeStatus(companyOneHr, created.body.job.id, 'CLOSED');

    const publishClosed = await changeStatus(companyOneHr, created.body.job.id, 'PUBLISHED');
    expect(publishClosed.status).toBe(422);

    const crossCompany = await changeStatus(companyTwoHr, created.body.job.id, 'ARCHIVED');
    expect(crossCompany.status).toBe(404);
  });

  test('only HR and Admin can change lifecycle status', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Candidate', email: 'candidate-publish@example.com', password: PASSWORD });
    const candidateLogin = await request(app).post('/api/auth/login').send({
      email: 'candidate-publish@example.com',
      password: PASSWORD,
    });
    const hrToken = await createStaffToken('HR', 'role-publish@example.com');
    const created = await createDraft(hrToken);

    const denied = await changeStatus(candidateLogin.body.token, created.body.job.id, 'PUBLISHED');
    expect(denied.status).toBe(403);

    const adminToken = await createStaffToken('ADMIN', 'admin-publish@example.com');
    const allowed = await changeStatus(adminToken, created.body.job.id, 'PUBLISHED');
    expect(allowed.status).toBe(200);
  });
});
