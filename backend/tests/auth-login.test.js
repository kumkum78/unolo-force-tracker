import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes after setting env
const authRoutes = require('../routes/auth.js');

describe('Login Endpoint Tests', () => {
  let app;
  const JWT_SECRET = process.env.JWT_SECRET;

  beforeAll(() => {
    // Use the actual database.sqlite that was initialized
    // Set up Express app
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  afterAll(() => {
    // No cleanup needed as we're using the main database
  });

  describe('Valid Login', () => {
    it('should return 200 and token with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'manager@unolo.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
    });

    it('should return user object without password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'rahul@unolo.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('rahul@unolo.com');
      expect(response.body.data.user.name).toBe('Rahul Kumar');
      expect(response.body.data.user.role).toBe('employee');
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should return valid JWT token with correct payload', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'manager@unolo.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      const { token } = response.body.data;
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded.id).toBeDefined();
      expect(decoded.email).toBe('manager@unolo.com');
      expect(decoded.role).toBe('manager');
      expect(decoded.name).toBe('Amit Sharma');
      expect(decoded.password).toBeUndefined(); // Should NOT include password
      expect(decoded.exp).toBeDefined();
    });

    it('should set token expiration to 24 hours', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'priya@unolo.com',
          password: 'password123'
        });

      const { token } = response.body.data;
      const decoded = jwt.verify(token, JWT_SECRET);

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - now;

      // Should be approximately 24 hours (86400 seconds), allow 10 seconds margin
      expect(expiresIn).toBeGreaterThan(86390);
      expect(expiresIn).toBeLessThanOrEqual(86400);
    });
  });

  describe('Invalid Credentials', () => {
    it('should return 401 with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@unolo.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 401 with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'manager@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should not reveal if email exists', async () => {
      const invalidEmailResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'fake@unolo.com', password: 'password123' });

      const invalidPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'manager@unolo.com', password: 'wrongpassword' });

      // Both should return same error message for security
      expect(invalidEmailResponse.body.message).toBe(invalidPasswordResponse.body.message);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email and password required');
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email and password required');
    });

    it('should return 400 when both fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle empty strings as missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: '', password: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Security', () => {
    it('should be safe against SQL injection in email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "' OR '1'='1",
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should be safe against SQL injection in password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'manager@test.com',
          password: "' OR '1'='1"
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
