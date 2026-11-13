const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const env = require('../src/config/env');
const userRepository = require('../src/repositories/userRepository');
const authService = require('../src/services/authService');

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
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return res.body.token;
}

beforeEach(() => userRepository._reset());

describe('registration', () => {
  test('creates a CANDIDATE and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Asha', email: 'Asha@Example.com', password: PASSWORD });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'asha@example.com', role: 'CANDIDATE' });
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('ignores a role supplied by the client (no self-promotion)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Sneaky', email: 's@example.com', password: PASSWORD, role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('CANDIDATE');
  });

  test('rejects weak password, bad email and short name with 400 details', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'nope', password: 'weak' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual(['email', 'name', 'password']);
  });

  test('rejects duplicate email with 409', async () => {
    const body = { name: 'Asha', email: 'a@example.com', password: PASSWORD };
    await request(app).post('/api/auth/register').send(body);
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(409);
  });

  test('rejects malformed JSON with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
  });
});

describe('login', () => {
  test('succeeds with correct credentials', async () => {
    await makeUser('HR', 'hr@example.com');
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hr@example.com', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('HR');
    expect(res.body.token).toBeTruthy();
  });

  test('wrong password and unknown email give the same 401', async () => {
    await makeUser('HR', 'hr@example.com');
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hr@example.com', password: 'Wrong1234' });
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  test('disabled account cannot log in', async () => {
    const u = await makeUser('HR', 'hr@example.com');
    await userRepository.setActive(u.id, false);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hr@example.com', password: PASSWORD });
    expect(res.status).toBe(401);
  });

  test('missing fields give 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('authenticate (401 cases)', () => {
  test('no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('garbage token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
  });

  test('token signed with the wrong secret', async () => {
    const u = await makeUser('ADMIN', 'admin@example.com');
    const forged = jwt.sign({ sub: String(u.id), role: 'ADMIN' }, 'other-secret');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  test('expired token', async () => {
    const u = await makeUser('ADMIN', 'admin@example.com');
    const expired = jwt.sign({ sub: String(u.id), role: 'ADMIN' }, env.jwtSecret, { expiresIn: -10 });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/expired/i);
  });

  test('token role claim is not trusted: the DB role wins', async () => {
    const c = await makeUser('HR', 'x@example.com');
    const forgedRole = jwt.sign({ sub: String(c.id), role: 'ADMIN' }, env.jwtSecret);
    const res = await request(app).get('/api/admin/ping').set('Authorization', `Bearer ${forgedRole}`);
    expect(res.status).toBe(403);
  });

  test('deactivated user is rejected even with a valid token', async () => {
    const u = await makeUser('HR', 'hr@example.com');
    const token = await tokenFor('hr@example.com');
    await userRepository.setActive(u.id, false);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

describe('requireRole (403 / 200 matrix)', () => {
  const cases = [
    // route,               ADMIN, HR,  CANDIDATE
    ['/api/admin/ping', 200, 403, 403],
    ['/api/hr/ping', 200, 200, 403],
    ['/api/candidate/ping', 403, 403, 200],
  ];

  test.each(cases)('%s', async (route, admin, hr, candidate) => {
    await makeUser('ADMIN', 'admin@example.com');
    await makeUser('HR', 'hr@example.com');
    await makeUser('CANDIDATE', 'cand@example.com');

    const expected = { 'admin@example.com': admin, 'hr@example.com': hr, 'cand@example.com': candidate };
    for (const [email, status] of Object.entries(expected)) {
      const token = await tokenFor(email);
      const res = await request(app).get(route).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(status);
    }
  });
});

describe('admin user management', () => {
  test('admin can create an HR user, who can then log in', async () => {
    await makeUser('ADMIN', 'admin@example.com');
    const adminToken = await tokenFor('admin@example.com');
    const create = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New HR', email: 'newhr@example.com', password: PASSWORD, role: 'HR' });
    expect(create.status).toBe(201);
    expect(create.body.user.role).toBe('HR');
    expect(await tokenFor('newhr@example.com')).toBeTruthy();
  });

  test('admin cannot create a CANDIDATE through the staff endpoint', async () => {
    await makeUser('ADMIN', 'admin@example.com');
    const adminToken = await tokenFor('admin@example.com');
    const res = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Nope', email: 'n@example.com', password: PASSWORD, role: 'CANDIDATE' });
    expect(res.status).toBe(400);
  });

  test('HR and candidates cannot create users or list users', async () => {
    await makeUser('HR', 'hr@example.com');
    await makeUser('CANDIDATE', 'cand@example.com');
    for (const email of ['hr@example.com', 'cand@example.com']) {
      const token = await tokenFor(email);
      const post = await request(app)
        .post('/api/auth/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'X Y', email: 'z@example.com', password: PASSWORD, role: 'ADMIN' });
      const get = await request(app).get('/api/auth/users').set('Authorization', `Bearer ${token}`);
      expect(post.status).toBe(403);
      expect(get.status).toBe(403);
    }
  });

  test('user list never exposes password hashes', async () => {
    await makeUser('ADMIN', 'admin@example.com');
    const token = await tokenFor('admin@example.com');
    const res = await request(app).get('/api/auth/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});

describe('error format', () => {
  test('unknown route returns the standard JSON error', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
