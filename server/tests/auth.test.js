const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../index');
const User = require('../models/User');

// Setup / teardown
beforeEach(async () => { await User.deleteMany({}); });
afterAll(async () => { await mongoose.connection.close(); });

describe('POST /api/auth/register', () => {
  const validUser = {
    name: 'Test Citizen',
    email: 'test@example.com',
    password: 'password123',
    role: 'citizen'
  };

  it('should register a new citizen user', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.role).toBe('citizen');
  });

  it('should reject duplicate email', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already registered/i);
  });

  it('should reject short password', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validUser, password: '123' });
    expect(res.statusCode).toBe(400);
  });

  it('should reject invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validUser, email: 'notanemail' });
    expect(res.statusCode).toBe(400);
  });

  it('should reject missing name', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: validUser.email, password: validUser.password });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Test User', email: 'login@example.com', password: 'password123'
    });
  });

  it('should login with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: 'password123' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('should reject wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: 'wrongpassword' });
    expect(res.statusCode).toBe(401);
  });

  it('should reject non-existent user', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'password123' });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let token;

  beforeEach(async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Me Test', email: 'me@example.com', password: 'password123'
    });
    token = res.body.token;
  });

  it('should return current user with valid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe('me@example.com');
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('should return 401 with invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalidtoken');
    expect(res.statusCode).toBe(401);
  });
});
