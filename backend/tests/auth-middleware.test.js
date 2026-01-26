import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

// Then import middleware
const authMiddleware = require('../middleware/auth');
const { authenticateToken, requireManager } = authMiddleware;

describe('Authentication Middleware Tests', () => {
  let app;
  const JWT_SECRET = process.env.JWT_SECRET;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Test routes
    app.get('/protected', authenticateToken, (req, res) => {
      res.json({ success: true, user: req.user });
    });
    
    app.get('/manager-only', authenticateToken, requireManager, (req, res) => {
      res.json({ success: true, message: 'Manager access granted' });
    });
  });

  describe('Token Verification', () => {
    it('should attach user to req.user with valid token', async () => {
      const token = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'employee', name: 'Test User' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(1);
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 401 when token is missing', async () => {
      const response = await request(app).get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('token required');
    });

    it('should return 403 with invalid token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token-123');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired');
    });

    it('should return 403 with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'employee' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should handle malformed authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Role Authorization', () => {
    it('should allow manager access to manager-only route', async () => {
      const managerToken = jwt.sign(
        { id: 1, email: 'manager@example.com', role: 'manager', name: 'Manager' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const response = await request(app)
        .get('/manager-only')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should deny employee access to manager-only route', async () => {
      const employeeToken = jwt.sign(
        { id: 2, email: 'employee@example.com', role: 'employee', name: 'Employee' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const response = await request(app)
        .get('/manager-only')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Manager access required');
    });
  });
});
