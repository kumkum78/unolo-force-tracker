import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

describe('Database Schema and Seed Tests', () => {
  let db;
  const testDbPath = path.join(__dirname, '..', 'test-database.sqlite');

  beforeAll(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    db = new Database(testDbPath);
    db.pragma('foreign_keys = ON');

    // Create tables
    db.exec(`
      CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'employee' CHECK(role IN ('employee', 'manager')),
          manager_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
          status TEXT DEFAULT 'checked_in' CHECK(status IN ('checked_in', 'checked_out'))
      );

      CREATE INDEX idx_checkins_employee ON checkins(employee_id);
      CREATE INDEX idx_checkins_date ON checkins(checkin_time);
      CREATE INDEX idx_employee_clients ON employee_clients(employee_id, client_id);
    `);

    // Insert seed data
    const hashedPassword = bcrypt.hashSync('password123', 10);

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password, role, manager_id) VALUES (?, ?, ?, ?, ?)
    `);

    insertUser.run('Amit Sharma', 'manager@unolo.com', hashedPassword, 'manager', null);
    insertUser.run('Rahul Kumar', 'rahul@unolo.com', hashedPassword, 'employee', 1);
    insertUser.run('Priya Singh', 'priya@unolo.com', hashedPassword, 'employee', 1);
    insertUser.run('Vikram Patel', 'vikram@unolo.com', hashedPassword, 'employee', 1);

    const insertClient = db.prepare(`
      INSERT INTO clients (name, address, latitude, longitude) VALUES (?, ?, ?, ?)
    `);

    insertClient.run('ABC Corp', 'Cyber City, Gurugram', 28.4946, 77.0887);
    insertClient.run('XYZ Ltd', 'Sector 44, Gurugram', 28.4595, 77.0266);
    insertClient.run('Tech Solutions', 'DLF Phase 3, Gurugram', 28.4947, 77.0952);
    insertClient.run('Global Services', 'Udyog Vihar, Gurugram', 28.5011, 77.0838);
    insertClient.run('Innovate Inc', 'Sector 18, Noida', 28.5707, 77.3219);

    const insertAssignment = db.prepare(`
      INSERT INTO employee_clients (employee_id, client_id, assigned_date) VALUES (?, ?, ?)
    `);

    insertAssignment.run(2, 1, '2024-01-01');
    insertAssignment.run(2, 2, '2024-01-01');
    insertAssignment.run(2, 3, '2024-01-15');
    insertAssignment.run(3, 2, '2024-01-01');
    insertAssignment.run(3, 4, '2024-01-01');
    insertAssignment.run(4, 1, '2024-01-10');
    insertAssignment.run(4, 5, '2024-01-10');
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Schema Validation', () => {
    it('should have all 4 required tables', () => {
      const tables = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();

      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('clients');
      expect(tableNames).toContain('employee_clients');
      expect(tableNames).toContain('checkins');
      expect(tableNames.length).toBe(4);
    });

    it('should have all required indexes', () => {
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `).all();

      const indexNames = indexes.map(i => i.name);
      expect(indexNames).toContain('idx_checkins_employee');
      expect(indexNames).toContain('idx_checkins_date');
      expect(indexNames).toContain('idx_employee_clients');
      expect(indexNames.length).toBeGreaterThanOrEqual(3);
    });

    it('should enforce foreign key constraints', () => {
      const foreignKeys = db.pragma('foreign_keys');
      expect(foreignKeys[0].foreign_keys).toBe(1);

      expect(() => {
        db.prepare('INSERT INTO employee_clients (employee_id, client_id, assigned_date) VALUES (?, ?, ?)').run(999, 1, '2024-01-01');
      }).toThrow();
    });
  });

  describe('Seed Data Integrity', () => {
    it('should have exactly 4 users (1 manager, 3 employees)', () => {
      const users = db.prepare('SELECT * FROM users').all();
      expect(users.length).toBe(4);

      const managers = users.filter(u => u.role === 'manager');
      const employees = users.filter(u => u.role === 'employee');

      expect(managers.length).toBe(1);
      expect(employees.length).toBe(3);
    });

    it('should have properly hashed passwords', () => {
      const users = db.prepare('SELECT password FROM users').all();

      users.forEach(user => {
        expect(user.password).toMatch(/^\$2[aby]\$\d{2}\$/);
        const isValid = bcrypt.compareSync('password123', user.password);
        expect(isValid).toBe(true);
      });
    });

    it('should have exactly 5 clients with valid coordinates', () => {
      const clients = db.prepare('SELECT * FROM clients').all();
      expect(clients.length).toBe(5);

      clients.forEach(client => {
        expect(client.latitude).toBeTypeOf('number');
        expect(client.longitude).toBeTypeOf('number');
        expect(client.latitude).toBeGreaterThan(0);
        expect(client.longitude).toBeGreaterThan(0);
      });
    });

    it('should have exactly 7 employee-client assignments', () => {
      const assignments = db.prepare('SELECT * FROM employee_clients').all();
      expect(assignments.length).toBe(7);

      assignments.forEach(assignment => {
        expect(assignment.employee_id).toBeGreaterThan(1);
        expect(assignment.client_id).toBeGreaterThan(0);
        expect(assignment.assigned_date).toBeTruthy();
      });
    });

    it('should validate user email uniqueness', () => {
      expect(() => {
        db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Test User', 'manager@unolo.com', 'hash', 'employee');
      }).toThrow();
    });
  });
});
