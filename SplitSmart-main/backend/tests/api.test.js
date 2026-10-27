const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('SplitSmart Full API Integration Test Suite', () => {
  let aliceToken;
  let aliceCookie;
  let aliceId;

  let bobToken;
  let bobCookie;
  let bobId;

  let charlieCookie;
  let charlieId;

  let testGroupId;
  let expense1Id;

  describe('1. Authentication Flow', () => {
    test('registers Alice successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice Sharma',
          email: 'alice@test.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toHaveProperty('email', 'alice@test.com');
      expect(res.body.user).not.toHaveProperty('password');
      aliceId = res.body.user._id;

      // Capture cookie and token
      aliceCookie = res.headers['set-cookie'];
      aliceToken = res.body.token;
    });

    test('rejects duplicate registration with identical email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice Fake',
          email: 'alice@test.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    test('registers Bob and Charlie', async () => {
      const resBob = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Bob Verma',
          email: 'bob@test.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });
      expect(resBob.status).toBe(201);
      bobId = resBob.body.user._id;
      bobCookie = resBob.headers['set-cookie'];
      bobToken = resBob.body.token;

      const resCharlie = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Charlie Patel',
          email: 'charlie@test.com',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        });
      expect(resCharlie.status).toBe(201);
      charlieId = resCharlie.body.user._id;
      charlieCookie = resCharlie.headers['set-cookie'];
    });

    test('logs in Alice with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@test.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe('Alice Sharma');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    test('rejects login with wrong password without leaking sensitive details', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice@test.com',
          password: 'WrongPassword!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid email or password/);
    });

    test('unauthenticated request to private route returns 401', async () => {
      const res = await request(app).get('/api/groups');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Group Management & Authorization', () => {
    test('Alice creates a group "Goa Trip"', async () => {
      const res = await request(app)
        .post('/api/groups')
        .set('Cookie', aliceCookie)
        .send({
          name: 'Goa Trip',
          description: 'Fun weekend beach trip',
          type: 'Trip',
          currency: 'INR'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.group.name).toBe('Goa Trip');
      expect(res.body.group.members).toHaveLength(1);
      testGroupId = res.body.group._id;
    });

    test('Alice adds Bob to "Goa Trip"', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/members`)
        .set('Cookie', aliceCookie)
        .send({ email: 'bob@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.group.members.some((m) => m.email === 'bob@test.com')).toBe(true);
    });

    test('Charlie (non-member) cannot access group details (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/groups/${testGroupId}`)
        .set('Cookie', charlieCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/);
    });

    test('Alice adds Charlie so all three are members', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/members`)
        .set('Cookie', aliceCookie)
        .send({ email: 'charlie@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.group.members).toHaveLength(3);
    });
  });

  describe('3. Expense Management & Validation', () => {
    test('Alice records ₹900 expense split equally among Alice, Bob, Charlie', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/expenses`)
        .set('Cookie', aliceCookie)
        .send({
          title: 'Villa Stay',
          amount: 900,
          category: 'Accommodation',
          paidBy: aliceId,
          participants: [aliceId, bobId, charlieId],
          splitMethod: 'EQUAL'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.expense.amountMinor).toBe(90000); // 900 * 100
      expect(res.body.expense.participants).toHaveLength(3);
      // Each gets 30000 minor units
      res.body.expense.participants.forEach((p) => {
        expect(p.shareMinor).toBe(30000);
      });
      expense1Id = res.body.expense._id;
    });

    test('rejects expense if payer is not in the group', async () => {
      const fakePayerId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/expenses`)
        .set('Cookie', aliceCookie)
        .send({
          title: 'Invalid Expense',
          amount: 500,
          category: 'Food',
          paidBy: fakePayerId.toString(),
          participants: [aliceId, bobId],
          splitMethod: 'EQUAL'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('rejects exact split where shares do not sum to total', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/expenses`)
        .set('Cookie', aliceCookie)
        .send({
          title: 'Faulty Lunch',
          amountMinor: 10000,
          category: 'Food',
          paidBy: aliceId,
          participants: [
            { user: aliceId, shareMinor: 4000 },
            { user: bobId, shareMinor: 5000 } // sum = 9000 != 10000!
          ],
          splitMethod: 'EXACT'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Balances & Settlement Engine Integration', () => {
    test('correctly calculates balances after ₹900 expense', async () => {
      const res = await request(app)
        .get(`/api/groups/${testGroupId}/balances`)
        .set('Cookie', aliceCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const balances = res.body.balances;
      const alice = balances.find((b) => b.userId === aliceId);
      const bob = balances.find((b) => b.userId === bobId);
      const charlie = balances.find((b) => b.userId === charlieId);

      // Alice is owed ₹600 (60000 minor units)
      expect(alice.netBalanceMinor).toBe(60000);
      // Bob owes ₹300 (-30000 minor units)
      expect(bob.netBalanceMinor).toBe(-30000);
      // Charlie owes ₹300 (-30000 minor units)
      expect(charlie.netBalanceMinor).toBe(-30000);

      // Net sum must be zero
      const netSum = balances.reduce((sum, b) => sum + b.netBalanceMinor, 0);
      expect(netSum).toBe(0);
    });

    test('generates optimal settlement plan: Bob pays Alice ₹300, Charlie pays Alice ₹300', async () => {
      const res = await request(app)
        .get(`/api/groups/${testGroupId}/settlement-plan`)
        .set('Cookie', aliceCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const plan = res.body.settlementPlan;
      expect(plan).toHaveLength(2);

      const bobPayment = plan.find((p) => p.payerId === bobId);
      expect(bobPayment).toBeDefined();
      expect(bobPayment.recipientId).toBe(aliceId);
      expect(bobPayment.amountMinor).toBe(30000);

      const charliePayment = plan.find((p) => p.payerId === charlieId);
      expect(charliePayment).toBeDefined();
      expect(charliePayment.recipientId).toBe(aliceId);
      expect(charliePayment.amountMinor).toBe(30000);
    });

    test('records settlement: Bob repays Alice ₹300 (30000 minor units)', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/settlements`)
        .set('Cookie', bobCookie)
        .send({
          payerId: bobId,
          recipientId: aliceId,
          amountMinor: 30000,
          note: 'Settled via UPI',
          idempotencyKey: 'idem-test-key-1'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.settlement.amountMinor).toBe(30000);
      expect(res.body.settlement.status).toBe('completed');

      // Balances returned should show Bob now at 0 net balance!
      const bobBal = res.body.balances.find((b) => b.userId === bobId);
      expect(bobBal.netBalanceMinor).toBe(0);

      // Alice now owed 30000
      const aliceBal = res.body.balances.find((b) => b.userId === aliceId);
      expect(aliceBal.netBalanceMinor).toBe(30000);
    });

    test('duplicate settlement with same idempotencyKey is handled without double-charging', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroupId}/settlements`)
        .set('Cookie', bobCookie)
        .send({
          payerId: bobId,
          recipientId: aliceId,
          amountMinor: 30000,
          idempotencyKey: 'idem-test-key-1'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/already recorded/);
    });

    test('rejects deleting or modifying an expense after settlements exist (financial audit integrity)', async () => {
      const res = await request(app)
        .delete(`/api/expenses/${expense1Id}`)
        .set('Cookie', aliceCookie);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Cannot modify or delete expenses after settlements/);
    });
  });

  describe('5. Health Endpoint & Logout', () => {
    test('health endpoint reports healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.product).toBe('SplitSmart API');
    });

    test('logout clears cookie and invalidates session', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });
});
