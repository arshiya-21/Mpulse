# Task Manager Application

A full-stack task management and project tracking application built with React (frontend) and Node.js/Express (backend) with PostgreSQL database.

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher)
- **Docker** (for PostgreSQL database)
- **Git** (optional, for cloning)

### 1. Clone or Download the Project
```bash
# If using git
git clone <repository-url>
cd task-manager
```

### 2. Start the Database
The application uses PostgreSQL running in Docker. Start it with:
```bash
docker-compose up -d
```
This will start PostgreSQL on port 5432 with the database `task_tracker`.

### 3. Setup Backend
```bash
cd backend
npm install
npm run setup -- "Admin User" "admin@company.com" "Admin@1234"
npm run dev
```
The backend will run on `http://localhost:4000`.

### 4. Setup Frontend (in a new terminal)
```bash
cd frontend
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`.

### 5. Access the Application
Open your browser and go to: `http://localhost:5173`

**Login Credentials:**
- **Email:** `admin@company.com`
- **Password:** `Admin@1234`

## 📋 Detailed Setup

### Database Configuration
The database is configured via Docker Compose with these settings:
- **Database:** `task_tracker`
- **Username:** `tracker_user`
- **Password:** `tracker_pass_123`
- **Port:** `5432`

### Environment Variables
The backend uses a `.env` file with the following configuration:
```
PORT=4000
DATABASE_URL=postgresql://tracker_user:tracker_pass_123@localhost:5432/task_tracker
JWT_SECRET=my-local-dev-secret-change-for-production-2026
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
```

### Available Scripts

#### Backend Scripts
- `npm run dev` - Start development server with nodemon
- `npm run start` - Start production server
- `npm run setup` - Initialize database and create admin user

#### Frontend Scripts
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🏗️ Project Structure

```
task-manager/
├── backend/                 # Node.js/Express API
│   ├── routes/             # API route handlers
│   ├── middleware/         # Authentication middleware
│   ├── db.js              # Database connection
│   ├── server.js          # Main server file
│   └── package.json       # Backend dependencies
├── frontend/               # React application
│   ├── src/               # Source code
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
├── database/              # Database schema
│   └── schema.sql         # PostgreSQL schema
├── docker-compose.yml     # Docker configuration
└── README.md             # This file
```

## 🔧 Troubleshooting

### Common Issues

#### 1. "Cannot connect to server" error
- Ensure both backend and frontend are running
- Check that ports 4000 (backend) and 5173 (frontend) are not blocked
- Verify CORS configuration in backend

#### 2. Database connection issues
- Ensure Docker is running: `docker ps`
- Check if PostgreSQL container is up: `docker-compose ps`
- Verify database credentials in `.env`

#### 3. Port conflicts
- If ports 4000 or 5173 are in use, change them in:
  - Backend: `.env` file (PORT variable)
  - Frontend: Update CORS_ORIGIN in backend `.env`

#### 4. Node.js version issues
- Ensure you're using Node.js v16 or higher
- Check version: `node --version`

### Resetting the Application

To completely reset the application:
```bash
# Stop all services
docker-compose down

# Remove database volume (WARNING: This deletes all data)
docker volume rm task-manager_pgdata

# Restart everything
docker-compose up -d
cd backend && npm run setup -- "Admin User" "admin@company.com" "Admin@1234"
npm run dev
```

## 🛠️ Development

### Adding New Features
- Backend API routes go in `backend/routes/`
- Frontend components go in `frontend/src/`
- Database changes require schema updates in `database/schema.sql`

### API Endpoints
- `POST /api/auth/login` - User authentication
- `GET /api/dashboard/kpis` - Dashboard KPIs
- `GET /api/employees` - Employee management
- `GET /api/projects` - Project management
- `GET /api/tasks` - Task management

## 📚 Technologies Used

### Frontend
- **React** - UI framework
- **Vite** - Build tool and dev server
- **Recharts** - Data visualization
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

