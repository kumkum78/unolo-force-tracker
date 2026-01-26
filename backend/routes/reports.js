const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Get daily summary report (manager only)
router.get('/daily-summary', authenticateToken, requireManager, async (req, res) => {
    try {
        const managerId = req.user.id;
        const { date } = req.query;
        
        // Default to today if no date provided
        const reportDate = date || new Date().toISOString().split('T')[0];
        
        // Validate date format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid date format. Use YYYY-MM-DD' 
            });
        }
        
        // Check if date is in the future
        const today = new Date().toISOString().split('T')[0];
        if (reportDate > today) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot generate reports for future dates' 
            });
        }
        
        // Get team summary for the day (single optimized query)
        const [teamSummary] = await pool.execute(
            `SELECT 
                COUNT(DISTINCT ch.employee_id) as employeesActive,
                COUNT(*) as totalCheckins,
                COUNT(DISTINCT ch.client_id) as uniqueClients,
                ROUND(SUM(
                    CASE 
                        WHEN ch.checkout_time IS NOT NULL 
                        THEN (julianday(ch.checkout_time) - julianday(ch.checkin_time)) * 24
                        ELSE 0
                    END
                ), 2) as totalHoursWorked,
                ROUND(AVG(ch.distance_from_client), 2) as avgDistance
             FROM checkins ch
             INNER JOIN users u ON ch.employee_id = u.id
             WHERE u.manager_id = ? AND DATE(ch.checkin_time) = ?`,
            [managerId, reportDate]
        );
        
        // Get per-employee breakdown (single optimized query with all details)
        const [employeeBreakdown] = await pool.execute(
            `SELECT 
                u.id as employeeId,
                u.name as employeeName,
                u.email as employeeEmail,
                COUNT(ch.id) as checkinsCount,
                COUNT(DISTINCT ch.client_id) as clientsVisited,
                ROUND(SUM(
                    CASE 
                        WHEN ch.checkout_time IS NOT NULL 
                        THEN (julianday(ch.checkout_time) - julianday(ch.checkin_time)) * 24
                        ELSE 0
                    END
                ), 2) as hoursWorked,
                MIN(ch.checkin_time) as firstCheckin,
                MAX(COALESCE(ch.checkout_time, ch.checkin_time)) as lastActivity,
                ROUND(AVG(ch.distance_from_client), 2) as avgDistance
             FROM users u
             LEFT JOIN checkins ch ON u.id = ch.employee_id 
                AND DATE(ch.checkin_time) = ?
             WHERE u.manager_id = ? AND u.role = 'employee'
             GROUP BY u.id, u.name, u.email
             ORDER BY checkinsCount DESC, u.name`,
            [reportDate, managerId]
        );
        
        res.json({
            success: true,
            data: {
                date: reportDate,
                teamSummary: {
                    employeesActive: teamSummary[0].employeesActive || 0,
                    totalCheckins: teamSummary[0].totalCheckins || 0,
                    uniqueClients: teamSummary[0].uniqueClients || 0,
                    totalHoursWorked: teamSummary[0].totalHoursWorked || 0,
                    avgDistance: teamSummary[0].avgDistance || 0
                },
                employeeBreakdown: employeeBreakdown.map(emp => ({
                    employeeId: emp.employeeId,
                    employeeName: emp.employeeName,
                    employeeEmail: emp.employeeEmail,
                    checkinsCount: emp.checkinsCount || 0,
                    clientsVisited: emp.clientsVisited || 0,
                    hoursWorked: emp.hoursWorked || 0,
                    firstCheckin: emp.firstCheckin,
                    lastActivity: emp.lastActivity,
                    avgDistance: emp.avgDistance || 0
                }))
            }
        });
    } catch (error) {
        console.error('Daily summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate daily summary' });
    }
});

module.exports = router;
