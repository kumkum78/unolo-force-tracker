# Development Notes

Quick notes I kept while building this project.

## Timeline

Worked on this over 2-3 days. Spent most time on:
- Fixing bugs in the starter code (took a while to find them all)
- Writing tests to get good coverage
- Making the frontend responsive

## Approach

1. **Started with backend** - Got all APIs working first, wrote tests as I went
2. **Fixed bugs** - Found 10 issues in the starter code (auth bugs, SQL issues, etc.)
3. **Built frontend** - Created the UI, hooked up to APIs
4. **Testing** - Wrote unit tests for both backend and frontend
5. **Polish** - Added error handling, validation, better UX

## Things I learned

- GPS distance calculation with Haversine formula
- Proper JWT token handling (expiry, refresh, etc.)
- React Context API for state management
- Vitest for testing (similar to Jest but faster)

## Test Coverage

Backend: 91.81% (87 tests)
Frontend: 95.43% (38 tests)

Could be higher but focused on testing important logic rather than hitting 100%.

## Challenges

1. **Async bug in auth** - The starter code was missing `await` on password check. Took me a bit to catch this.
2. **SQL injection** - Date filters weren't parameterized. Fixed using proper prepared statements.
3. **GPS accuracy** - Had to research Haversine formula to calculate distances correctly.
4. **Session persistence** - Took some trial to get JWT storage working right with React Router.

## What I'd improve with more time

- Add WebSocket for real-time updates
- Better error messages for users
- More detailed manager reports
- Export data to CSV/Excel
- Push notifications for check-ins
- Offline mode with sync when back online

   - ✅ Login endpoint tests (13 tests):
     - Valid credentials flow
     - Invalid credentials handling
     - Input validation (missing/empty fields)
     - JWT token payload validation
     - 24-hour token expiration
     - Security (SQL injection protection)

4. **Profile Endpoint**
   - ✅ Refactored GET /api/auth/me to use authenticateToken middleware
   - ✅ Proper error handling
   - ✅ Returns user data without password

5. **Middleware Application**
   - ✅ Auth middleware already applied to checkin routes
   - ✅ Auth middleware already applied to dashboard routes
   - ✅ requireManager middleware protecting manager-only endpoints

### ✅ Test Results

**All 28/28 Tests Passing! 🎉**
- ✅ Phase 1: 8 tests (database)
- ✅ Phase 2: 20 tests (7 middleware + 13 login)
- ✅ All authentication flows working correctly
- ✅ JWT tokens expire in 24 hours
- ✅ Role-based access control enforced
- ✅ SQL injection protection verified

### 📝 Implementation Details

**JWT Configuration:**
- Secret: Loaded from .env file
- Expiration: 24 hours (86400 seconds)
- Payload: {id, email, role, name} - NO sensitive data

**Password Hashing:**
- Library: bcryptjs (pure JavaScript)
- Salt Rounds: 10
- Works on all platforms without compilation

**API Endpoints:**
- POST /api/auth/login - ✅ Working
- GET /api/auth/me - ✅ Working

### 🐛 Bugs Found & Fixed (Phase 2)

1. **Bug #1:** Missing `await` on bcrypt.compare() → Login failures ✅ Fixed
2. **Bug #2:** Password in JWT token → Security risk ✅ Fixed
3. **Bug #3:** bcrypt vs bcryptjs → Compatibility issue ✅ Fixed
4. **Bug #4:** Empty string validation → Input validation ✅ Fixed
5. **Bug #5:** Wrong HTTP 200 status → Should be 400 ✅ Fixed

---

## 🎯 Phase 1: Project Foundation & Database (Day 1)

**Status:** ✅ Complete  
**Progress:** 100%  
**Started:** January 26, 2026 - 10:30 AM IST  
**Completed:** January 26, 2026 - 3:15 PM IST

### ✅ Completed Tasks

1. **Testing Framework Setup**
   - ✅ Added Vitest + Supertest to backend package.json
   - ✅ Added Vitest + React Testing Library to frontend package.json
   - ✅ Created backend vitest.config.js
   - ✅ Created frontend vitest.config.js with jsdom environment
   - ✅ Created frontend test setup file
   - ✅ Replaced bcrypt with bcryptjs (pure JS, no compilation)

2. **Database Tests Created (8/8)**
   - ✅ Test 1: Schema validation - all 4 tables exist
   - ✅ Test 2: Index creation verification
   - ✅ Test 3: Foreign key constraint enforcement
   - ✅ Test 4: Seed data user count (1 manager, 3 employees)
   - ✅ Test 5: Password hashing validation (bcrypt)
   - ✅ Test 6: Client coordinates validation (5 clients)
   - ✅ Test 7: Employee-client assignments (7 assignments)
   - ✅ Test 8: User email uniqueness constraint

3. **Documentation**
   - ✅ Created DEVELOPMENT.md with progress tracking system
   - ✅ Created BUG_FIXES.md starter document
   - ✅ Created ENVIRONMENT_SETUP.md with workaround instructions
✅ Environment Resolution

**Solution Applied:** Downgraded from Node.js v24.11.0 → v20.20.0
- ✅ bcrypt → bcryptjs (pure JavaScript)
- ✅ better-sqlite3 installed successfully with prebuilt binaries
- ✅ All dependencies installed without compilation issues

### ✅ Test Results

**All 8 Tests Passing! 🎉**
- ✅ Schema validation - 4 tables exist
- ✅ Index creation verified
- ✅ Foreign key constraints enforced
- ✅ 4 users seeded (1 manager, 3 employees)
- ✅ Password hashing validated (bcryptjs)
- ✅ 5 clients with valid coordinates
- ✅ 7 employee-client assignments
- ✅ Email uniqueness constraint workingtory
- Create initial commit

---

## 🎯 Phase 3: Employee Check-In System (Day 1)

**Status:** ✅ Complete  
**Progress:** 100%  
**Started:** January 26, 2026 - 11:25 AM IST  
**Completed:** January 26, 2026 - 3:32 PM IST

### ✅ Completed Tasks

1. **Distance Calculation Utility**
   - ✅ Implemented Haversine formula for GPS distance calculation
   - ✅ Accuracy to 2 decimal places (in kilometers)
   - ✅ Warning logic for >500m threshold
   - ✅ Created `backend/utils/distance.js`

2. **Bug Fixes Implemented**
   - ✅ Bug #5: Fixed wrong status code (200→400) for validation errors
   - ✅ Bug #6: Fixed column name mismatch (lat/lng → latitude/longitude) - HIGH
   - ✅ Bug #7: Fixed SQL injection in history endpoint with parameterized queries - HIGH
   - ✅ Bug #8: Fixed SQLite syntax (NOW() → CURRENT_TIMESTAMP, double quotes → single quotes) - CRITICAL

3. **Check-In Routes Implementation**
   - ✅ GET /api/checkin/clients - Fetch assigned clients
   - ✅ POST /api/checkin - Create check-in with distance calculation
   - ✅ PUT /api/checkin/checkout - Complete check-in with duration
   - ✅ GET /api/checkin/history - Fetch check-in history with date filters
   - ✅ GET /api/checkin/active - Get current active check-in

4. **Test Suite (40 tests)**
   - ✅ Distance calculation tests (14 tests):
     - Haversine formula accuracy (8 tests)
     - Distance warning logic (6 tests)
   - ✅ Check-in flow tests (26 tests):
     - Assigned clients retrieval (3 tests)
     - Check-in creation (9 tests)
     - Checkout functionality (4 tests)
     - History with filters (7 tests)
     - Active check-in status (3 tests)

### ✅ Test Results

**All 40 Tests Passing! 🎉**
- ✅ Haversine formula accurate for known distances
- ✅ Distance rounded to 2 decimals correctly
- ✅ 500m threshold warning works
- ✅ Check-in only at assigned clients (403 for unassigned)
- ✅ No duplicate active check-ins allowed
- ✅ Distance stored in database
- ✅ Checkout calculates duration correctly
- ✅ History date filtering works (SQL injection prevented)
- ✅ Active check-in returns correct state

### 🐛 Bugs Found & Fixed (Phase 3)

1. **Bug #5:** Wrong status code (200 instead of 400) for validation
2. **Bug #6:** Column name mismatch preventing check-ins from saving
3. **Bug #7:** SQL injection vulnerability in date filters
4. **Bug #8:** SQLite-specific syntax issues breaking checkout

### 📝 Key Implementation Details

**Haversine Formula:**
```javascript
// Calculates distance between two GPS coordinates
calculateDistance(lat1, lon1, lat2, lon2) → distance in km
// Example: Gurugram Cyber City to Sector 44 = 7.22 km
```

**Distance Warning:**
```javascript
// Warns if user is >500m from client location
checkDistanceWarning(distance) → {shouldWarn, message}
```

**Database Schema Update:**
- Added `distance_from_client` REAL column to checkins table
- Stores calculated distance for audit trail

---

## 📦 Quality Metrics

---

## 🎯 Phase 4: Manager Dashboard & Reports (Day 1)

**Status:** ✅ Complete  
**Progress:** 100%  
**Started:** January 26, 2026 - 3:32 PM IST  
**Completed:** January 26, 2026 - 3:40 PM IST

### ✅ Completed Tasks

1. **Dashboard Statistics Endpoint**
   - ✅ GET /api/dashboard/stats - Team overview
   - ✅ Returns totalEmployees, activeCheckins, todayCheckins
   - ✅ Manager-only authorization
   - ✅ Optimized SQL (3 separate queries, no N+1)

2. **Employee Details Endpoint**
   - ✅ GET /api/dashboard/employee?id= - Individual employee view
   - ✅ Returns employee, checkins, totalHours, clients
   - ✅ Manager can only view their team members (403 otherwise)
   - ✅ Duration calculation for completed check-ins
   - ✅ Single optimized query per data type

3. **Daily Summary Report**
   - ✅ GET /api/reports/daily-summary?date - Comprehensive daily report
   - ✅ Team summary (employeesActive, totalCheckins, uniqueClients, totalHoursWorked, avgDistance)
   - ✅ Per-employee breakdown with LEFT JOIN (includes inactive employees)
   - ✅ Date validation (format check, no future dates)
   - ✅ Handles dates with no data gracefully
   - ✅ Optimized SQL - only 2 queries total

4. **SQL Optimization**
   - ✅ No N+1 query problems
   - ✅ Uses JOIN instead of multiple queries
   - ✅ COUNT(ch.id) instead of COUNT(*) for LEFT JOIN
   - ✅ All aggregations done in SQL layer
   - ✅ Performance: <100ms for test datasets

5. **Test Suite (19 tests)**
   - ✅ Dashboard stats tests (3 tests):
     - Manager sees correct team statistics
     - Employee role blocked with 403
     - Authentication required
   - ✅ Employee details tests (6 tests):
     - Manager views team member details
     - 403 when viewing non-team member
     - 400 when ID missing
     - Employee role blocked
     - Duration calculation verified
     - Authentication required
   - ✅ Daily summary tests (10 tests):
     - Today's summary generation
     - Specific date filtering
     - Invalid date format validation
     - Future date rejection
     - Includes all team members (even with no activity)
     - Hours calculation accuracy
     - Employee role blocked
     - Authentication required
     - No data handling
     - SQL performance verification

### ✅ Test Results

**All 19 Tests Passing! 🎉**
- ✅ Manager-only authorization enforced
- ✅ Team isolation working (can only see own team)
- ✅ SQL queries optimized (no N+1 issues)
- ✅ Date validation prevents future dates
- ✅ Graceful handling of missing data
- ✅ Performance requirements met (<100ms)

### 📝 Key Implementation Details

**SQL Optimization Examples:**

```sql
-- Dashboard Stats (3 optimized queries)
SELECT COUNT(*) FROM users WHERE manager_id = ? AND role = 'employee'
SELECT COUNT(*) FROM checkins INNER JOIN users ON ... WHERE status = 'checked_in'  
SELECT COUNT(*) FROM checkins INNER JOIN users ON ... WHERE DATE(checkin_time) = TODAY

-- Daily Summary (2 queries total, no N+1)
-- Query 1: Team aggregates
SELECT COUNT(DISTINCT employee_id), SUM(hours), AVG(distance) ...

-- Query 2: Per-employee breakdown with LEFT JOIN
SELECT u.*, COUNT(ch.id), SUM(hours) ...
FROM users u LEFT JOIN checkins ch ON u.id = ch.employee_id AND DATE = ?
GROUP BY u.id
```

**Role-Based Access:**
- All endpoints use `requireManager` middleware
- Manager can only view their direct reports
- Employee ID validation prevents cross-team access

**Performance:**
- Query execution time: <100ms
- Uses database aggregation functions
- Single query per data type (no loops)

---

## 📦 Quality Metrics

### Backend
- **Test Coverage:** ~80% estimated (Target: >80%) ✅
- **Tests Passing:** ✅ 87/87 (100%)
- **Dependencies:** 316 packages installed
- **Database:** ✅ Initialized with seed data
- **API Endpoints:** 13 routes implemented
- **SQL Performance:** ✅ <100ms average query time

### Frontend
- **Test Coverage:** TBD (Target: >70%)
- **Tests Passing:** N/A (Frontend not started)

- **Dependencies:** 411 packages installed
- **Build Status:** ⏳ Ready for development

---

## 🚀 Next Steps

1. Run `npm install` in backend directory
2. Run `npm install` in frontend directory
3. Execute `npm test` in backend to validate 8/8 tests passing
4. Initialize Git repository
5. Create initial commit: "chore: setup project foundation with testing framework"
6. Move to Phase 2: Authentication System

---

## 📅 Daily Log

### January 26, 2026

**10:30 AM - Session Start**
- Reviewed assignment requirements
- Analyzed existing starter code structure
- Identified 30 attached files

**10:45 AM - Testing Framework Setup**
- Configured Vitest for backend (Node environment)
- Configured Vitest for frontend (jsdom environment)
- Added testing dependencies to both package.json files

**11:00 AM - Database Test Creation**
- Created comprehensive database.test.js with 8 tests
- Covered schema validation, seed data integrity, constraints

**11:15 AM - Documentation**
- Created DEVELOPMENT.md progress tracker
- Current progress: 80% Phase 1 complete
2:45 PM - Environment Resolution**
- Uninstalled Node.js v24.11.0
- Installed Node.js v20.20.0 LTS
- Reinstalled all dependencies successfully

**3:15 PM - Phase 1 Complete! ✅**
- Ran npm install in backend (316 packages)
- Ran npm install in frontend (411 packages)
- Initialized database successfully
- **All 8/8 tests passing**
- Database file created: backend/database.sqlite

**Next Session:** Initialize Git repository and proceed to Phase 2
**Next Session:** Complete Phase 1 by running tests and committing changes

---

## 🎓 Learning & Decisions

### Technology Choices
- **Vitest over Jest:** Faster, native ESM support, better Vite integration
- **SQLite:** Zero-configuration, perfect for development and intern assignment
- **better-sqlite3:** Synchronous API, simpler than async for this use case

### Architecture Decisions
- Monorepo structure maintained from starter code
- Separate test directories for backend/frontend
- Coverage targets: Backend 80%, Frontend 70%

---

## 🔗 Repository Status

- **GitHub Repo:** Not yet created
- **Commits:** 0
- **Branches:** main (not yet initialized)
- **CI/CD:** Not yet configured

---

*Last Updated: January 26, 2026 - 11:15 AM IST*
