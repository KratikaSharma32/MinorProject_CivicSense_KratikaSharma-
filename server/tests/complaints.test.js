const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../index');
const User = require('../models/User');
const Complaint = require('../models/Complaint');

let citizenToken, adminToken, citizenId, complaintId;

beforeAll(async () => {
  await User.deleteMany({});
  await Complaint.deleteMany({});

  const citizenRes = await request(app).post('/api/auth/register').send({
    name: 'Test Citizen', email: 'citizen@test.com', password: 'password123', role: 'citizen'
  });
  citizenToken = citizenRes.body.token;
  citizenId = citizenRes.body.user.id;

  const adminRes = await request(app).post('/api/auth/register').send({
    name: 'Test Admin', email: 'admin@test.com', password: 'password123', role: 'admin'
  });
  adminToken = adminRes.body.token;
});

afterAll(async () => {
  await User.deleteMany({});
  await Complaint.deleteMany({});
  await mongoose.connection.close();
});

describe('POST /api/complaints', () => {
  it('should create a complaint with valid data', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: 'Large pothole on main road causing accidents',
        description: 'There is a huge dangerous pothole on Civil Lines road that has caused two accidents this week. Needs urgent repair.',
        category: 'road',
        locationAddress: 'Civil Lines, Jabalpur',
        area: 'Civil Lines',
        city: 'Jabalpur'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.complaint.complaintId).toMatch(/^CMP/);
    expect(res.body.complaint.status).toBe('pending');
    complaintId = res.body.complaint._id;
  });

  it('should reject complaint with short title', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ title: 'Short', description: 'This is a long enough description for testing purposes here', category: 'road' });
    expect(res.statusCode).toBe(400);
  });

  it('should reject unauthenticated request', async () => {
    const res = await request(app).post('/api/complaints').send({ title: 'Test complaint', description: 'Description', category: 'road' });
    expect(res.statusCode).toBe(401);
  });

  it('should return AI detection result', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        title: 'Streetlight not working near school',
        description: 'The electricity streetlight pole near Government School has been broken for 2 weeks causing safety issues for children at night',
        category: 'electricity',
        area: 'Gwarighat'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.ai).toBeDefined();
    expect(res.body.ai.detectedCategory).toBeDefined();
  });
});

describe('GET /api/complaints/my', () => {
  it('should return citizen complaints', async () => {
    const res = await request(app).get('/api/complaints/my').set('Authorization', `Bearer ${citizenToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.complaints)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  it('should require authentication', async () => {
    const res = await request(app).get('/api/complaints/my');
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/complaints/:id', () => {
  it('should return complaint for owner', async () => {
    const res = await request(app)
      .get(`/api/complaints/${complaintId}`)
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.complaint._id).toBe(complaintId);
  });

  it('should return 400 for invalid ID', async () => {
    const res = await request(app).get('/api/complaints/invalidid').set('Authorization', `Bearer ${citizenToken}`);
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/complaints/:id/upvote', () => {
  it('should toggle upvote on a complaint', async () => {
    const res = await request(app)
      .post(`/api/complaints/${complaintId}/upvote`)
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.upvotes).toBeDefined();
    expect(['added', 'removed']).toContain(res.body.action);
  });
});

describe('Admin complaint management', () => {
  it('admin should get all complaints', async () => {
    const res = await request(app).get('/api/admin/complaints').set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.complaints)).toBe(true);
  });

  it('admin should update complaint status', async () => {
    const res = await request(app)
      .put(`/api/admin/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'in_progress', note: 'Team dispatched' });
    expect(res.statusCode).toBe(200);
    expect(res.body.complaint.status).toBe('in_progress');
  });

  it('citizen should not access admin routes', async () => {
    const res = await request(app).get('/api/admin/complaints').set('Authorization', `Bearer ${citizenToken}`);
    expect(res.statusCode).toBe(403);
  });

  it('admin should add a response', async () => {
    const res = await request(app)
      .post(`/api/admin/complaints/${complaintId}/respond`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ message: 'Our team will address this within 48 hours' });
    expect(res.statusCode).toBe(200);
    expect(res.body.responses).toBeDefined();
    expect(res.body.responses.length).toBeGreaterThan(0);
  });
});

describe('POST /api/complaints/detect-category', () => {
  it('should detect category from text', async () => {
    const res = await request(app)
      .post('/api/complaints/detect-category')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({ title: 'Broken water pipe', description: 'There is a leaking water pipe on the main road flooding the street' });
    expect(res.statusCode).toBe(200);
    expect(res.body.category).toBeDefined();
    expect(res.body.confidence).toBeGreaterThanOrEqual(0);
  });
});
