
jest.mock('../src/repositories/candidateRepository', () => ({
  findByUserId: jest.fn(),
  createOrUpdate: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/app');
const userRepository = require('../src/repositories/userRepository');
const authService = require('../src/services/authService');
const candidateRepository = require('../src/repositories/candidateRepository');

const PASSWORD = 'Passw0rdOK';

async function makeUser(role, email) {
  const { user } = await authService.createStaff({
    name: `${role} User`,
    email,
    password: PASSWORD,
    role,
  });

  return user;
}

async function tokenFor(email) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password: PASSWORD });

  return response.body.token;
}

beforeEach(() => {
  userRepository._reset();
  jest.clearAllMocks();
});

describe('Candidate profile endpoints', () => {
  test('candidate can retrieve their own profile', async () => {
    const user = await makeUser('CANDIDATE', 'candidate@example.com');
    const token = await tokenFor('candidate@example.com');

    const profile = {
      id: 1,
      userId: user.id,
      phone: '9876543210',
      location: 'Tamil Nadu',
      headline: 'Computer Science Student',
      bio: 'Interested in web development',
    };

    candidateRepository.findByUserId.mockResolvedValue(profile);

    const response = await request(app)
      .get('/api/candidates/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.profile).toEqual(profile);
    expect(candidateRepository.findByUserId).toHaveBeenCalledWith(user.id);
  });

  test('candidate can update their profile', async () => {
    const user = await makeUser('CANDIDATE', 'update@example.com');
    const token = await tokenFor('update@example.com');

    const updatedProfile = {
      id: 1,
      userId: user.id,
      phone: '9876543210',
      location: 'Nagercoil',
      headline: 'Full Stack Developer',
      bio: 'Learning MERN stack development',
    };

    candidateRepository.findByUserId.mockResolvedValue(null);
    candidateRepository.createOrUpdate.mockResolvedValue(updatedProfile);

    const response = await request(app)
      .patch('/api/candidates/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        phone: '9876543210',
        location: 'Nagercoil',
        headline: 'Full Stack Developer',
        bio: 'Learning MERN stack development',
      });

    expect(response.status).toBe(200);
    expect(response.body.profile).toEqual(updatedProfile);
    expect(candidateRepository.createOrUpdate).toHaveBeenCalled();
  });

  test('unauthenticated users cannot access candidate profiles', async () => {
    const response = await request(app)
      .get('/api/candidates/me');

    expect(response.status).toBe(401);
  });

  test('admin cannot access candidate profile endpoints', async () => {
    await makeUser('ADMIN', 'admin@example.com');
    const token = await tokenFor('admin@example.com');

    const response = await request(app)
      .get('/api/candidates/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  test('HR cannot access candidate profile endpoints', async () => {
    await makeUser('HR', 'hr@example.com');
    const token = await tokenFor('hr@example.com');

    const response = await request(app)
      .get('/api/candidates/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  test('rejects unsupported profile fields', async () => {
    await makeUser('CANDIDATE', 'invalid@example.com');
    const token = await tokenFor('invalid@example.com');

    const response = await request(app)
      .patch('/api/candidates/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        admin: true,
      });

    expect(response.status).toBe(400);
    expect(candidateRepository.createOrUpdate).not.toHaveBeenCalled();
  });

  test('rejects an empty profile update', async () => {
    await makeUser('CANDIDATE', 'empty@example.com');
    const token = await tokenFor('empty@example.com');

    const response = await request(app)
      .patch('/api/candidates/me')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(candidateRepository.createOrUpdate).not.toHaveBeenCalled();
  });
});