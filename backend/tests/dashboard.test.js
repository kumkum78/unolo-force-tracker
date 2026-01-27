import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

describe('Dashboard & Reports Tests', () => {
  let app;
  let db;
  let managerToken;
  let employeeToken;
  const testDbPath = path.join(__dirname, '..', 'test-dashboard-database.sqlite');
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
    
    // Insert manager (id=1)
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Manager User', 'manager@test.com', hashedPassword, 'manager');
    
    // Insert employees under manager (id=2,3,4)
    db.prepare('INSERT INTO users (name, email, password, role, manager_id) VALUES (?, ?, ?, ?, ?)').run('Employee One', 'emp1@test.com', hashedPassword, 'employee', 1);
    db.prepare('INSERT INTO users (name, email, password, role, manager_id) VALUES (?, ?, ?, ?, ?)').run('Employee Two', 'emp2@test.com', hashedPassword, 'employee', 1);
    db.prepare('INSERT INTO users (name, email, password, role, manager_id) VALUES (?, ?, ?, ?, ?)').run('Employee Three', 'emp3@test.com', hashedPassword, 'employee', 1);
    
    // Insert another manager's employee (id=5)
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Other Manager', 'manager2@test.com', hashedPassword, 'manager');
    db.prepare('INSERT INTO users (name, email, password, role, manager_id) VALUES (?, ?, ?, ?, ?)').run('Other Employee', 'other@test.com', hashedPassword, 'employee', 5);

    // Insert clients
    db.prepare('INSERT INTO clients (name, address, latitude, longitude) VALUES (?, ?, ?, ?)').run('Client A', 'Location A', 28.4946, 77.0887);
    db.prepare('INSERT INTO clients (name, address, latitude, longitude) VALUES (?, ?, ?, ?)').run('Client B', 'Location B', 28.4595, 77.0266);
    db.prepare('INSERT INTO clients (name, address, latitude, longitude) VALUES (?, ?, ?, ?)').run('Client C', 'Location C', 28.5000, 77.0900);

    // Assign clients to employees
    db.prepare('INSERT INTO employee_clients (employee_id, client_id, assigned_date) VALUES (?, ?, ?)').run(2, 1, '2024-01-01');
    db.prepare('INSERT INTO employee_clients (employee_id, client_id, assigned_date) VALUES (?, ?, ?)').run(3, 2, '2024-01-01');
    db.prepare('INSERT INTO employee_clients (employee_id, client_id, assigned_date) VALUES (?, ?, ?)').run(4, 3, '2024-01-01');

    // Insert checkins for today
    const today = new Date().toISOString().split('T')[0];
    db.prepare('INSERT INTO checkins (employee_id, client_id, checkin_time, checkout_time, latitude, longitude, distance_from_client, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(2, 1, `${today} 09:00:00`, `${today} 11:00:00`, 28.4946, 77.0887, 0.05, 'checked_out');
    db.prepare('INSERT INTO checkins (employee_id, client_id, checkin_time, checkout_time, latitude, longitude, distance_from_client, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(2, 1, `${today} 14:00:00`, null, 28.4946, 77.0887, 0.05, 'checked_in');
    db.prepare('INSERT INTO checkins (employee_id, client_id, checkin_time, checkout_time, latitude, longitude, distance_from_client, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(3, 2, `${today} 10:00:00`, `${today} 12:30:00`, 28.4595, 77.0266, 0.1, 'checked_out');
    
    // Insert checkins for yesterday
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    db.prepare('INSERT INTO checkins (employee_id, client_id, checkin_time, checkout_time, latitude, longitude, distance_from_client, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(2, 1, `${yesterday} 09:00:00`, `${yesterday} 17:00:00`, 28.4946, 77.0887, 0.05, 'checked_out');

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

    // Load routes after mocking database
    const dashboardRoutes = require('../routes/dashboard.js');
    const reportsRoutes = require('../routes/reports.js');

    // Generate tokens
    managerToken = jwt.sign({ id: 1, email: 'manager@test.com', role: 'manager', name: 'Manager User' }, JWT_SECRET, { expiresIn: '24h' });
    employeeToken = jwt.sign({ id: 2, email: 'emp1@test.com', role: 'employee', name: 'Employee One' }, JWT_SECRET, { expiresIn: '24h' });

    // Set up Express app
    app = express();
    app.use(express.json());
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/reports', reportsRoutes);
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('GET /api/dashboard/stats - Team Statistics', () => {
    it('should return team statistics for manager', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalEmployees).toBe(3); // 3 employees under this manager
      expect(response.body.data.activeCheckins).toBe(1); // 1 active check-in
      expect(response.body.data.todayCheckins).toBe(3); // 3 check-ins today
    });

    it('should return 403 for employee role', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/dashboard/stats');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/dashboard/employee - Employee Details', () => {
    it('should return employee details for team member', async () => {
      const response = await request(app)
        .get('/api/dashboard/employee?id=2')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.employee).toBeDefined();
      expect(response.body.data.employee.name).toBe('Employee One');
      expect(response.body.data.checkins).toBeInstanceOf(Array);
      expect(response.body.data.totalHours).toBeGreaterThan(0);
      expect(response.body.data.clients).toBeInstanceOf(Array);
    });

    it('should return 403 when viewing non-team member', async () => {
      const response = await request(app)
        .get('/api/dashboard/employee?id=6') // Other manager's employee
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('team members');
    });

    it('should return 400 when employee ID is missing', async () => {
      const response = await request(app)
        .get('/api/dashboard/employee')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should return 403 for employee role', async () => {
      const response = await request(app)
        .get('/api/dashboard/employee?id=2')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });

    it('should include check-in details with duration', async () => {
      const response = await request(app)
        .get('/api/dashboard/employee?id=2')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      const checkins = response.body.data.checkins;
      const completedCheckin = checkins.find(c => c.checkout_time);
      expect(completedCheckin).toBeDefined();
      expect(completedCheckin.duration_minutes).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/dashboard/employee?id=2');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/reports/daily-summary - Daily Summary Report', () => {
    it('should return daily summary for today', async () => {
      const response = await request(app)
        .get('/api/reports/daily-summary')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.teamSummary).toBeDefined();
      expect(response.body.data.teamSummary.employeesActive).toBeGreaterThan(0);
      expect(response.body.data.teamSummary.totalCheckins).toBe(3);
      expect(response.body.data.employeeBreakdown).toBeInstanceOf(Array);
      expect(response.body.data.employeeBreakdown.length).toBe(3); // All team members
    });

    it('should return summary for specific date', async () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const response = await request(app)
        .get(`/api/reports/daily-summary?date=${yesterday}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.date).toBe(yesterday);
      expect(response.body.data.teamSummary.totalCheckins).toBe(1);
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .get('/api/reports/daily-summary?date=invalid-date')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid date format');
    });

    it('should return 400 for future date', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const response = await request(app)
        .get(`/api/reports/daily-summary?date=${tomorrow}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('future dates');
    });

    it('should include all team members even with no activity', async () => {
      const response = await request(app)
        .get('/api/reports/daily-summary')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      const breakdown = response.body.data.employeeBreakdown;
      expect(breakdown.length).toBe(3); // All 3 team members
      
      // Employee 4 has no check-ins today
      const inactiveEmployee = breakdown.find(e => e.employeeId === 4);
      expect(inactiveEmployee).toBeDefined();
      expect(inactiveEmployee.checkinsCount).toBe(0);
    });

    it('should calculate hours worked correctly', async () => {
      const response = await request(app)
        .get('/api/reports/daily-summary')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.teamSummary.totalHoursWorked).toBeGreaterThan(0);
    });

    it('should return 403 for employee role', async () => {
      const response = await request(app)
        .get('/api/reports/daily-summary')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/reports/daily-summary');
      expect(response.status).toBe(401);
    });

    it('should handle date with no data gracefully', async () => {
      const response = await request(app)
        .get('/api/reports/daily-summary?date=2020-01-01')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.teamSummary.totalCheckins).toBe(0);
      expect(response.body.data.teamSummary.employeesActive).toBe(0);
    });

    it('should optimize SQL and avoid N+1 queries', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/reports/daily-summary')
        .set('Authorization', `Bearer ${managerToken}`);

      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(200); // Should be fast with optimized queries
    });
  });
});
