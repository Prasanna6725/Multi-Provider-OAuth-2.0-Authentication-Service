const http = require('http');

const BASE = `http://localhost:${process.env.API_PORT || 8080}`;

function req(method, path, body = null, headers = {}) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const options = new URL(BASE + path);
    const req = http.request(options, { method, headers }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(buf || '{}'); } catch (e) { parsed = buf; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  console.log('BASE:', BASE);

  // 1. Login regular user
  console.log('\n1) Login regular user');
  const login = await req('POST', '/api/auth/login', { email: 'user@example.com', password: 'UserPassword123!' }, { 'Content-Type': 'application/json' });
  console.log('status', login.status);
  console.log('body', login.body);
  const regAccess = login.body && login.body.accessToken;
  const regRefresh = login.body && login.body.refreshToken;

  // 2) GET /api/users/me
  console.log('\n2) GET /api/users/me with regular token');
  const me = await req('GET', '/api/users/me', null, { Authorization: 'Bearer ' + regAccess });
  console.log('status', me.status, 'body', me.body);

  // 3) GET /api/users as regular user (should be 403)
  console.log('\n3) GET /api/users with regular token (expect 403)');
  const listAsReg = await req('GET', '/api/users', null, { Authorization: 'Bearer ' + regAccess });
  console.log('status', listAsReg.status);

  // 4) Login admin and list users
  console.log('\n4) Login admin and GET /api/users');
  const loginAdmin = await req('POST', '/api/auth/login', { email: 'admin@example.com', password: 'AdminPassword123!' }, { 'Content-Type': 'application/json' });
  console.log('admin login status', loginAdmin.status);
  const adminAccess = loginAdmin.body && loginAdmin.body.accessToken;
  const listAsAdmin = await req('GET', '/api/users', null, { Authorization: 'Bearer ' + adminAccess });
  console.log('list status', listAsAdmin.status, 'count', Array.isArray(listAsAdmin.body) ? listAsAdmin.body.length : 0);

  // 5) Register new user
  console.log('\n5) Register new user');
  const randomEmail = `smoke+${Date.now()}@example.com`;
  const register = await req('POST', '/api/auth/register', { name: 'Smoke Test', email: randomEmail, password: 'Password123!' }, { 'Content-Type': 'application/json' });
  console.log('register status', register.status, 'body', register.body);

  // 6) OAuth mock callback create/link
  console.log('\n6) OAuth mock callback create + link');
  const oauthCreate = await req('GET', `/api/auth/google/callback?mock=true&provider_user_id=prov-${Date.now()}&email=oauthuser@example.com&name=OAuthUser`);
  console.log('oauth create status', oauthCreate.status, 'body', oauthCreate.body ? Object.keys(oauthCreate.body) : oauthCreate.body);
  // call again with same provider_user_id to ensure it logs in not create
  const oauthAgain = await req('GET', `/api/auth/google/callback?mock=true&provider_user_id=prov-${Date.now()-1}&email=oauthuser2@example.com&name=OAuthUser2`);
  console.log('oauth second status', oauthAgain.status);

  // 7) Refresh token
  console.log('\n7) Refresh token rotation (regular user)');
  const refreshRes = await req('POST', '/api/auth/refresh', { refreshToken: regRefresh }, { 'Content-Type': 'application/json' });
  console.log('refresh status', refreshRes.status, 'body', refreshRes.body);

  // 8) Rate limiting: 11 failed attempts
  console.log('\n8) Rate limiting test: 11 failed login attempts');
  const results = [];
  for (let i = 0; i < 11; i++) {
    /* eslint-disable no-await-in-loop */
    const r = await req('POST', '/api/auth/login', { email: 'user@example.com', password: 'WrongPassword' }, { 'Content-Type': 'application/json' });
    results.push(r.status);
  }
  console.log('statuses:', results.join(', '));

  const fs = require('fs');
  const summary = { loginRegular: login, me, listAsReg, loginAdmin, listAsAdmin, register, oauthCreate, oauthAgain, refreshRes, rateStatuses: results };
  fs.writeFileSync('scripts/smoke_result.json', JSON.stringify(summary, null, 2));
  console.log('\nSmoke tests completed and results written to scripts/smoke_result.json');
})();
