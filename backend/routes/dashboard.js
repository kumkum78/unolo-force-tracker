const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Get dashboard stats for manager
router.get('/stats', authenticateToken, requireManager, async (req, res) => {
    try {
        const managerId = req.user.id;
        
        // Get total employees under this manager (single optimized query)
        const [employees] = await pool.execute(
            'SELECT COUNT(*) as total FROM users WHERE manager_id = ? AND role = \'employee\'',
            [managerId]
        );
        
        // Get active check-ins for team members (single query with JOIN)
        const [activeCheckins] = await pool.execute(
            `SELECT COUNT(*) as count 
             FROM checkins ch
             INNER JOIN users u ON ch.employee_id = u.id
             WHERE u.manager_id = ? AND ch.status = \'checked_in\'`,
            [managerId]
        );
        
        // Get today's check-ins for team members (single query with JOIN)
        const [todayCheckins] = await pool.execute(
            `SELECT COUNT(*) as count 
             FROM checkins ch
             INNER JOIN users u ON ch.employee_id = u.id
             WHERE u.manager_id = ? AND DATE(ch.checkin_time) = DATE(CURRENT_TIMESTAMP)`,
            [managerId]
        );
        
        res.json({
            success: true,
            data: {
                totalEmployees: employees[0].total,
                activeCheckins: activeCheckins[0].count,
                todayCheckins: todayCheckins[0].count
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
    }
});

// Get employee details (manager only - view team member details)
router.get('/employee', authenticateToken, requireManager, async (req, res) => {
    try {
        const managerId = req.user.id;
        const { id } = req.query;
        
        if (!id) {
            return res.status(400).json({ success: false, message: 'Employee ID is required' });
        }
        
        // Verify employee belongs to this manager
        const [employees] = await pool.execute(
            'SELECT id, name, email, role FROM users WHERE id = ? AND manager_id = ?',
            [id, managerId]
        );
        
        if (employees.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'You can only view your team members' 
            });
        }
        
        // Get employee check-ins with client info (optimized single query)
        const [checkins] = await pool.execute(
            `SELECT 
                ch.id,
                ch.checkin_time,
                ch.checkout_time,
                ch.status,
                ch.distance_from_client,
                ch.notes,
                c.name as client_name,
                c.address as client_address,
                CASE 
                    WHEN ch.checkout_time IS NOT NULL 
                    THEN ROUND((julianday(ch.checkout_time) - julianday(ch.checkin_time)) * 24 * 60)
                    ELSE NULL
                END as duration_minutes
             FROM checkins ch
             INNER JOIN clients c ON ch.client_id = c.id
             WHERE ch.employee_id = ?
             ORDER BY ch.checkin_time DESC
             LIMIT 50`,
            [id]
        );
        
        // Calculate total hours worked (from completed check-ins)
        const [hoursData] = await pool.execute(
            `SELECT 
                ROUND(SUM(
                    CASE 
                        WHEN checkout_time IS NOT NULL 
                        THEN (julianday(checkout_time) - julianday(checkin_time)) * 24
                        ELSE 0
                    END
                ), 2) as total_hours
             FROM checkins
             WHERE employee_id = ?`,
            [id]
        );
        
        // Get assigned clients (optimized single query)
        const [clients] = await pool.execute(
            `SELECT c.id, c.name, c.address, c.latitude, c.longitude
             FROM clients c
             INNER JOIN employee_clients ec ON c.id = ec.client_id
             WHERE ec.employee_id = ?`,
            [id]
        );
        
        res.json({
            success: true,
            data: {
                employee: employees[0],
                checkins: checkins,
                totalHours: hoursData[0].total_hours || 0,
                clients: clients
            }
        });
    } catch (error) {
        console.error('Employee details error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch employee details' });
    }
});

module.exports = router;
