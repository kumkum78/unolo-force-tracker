# Field Force Tracker

A simple web app for tracking employee check-ins at client sites. Built as part of Unolo's full-stack internship assignment.

## What it does

Employees can:
- Check in/out at client locations using GPS
- View their check-in history
- See assigned clients

Managers can:
- View team activity and stats
- Track active check-ins
- Generate reports

## Tech Stack

**Backend:** Node.js, Express, SQLite  
**Frontend:** React, Vite, Tailwind  
**Auth:** JWT tokens

## Setup

### Backend

```bash
cd backend
npm install
npm run init-db  # Creates database with sample data
npm start        # Runs on port 3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # Runs on port 5173
```

### Test Login

- Manager: manager@unolo.com / password123
- Employee: rahul@unolo.com / password123

## Testing

```bash
# Backend tests (87 tests)
cd backend
npm test

# Frontend tests (38 tests)
cd frontend
npm test

# Check coverage
npm run test:coverage
```

## API Routes

### Auth
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get logged-in user info

### Check-ins
- `GET /api/checkin/clients` - List assigned clients
- `POST /api/checkin` - Check in (requires GPS coords)
- `PUT /api/checkin/checkout` - Check out from active check-in
- `GET /api/checkin/history?start_date&end_date` - History with filters
- `GET /api/checkin/active` - Get current active check-in

### Dashboard
- `GET /api/dashboard/stats` - Manager dashboard data
- `GET /api/dashboard/employee?id=X` - Specific employee stats

## Key Features

- **GPS validation:** Warns if check-in is >500m from client location
- **Distance calculation:** Uses Haversine formula for accuracy
- **Role-based access:** Employees can't access manager routes
- **Session persistence:** JWT tokens stored in localStorage
- **Responsive design:** Works on mobile and desktop

## Project Structure

```
backend/
├── config/          # Database setup
├── middleware/      # JWT auth
├── routes/          # API endpoints
├── tests/           # Unit tests
└── server.js

frontend/
├── src/
│   ├── components/  # Reusable UI components
│   ├── contexts/    # React context (auth)
│   ├── pages/       # Main pages
│   ├── utils/       # API helper
│   └── tests/       # Component tests
└── e2e/             # Playwright tests

database/
└── schema.sql       # Database structure (for reference)
```

## Notes

- SQLite is used so no external database needed
- Fixed several bugs in the starter code
- All tests pass with 91% backend and 95% frontend coverage
