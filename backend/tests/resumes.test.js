const fs = require('fs/promises');
const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const authService = require('../src/services/authService');
const applicationRepository = require('../src/repositories/applicationRepository');
const jobRepository = require('../src/repositories/jobRepository');
const resumeRepository = require('../src/repositories/resumeRepository');
const userRepository = require('../src/repositories/userRepository');
const storage = require('../src/config/storage');

const PASSWORD = 'Passw0rdOK';
const pdf = Buffer.from('%PDF-1.4 synthetic resume');

async function tokenFor(name, email, role) {
  if (role === 'CANDIDATE') {
    const result = await authService.registerCandidate({ name, email, password: PASSWORD });
    return { token: result.token };
  }
  await authService.createStaff({ name, email, password: PASSWORD, role });
  const response = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { token: response.body.token };
}

beforeEach(async () => {
  userRepository._reset();
  jobRepository._reset();
  applicationRepository._reset();
  resumeRepository._reset();
  await fs.rm(storage.resumeDirectory, { recursive: true, force: true });
});

afterAll(async () => {
  await fs.rm(storage.resumeDirectory, { recursive: true, force: true });
});

describe('protected resumes', () => {
  test('candidate can upload and download own PDF resume', async () => {
    const candidate = await tokenFor('Resume Candidate', 'resume-candidate@example.com', 'CANDIDATE');
    const uploaded = await request(app)
      .post('/api/candidates/me/resume')
      .set('Authorization', `Bearer ${candidate.token}`)
      .attach('resume', pdf, 'resume.pdf');

    expect(uploaded.status).toBe(201);
    expect(uploaded.body.resume.mimeType).toBe('application/pdf');
    expect(uploaded.body.resume.originalFilename).toBe('resume.pdf');

    const downloaded = await request(app)
      .get('/api/candidates/me/resume')
      .set('Authorization', `Bearer ${candidate.token}`);
    expect(downloaded.status).toBe(200);
    expect(downloaded.headers['content-type']).toMatch(/application\/pdf/);
    expect(downloaded.body).toEqual(pdf);
  });

  test('rejects missing and non-PDF files', async () => {
    const candidate = await tokenFor('Upload Candidate', 'upload-candidate@example.com', 'CANDIDATE');
    const missing = await request(app)
      .post('/api/candidates/me/resume')
      .set('Authorization', `Bearer ${candidate.token}`);
    expect(missing.status).toBe(400);

    const invalid = await request(app)
      .post('/api/candidates/me/resume')
      .set('Authorization', `Bearer ${candidate.token}`)
      .attach('resume', Buffer.from('not a pdf'), 'resume.txt');
    expect(invalid.status).toBe(400);
  });

  test('HR can download an application resume, but candidates cannot download another application resume', async () => {
    const hr = await tokenFor('Resume HR', 'resume-hr@example.com', 'HR');
    const candidate = await tokenFor('Application Candidate', 'application-resume@example.com', 'CANDIDATE');
    await resumeRepository.create({
      candidateId: 2,
      originalFilename: 'application.pdf',
      storageKey: 'resumes/application.pdf',
      mimeType: 'application/pdf',
      sizeBytes: pdf.length,
    });
    await fs.mkdir(storage.resumeDirectory, { recursive: true });
    await fs.writeFile(path.join(storage.resumeDirectory, 'application.pdf'), pdf);
    const application = await applicationRepository.create({
      jobId: 1,
      candidateId: 2,
      coverLetter: null,
    });

    const denied = await request(app)
      .get(`/api/applications/${application.id}/resume`)
      .set('Authorization', `Bearer ${candidate.token}`);
    expect(denied.status).toBe(403);

    const allowed = await request(app)
      .get(`/api/applications/${application.id}/resume`)
      .set('Authorization', `Bearer ${hr.token}`);
    expect(allowed.status).toBe(200);
  });
});
