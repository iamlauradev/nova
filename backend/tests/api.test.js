process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.TEST_DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { app, db } = require('../server');

// ─── Auth state shared across tests ───────────────────────────────────────────
const testUser = { username: 'testuser', name: 'Test User', password: 'securepassword123' };
let token;
let accountId;
let transactionId;
let goalId;
let debtId;

beforeAll(async () => {
  const res = await request(app).post('/auth/register').send(testUser);
  token = res.body.token;
  expect(token).toBeDefined();
});

afterAll(() => {
  db.close();
});

// ─── Auth endpoints ───────────────────────────────────────────────────────────
describe('Auth', () => {
  test('register returns token and user', async () => {
    const res = await request(app).post('/auth/register').send({
      username: 'other_user',
      name: 'Other',
      password: 'password12345',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.username).toBe('other_user');
  });

  test('register rejects duplicate username', async () => {
    const res = await request(app).post('/auth/register').send(testUser);
    expect(res.status).toBe(409);
  });

  test('register rejects username too short', async () => {
    const res = await request(app).post('/auth/register').send({
      username: 'ab', name: 'X', password: 'password123',
    });
    expect(res.status).toBe(400);
  });

  test('login succeeds with valid credentials', async () => {
    const res = await request(app).post('/auth/login').send({
      username: testUser.username,
      password: testUser.password,
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  test('login rejects wrong password', async () => {
    const res = await request(app).post('/auth/login').send({
      username: testUser.username,
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  test('login rejects missing fields', async () => {
    const res = await request(app).post('/auth/login').send({ username: testUser.username });
    expect(res.status).toBe(400);
  });
});

// ─── Accounts ─────────────────────────────────────────────────────────────────
describe('Accounts', () => {
  test('GET /api/accounts requires auth', async () => {
    const res = await request(app).get('/api/accounts');
    expect(res.status).toBe(401);
  });

  test('POST /api/accounts creates account', async () => {
    accountId = `acc_${Date.now()}`;
    const res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: accountId, name: 'Cuenta Test', type: 'checking', balance: 1000, color: '#a855f7' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('POST /api/accounts rejects invalid type', async () => {
    const res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'acc_bad', name: 'Bad', type: 'invalid_type', balance: 0, color: '#000' });
    expect(res.status).toBe(400);
  });

  test('POST /api/accounts rejects name too long', async () => {
    const res = await request(app)
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'acc_long', name: 'A'.repeat(51), type: 'checking', balance: 0, color: '#fff' });
    expect(res.status).toBe(400);
  });

  test('GET /api/accounts returns created account with correct balance', async () => {
    const res = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const acc = res.body.find(a => a.id === accountId);
    expect(acc).toBeDefined();
    expect(acc.balance).toBe(1000);
  });

  test('PUT /api/accounts/:id updates account', async () => {
    const res = await request(app)
      .put(`/api/accounts/${accountId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Cuenta Actualizada', type: 'checking', balance: 1000 });
    expect(res.status).toBe(200);
  });

  test('PUT /api/accounts/:id rejects missing name', async () => {
    const res = await request(app)
      .put(`/api/accounts/${accountId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'checking', balance: 1000 });
    expect(res.status).toBe(400);
  });

  test('PUT /api/accounts/:id rejects invalid type', async () => {
    const res = await request(app)
      .put(`/api/accounts/${accountId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', type: 'not_a_type', balance: 100 });
    expect(res.status).toBe(400);
  });
});

// ─── Transactions ─────────────────────────────────────────────────────────────
describe('Transactions', () => {
  test('POST /api/transactions creates expense and reduces balance', async () => {
    transactionId = `tx_${Date.now()}`;
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        id: transactionId,
        accountId,
        type: 'expense',
        amount: 50,
        description: 'Test expense',
        category: 'food',
        date: new Date().toISOString(),
      });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const accRes = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${token}`);
    const acc = accRes.body.find(a => a.id === accountId);
    expect(acc.balance).toBe(950);
  });

  test('POST /api/transactions rejects negative amount', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: 'tx_bad', accountId, type: 'expense', amount: -10, category: 'food', date: new Date().toISOString() });
    expect(res.status).toBe(400);
  });

  test('GET /api/transactions returns the created transaction', async () => {
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.find(t => t.id === transactionId)).toBeDefined();
  });

  test('PUT /api/transactions/:id rejects missing accountId', async () => {
    const res = await request(app)
      .put(`/api/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'expense', amount: 50, category: 'food', date: new Date().toISOString() });
    expect(res.status).toBe(400);
  });

  test('DELETE /api/transactions/:id reverts balance', async () => {
    const res = await request(app)
      .delete(`/api/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const accRes = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${token}`);
    const acc = accRes.body.find(a => a.id === accountId);
    expect(acc.balance).toBe(1000);
  });
});

// ─── Goals ────────────────────────────────────────────────────────────────────
describe('Goals', () => {
  test('POST /api/goals creates goal', async () => {
    goalId = `goal_${Date.now()}`;
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: goalId, name: 'Vacaciones', targetAmount: 2000, currentAmount: 0 });
    expect(res.status).toBe(200);
  });

  test('PUT /api/goals/:id rejects zero targetAmount', async () => {
    const res = await request(app)
      .put(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Vacaciones', targetAmount: 0 });
    expect(res.status).toBe(400);
  });

  test('PUT /api/goals/:id rejects negative targetAmount', async () => {
    const res = await request(app)
      .put(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Vacaciones', targetAmount: -100 });
    expect(res.status).toBe(400);
  });

  test('DELETE /api/goals/:id removes goal', async () => {
    const res = await request(app)
      .delete(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ─── Debts ────────────────────────────────────────────────────────────────────
describe('Debts', () => {
  test('POST /api/debts creates debt', async () => {
    debtId = `debt_${Date.now()}`;
    const res = await request(app)
      .post('/api/debts')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: debtId, name: 'Préstamo banco', totalAmount: 5000 });
    expect(res.status).toBe(200);
  });

  test('POST /api/debts/:id/pay records payment', async () => {
    const res = await request(app)
      .post(`/api/debts/${debtId}/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 500, accountId, date: new Date().toISOString() });
    expect(res.status).toBe(200);
    expect(res.body.paidAmount).toBe(500);
    expect(res.body.completed).toBe(false);
  });

  test('POST /api/debts/:id/pay rejects non-existent debt', async () => {
    const res = await request(app)
      .post('/api/debts/nonexistent_id/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100, accountId, date: new Date().toISOString() });
    expect(res.status).toBe(404);
  });

  test('DELETE /api/debts/:id removes debt', async () => {
    const res = await request(app)
      .delete(`/api/debts/${debtId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ─── Misc ─────────────────────────────────────────────────────────────────────
describe('Misc', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('Unauthenticated requests get 401', async () => {
    for (const [method, path] of [
      ['get', '/api/accounts'],
      ['get', '/api/transactions'],
      ['get', '/api/goals'],
      ['get', '/api/debts'],
    ]) {
      const res = await request(app)[method](path);
      expect(res.status).toBe(401);
    }
  });
});
