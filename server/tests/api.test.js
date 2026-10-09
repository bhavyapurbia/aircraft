const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

test.after(async () => {
  await pool.end();
});

test('API Health: returns 200 and healthy status', async () => {
  const res = await request(app).get('/api/health');
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.status, 'healthy');
  assert.strictEqual(res.body.system, 'AIR POWER - Dynamic Air Operations & Resource Optimisation');
});

test('Auth: rejects login with invalid credentials', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'WrongPassword999' });

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.success, false);
});

test('Auth: allows valid login for administrator', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'Admin@12345' });

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.token, 'Should return JWT token');
  assert.strictEqual(res.body.user.role_name, 'Administrator');
});

test('RBAC: restricts audit log access to Administrator role only', async () => {
  // Login as Viewer
  const viewerLogin = await request(app)
    .post('/api/auth/login')
    .send({ username: 'viewer', password: 'Viewer@12345' });

  const viewerToken = viewerLogin.body.token;

  // Attempt to access audit logs with Viewer token
  const res = await request(app)
    .get('/api/audit-logs')
    .set('Authorization', `Bearer ${viewerToken}`);

  assert.strictEqual(res.statusCode, 403);
  assert.strictEqual(res.body.success, false);
});
