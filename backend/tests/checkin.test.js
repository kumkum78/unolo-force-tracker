import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

describe('Check-In System Tests', () => {
  let app;
  let db;
  let employeeToken;
  let managerToken; // Required for role-based testing but not used in employee-specific tests
  let unassignedEmployeeToken;
  const testDbPath = path.join(__dirname, '..', 'test-checkin-database.sqlite');
  const JWT_SECRET = process.env.JWT_SECRET;

  beforeAll(() => {
    // Clean up
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create test database
    db = new Database(testDbPath);
    db.pragma('foreign_keys = ON');

    // Create tables
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'employee',
        manager_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        latitude REAL,
        longitude REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE employee_clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        assigned_date DATE NOT NULL,
        FOREIGN KEY (employee_id) REFERENCES users(id),
        FOREIGN KEY (client_id) REFERENCES clients(id)
      );

      CREATE TABLE checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        checkin_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        checkout_time DATETIME,
        latitude REAL,
        longitude REAL,
        distance_from_client REAL,
        notes TEXT,
        status TEXT DEFAULT 'checked_in'
      );
    `);

    // Insert test data
    const hashedPassword = bcrypt.hashSync('password123', 10);
    
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Manager User', 'manager@test.com', hashedPassword, 'manager');
    db.prepare('INSERT INTO users (name, email, password, role, manager_id) VALUES (?, ?, ?, ?, ?)').run('Employee User', 'employee@test.com', hashedPassword, 'employee', 1);
    db.prepare('INSERT INTO users (name, email, password, role, manager_id) VALUES (?, ?, ?, ?, ?)').run('Unassigned Employee', 'unassigned@test.com', hashedPassword, 'employee', 1);

    // Insert clients (Gurugram locations)
    db.prepare('INSERT INTO clients (name, address, latitude, longitude) VALUES (?, ?, ?, ?)').run('ABC Corp', 'Cyber City, Gurugram', 28.4946, 77.0887);
    db.prepare('INSERT INTO clients (name, address, latitude, longitude) VALUES (?, ?, ?, ?)').run('XYZ Ltd', 'Sector 44, Gurugram', 28.4595, 77.0266);

    // Assign employee to client 1 only
    db.prepare('INSERT INTO employee_clients (employee_id, client_id, assigned_date) VALUES (?, ?, ?)').run(2, 1, '2024-01-01');

    // Mock database module
    const mockPool = {
      execute: (sql, params) => {
        try {
          if (sql.trim().toUpperCase().startsWith('SELECT')) {
            const stmt = db.prepare(sql);
            const rows = stmt.all(...params);
            return Promise.resolve([rows]);
          } else if (sql.trim().toUpperCase().startsWith('INSERT')) {
            const stmt = db.prepare(sql);
            const result = stmt.run(...params);
            return Promise.resolve([{ insertId: result.lastInsertRowid, affectedRows: result.changes }]);
          } else {
            const stmt = db.prepare(sql);
            const result = stmt.run(...params);
            return Promise.resolve([{ affectedRows: result.changes }]);
          }
        } catch (error) {
          return Promise.reject(error);
        }
      }
    };

    require.cache[require.resolve('../config/database')] = {
      exports: mockPool
    };

    // Import routes AFTER setting up the mock
    const checkinRoutes = require('../routes/checkin.js');

    // Generate tokens
    employeeToken = jwt.sign({ id: 2, email: 'employee@test.com', role: 'employee', name: 'Employee User' }, JWT_SECRET, { expiresIn: '24h' });
    managerToken = jwt.sign({ id: 1, email: 'manager@test.com', role: 'manager', name: 'Manager User' }, JWT_SECRET, { expiresIn: '24h' });
    unassignedEmployeeToken = jwt.sign({ id: 3, email: 'unassigned@test.com', role: 'employee', name: 'Unassigned Employee' }, JWT_SECRET, { expiresIn: '24h' });

    // Set up Express app
    app = express();
    app.use(express.json());
    app.use('/api/checkin', checkinRoutes);
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('GET /api/checkin/clients - Get Assigned Clients', () => {
    it('should return assigned clients for employee', async () => {
      const response = await request(app)
        .get('/api/checkin/clients')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].name).toBe('ABC Corp');
    });

    it('should return empty array for unassigned employee', async () => {
      const response = await request(app)
        .get('/api/checkin/clients')
        .set('Authorization', `Bearer ${unassignedEmployeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/checkin/clients');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/checkin - Create Check-In', () => {
    beforeEach(() => {
      // Clean up checkins before each test
      db.prepare('DELETE FROM checkins').run();
    });

    it('should create check-in at assigned client', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          client_id: 1,
          latitude: 28.4946,
          longitude: 77.0887,
          notes: 'Regular visit'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
    });

    it('should calculate and store distance from client', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          client_id: 1,
          latitude: 28.4950, // Slightly different
          longitude: 77.0890,
          notes: 'Test distance'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.distance_from_client).toBeDefined();
      expect(typeof response.body.data.distance_from_client).toBe('number');
    });

    it('should warn when distance > 500m from client', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          client_id: 1,
          latitude: 28.5000, // Far from client (about 700m)
          longitude: 77.0950
        });

      expect(response.status).toBe(201);
      expect(response.body.data.warning).toBeDefined();
      expect(response.body.data.warning).toContain('far from');
    });

    it('should not warn when distance <= 500m', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          client_id: 1,
          latitude: 28.4946, // Exact location
          longitude: 77.0887
        });

      expect(response.status).toBe(201);
      expect(response.body.data.warning).toBeUndefined();
    });

    it('should reject check-in at unassigned client', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          client_id: 2, // Not assigned to this client
          latitude: 28.4595,
          longitude: 77.0266
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not assigned');
    });

    it('should prevent duplicate active check-ins', async () => {
      // First check-in
      await request(app)
        .post('/api/checkin')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          client_id: 1,
          latitude: 28.4946,
          longitude: 77.0887
        });

      // Second check-in (should fail)
      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          client_id: 1,
          latitude: 28.4946,
          longitude: 77.0887
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('active check-in');
    });

    it('should return 400 when client_id is missing', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          latitude: 28.4946,
          longitude: 77.0887
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should handle check-in without notes', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          client_id: 1,
          latitude: 28.4946,
          longitude: 77.0887
        });

      expect(response.status).toBe(201);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/checkin')
        .send({ client_id: 1, latitude: 28.4946, longitude: 77.0887 });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/checkin/checkout - Checkout', () => {
    beforeEach(() => {
      db.prepare('DELETE FROM checkins').run();
    });

    it('should checkout from active check-in', async () => {
      // Create check-in first
      await request(app)
        .post('/api/checkin')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ client_id: 1, latitude: 28.4946, longitude: 77.0887 });

      // Checkout
      const response = await request(app)
        .put('/api/checkin/checkout')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.duration).toBeDefined();
    });

    it('should calculate duration in minutes', async () => {
      // Create check-in
      await request(app)
        .post('/api/checkin')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ client_id: 1, latitude: 28.4946, longitude: 77.0887 });

      // Wait 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Checkout
      const response = await request(app)
        .put('/api/checkin/checkout')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.body.data.duration).toBeGreaterThan(0);
    });

    it('should return 404 when no active check-in exists', async () => {
      const response = await request(app)
        .put('/api/checkin/checkout')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('No active check-in');
    });

    it('should require authentication', async () => {
      const response = await request(app).put('/api/checkin/checkout');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/checkin/history - Check-In History', () => {
    beforeEach(() => {
      db.prepare('DELETE FROM checkins').run();
      
      // Insert historical checkins
      const stmt = db.prepare(`
        INSERT INTO checkins (employee_id, client_id, checkin_time, checkout_time, latitude, longitude, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(2, 1, '2024-01-15 09:00:00', '2024-01-15 11:00:00', 28.4946, 77.0887, 'checked_out');
      stmt.run(2, 1, '2024-01-16 09:00:00', '2024-01-16 12:00:00', 28.4946, 77.0887, 'checked_out');
      stmt.run(2, 1, '2024-01-17 09:00:00', null, 28.4946, 77.0887, 'checked_in');
    });

    it('should return check-in history', async () => {
      const response = await request(app)
        .get('/api/checkin/history')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should include client information', async () => {
      const response = await request(app)
        .get('/api/checkin/history')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.body.data[0].client_name).toBeDefined();
      expect(response.body.data[0].client_address).toBeDefined();
    });

    it('should filter by start_date', async () => {
      const response = await request(app)
        .get('/api/checkin/history?start_date=2024-01-16')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by end_date', async () => {
      const response = await request(app)
        .get('/api/checkin/history?end_date=2024-01-16')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/checkin/history?start_date=2024-01-15&end_date=2024-01-16')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array for employee with no history', async () => {
      const response = await request(app)
        .get('/api/checkin/history')
        .set('Authorization', `Bearer ${unassignedEmployeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/checkin/history');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/checkin/active - Active Check-In', () => {
    beforeEach(() => {
      db.prepare('DELETE FROM checkins').run();
    });

    it('should return active check-in when exists', async () => {
      // Create check-in
      await request(app)
        .post('/api/checkin')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ client_id: 1, latitude: 28.4946, longitude: 77.0887 });

      // Get active
      const response = await request(app)
        .get('/api/checkin/active')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).not.toBeNull();
      expect(response.body.data.client_name).toBe('ABC Corp');
    });

    it('should return null when no active check-in', async () => {
      const response = await request(app)
        .get('/api/checkin/active')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeNull();
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/checkin/active');
      expect(response.status).toBe(401);
    });
  });
});
