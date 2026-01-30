const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const Redis = require('ioredis');
const app = require('../src/app');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/auth_service?schema=public';
const pool = new Pool({ connectionString: DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function waitForDB(retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('DB did not become available');
}

beforeAll(async () => {
  await waitForDB();
  // Run seeds to ensure schema exists
  const seedSql = fs.readFileSync(path.join(__dirname, '..', 'seeds', 'init.sql'), 'utf8');
  await pool.query(seedSql);
  await redis.flushall();
});

afterAll(async () => {
  await pool.end();
  await redis.quit();
});

describe('Integration tests', () => {
  let adminTokens = null;
  let userTokens = null;

  test('login seeded regular user', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'user@example.com', password: 'UserPassword123!' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    userTokens = res.body;
  });

  test('get profile with access token', async () => {
    const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${userTokens.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('user@example.com');
  });

  test('regular user cannot list users', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${userTokens.accessToken}`);
    expect([403, 401]).toContain(res.status);
  });

  test('login seeded admin and list users', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@example.com', password: 'AdminPassword123!' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    adminTokens = res.body;

    const list = await request(app).get('/api/users').set('Authorization', `Bearer ${adminTokens.accessToken}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBeGreaterThanOrEqual(2);
  });

  test('register new user and duplicate conflict', async () => {
    const email = `test+${Date.now()}@example.com`;
    const r1 = await request(app).post('/api/auth/register').send({ name: 'Test', email, password: 'Password123!' });
    expect(r1.status).toBe(201);

    const r2 = await request(app).post('/api/auth/register').send({ name: 'Test', email, password: 'Password123!' });
    expect(r2.status).toBe(409);
  });

  test('oauth mock callback creates and logs in user', async () => {
    const providerId = `prov-${Date.now()}`;
    const res = await request(app).get(`/api/auth/google/callback?mock=true&provider_user_id=${providerId}&email=oauth@example.com&name=OauthUser`);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();

    // Call again with same provider id - should still return tokens (no duplicate accounts)
    const res2 = await request(app).get(`/api/auth/google/callback?mock=true&provider_user_id=${providerId}&email=oauth@example.com&name=OauthUser`);
    expect(res2.status).toBe(200);
  });

  test('refresh token rotation', async () => {
    const r = await request(app).post('/api/auth/refresh').send({ refreshToken: userTokens.refreshToken });
    expect(r.status).toBe(200);
    expect(r.body.accessToken).toBeTruthy();
    expect(r.body.refreshToken).toBeTruthy();
  });

  test('rate limiting blocks after 10 failed logins', async () => {
    const statuses = [];
    for (let i = 0; i < 11; i++) {
      // wrong password
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).post('/api/auth/login').send({ email: 'user@example.com', password: 'wrong' });
      statuses.push(res.status);
    }
    const counts = statuses.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
    expect(counts[401]).toBeGreaterThanOrEqual(10);
    expect(counts[429]).toBeGreaterThanOrEqual(1);
  });
});
