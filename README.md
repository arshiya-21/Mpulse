# MPulse — Work Pulse Intelligence

A full-stack internal management platform built for **MPM Infosoft**. It tracks employee work logs, projects, customer visits, and team utilization in one place.

**Stack:** React 18 · Node.js / Express · PostgreSQL 16 · Docker

---

## What MPulse Does

### Daily Work Log
Employees log their work each day — project, category, minutes spent. The system automatically calculates utilization (% of daily target worked) and TAT (days delayed vs. project deadline).

### Projects
Track all client and internal projects. Each project has assignees, start/end dates, and a status. Managers and Admin can see TAT — how many days a project ran beyond its target end date.

### Dashboard
Gives Admin and Managers a bird's-eye view: daily utilization across the team, recent task logs, project team breakdown, and workload charts.

### Customer Visits
Schedule and track customer visits. Assign to an employee, set channel (Email, WhatsApp, Phone Call, etc.), agenda, and date. The system sends email notifications when a visit is scheduled and daily reminders for overdue/upcoming visits.

### Master Data
Manage the core data that drives the system:
- **Employees** — add, invite, set roles and departments
- **Departments** — organize teams
- **Roles** — Admin, Manager, User
- **Licenses** — track software/service licenses sold to customers
- **Customers** — customer list linked to licenses and visits
- **Email Config** — configure Gmail SMTP to send system emails
- **Access Config** — role-based permission control per page
- **Categories** — configure work categories for task logging
- **Formulas** — configure utilization calculation formula

### Reports
Export task data as CSV or Excel (.xlsx). Filtered by date, department, employee, project, or status. Non-admin users only see their own department's data.

### Library
Video library organized by section. Upload YouTube video IDs and they display as a thumbnail grid. Supports sections, add/edit/delete by Admin.

### Administration
System-wide settings: company name, daily work target, timezone, TAT alert days, session timeout, and notification toggles.

---

## Roles

| Role    | What they see |
|---------|--------------|
| Admin   | Everything — all departments, all employees, full settings |
| Manager | Their department's data, their team's work logs and visits |
| User    | Only their own work log, their assigned projects and visits |

---

## Default Login

| Field    | Value            |
|----------|------------------|
| Email    | admin@mpulse.com |
| Password | Admin@1234       |

Change the password after first login.

---

## Local Development

### Prerequisites
- Node.js 18+
- Docker Desktop

### 1. Start the database
```bash
docker-compose up -d
```

### 2. Backend
```bash
cd backend
npm install
npm run dev        # runs on http://localhost:4000
```

`backend/.env`:
```
PORT=4000
DATABASE_URL=postgresql://tracker_user:tracker_pass_123@localhost:5432/task_tracker
JWT_SECRET=my-local-dev-secret-change-for-production-2026
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev        # runs on http://localhost:5173
```

---

## Project Structure

```
mpulse/
├── backend/
│   ├── src/
│   │   ├── app.js              # Express entry point + route registration
│   │   ├── migrate.js          # Auto-runs on startup — creates/alters tables
│   │   ├── config/db.js        # PostgreSQL pool
│   │   ├── middleware/auth.js  # JWT verify middleware
│   │   ├── routes/             # One file per API domain
│   │   │   ├── auth.js         # Login, password reset
│   │   │   ├── employees.js    # Employee CRUD + invite
│   │   │   ├── tasks.js        # Work log CRUD + utilization calc
│   │   │   ├── projects.js     # Project CRUD + assignees
│   │   │   ├── visits.js       # Customer visit CRUD
│   │   │   ├── reports.js      # CSV / Excel export
│   │   │   ├── permissions.js  # Role permission read/write
│   │   │   ├── emailSettings.js# Gmail SMTP config
│   │   │   └── library.js      # Video library sections + videos
│   │   └── utils/
│   │       ├── mailer.js       # Nodemailer — all email sending
│   │       └── visitReminder.js# node-cron — daily 9AM reminder emails
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/         # One file per page
│   │   ├── api/                # Axios calls per domain
│   │   └── context/AuthContext.jsx
│   ├── nginx.conf              # Production nginx (serves SPA + proxies /api)
│   ├── Dockerfile
│   └── vite.config.js
├── database/
│   ├── schema.sql              # Full schema + seed data (used on first DB init)
│   └── seed.js                 # Run manually to re-seed: node database/seed.js
├── docker-compose.yml          # Local dev — starts DB only
├── docker-compose.prod.yml     # Production — all 3 services
├── .env.example                # Copy to .env and fill in secrets
└── README.md
```

---

## Email Setup (Gmail SMTP)

1. Go to **Master Data → Email Config**
2. Enter your Gmail address
3. Enter a Gmail **App Password** (not your login password)
   - Go to myaccount.google.com → Security → 2-Step Verification → App Passwords
   - Create one named "MPulse"
   - Paste the 16-character password
4. Click **Save** then **Test Email**

This enables: new employee welcome emails, visit scheduled notifications, daily overdue/upcoming visit reminders.
