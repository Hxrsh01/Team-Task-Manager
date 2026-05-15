# TaskFlow — Team Task Manager

A full-stack collaborative task management application. Multiple users can create projects, assign tasks, and track progress — with role-based access (Admin / Member).

## Live Demo
- Frontend: `https://your-frontend.railway.app`
- Backend API: `https://your-backend.railway.app`

---

## Tech Stack

| Layer      | Technology               |
|------------|--------------------------|
| Frontend   | React 18 + Vite          |
| Backend    | Node.js + Express        |
| Database   | PostgreSQL               |
| Auth       | JWT (7-day expiry)       |
| Deployment | Railway                  |

---

## Features

- **Authentication** — JWT-based signup/login
- **Projects** — Create projects; creator is Admin
- **Role-Based Access** — Admins manage everything; Members update assigned tasks only
- **Tasks** — Title, description, due date, priority (low/medium/high), status (To Do / In Progress / Done)
- **Kanban Board** — Visual 3-column board per project
- **Dashboard** — Per-project stats: totals, status breakdown, per-user progress, overdue count
- **Member Management** — Admin can add/remove members by email

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database

### 1. Clone
```bash
git clone https://github.com/YOUR_USERNAME/team-task-manager.git
cd team-task-manager
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET in .env
npm install
npm run dev
```

Backend runs on `http://localhost:5000`. Schema is auto-created on first start.

### 3. Frontend
```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

---

## Deployment on Railway

### Step 1 — Create Railway project
1. Go to [railway.app](https://railway.app) and create a new project
2. Add a **PostgreSQL** plugin — copy the `DATABASE_URL`

### Step 2 — Deploy Backend
1. Add a new service → **GitHub repo** → select `backend/` folder (or set root directory)
2. Set environment variables:
   ```
   DATABASE_URL=<from Railway PostgreSQL>
   JWT_SECRET=<random 32+ char string>
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend.railway.app
   ```
3. Railway will auto-deploy. Note your backend URL.

### Step 3 — Deploy Frontend
1. Add another service → GitHub repo → select `frontend/` folder
2. Set environment variables:
   ```
   VITE_API_URL=https://your-backend.railway.app/api
   ```
3. Deploy. Visit your frontend URL.

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/projects` | My projects | Any |
| POST | `/api/projects` | Create project | Any |
| GET | `/api/projects/:id` | Project detail | Member+ |
| DELETE | `/api/projects/:id` | Delete project | Admin |
| POST | `/api/projects/:id/members` | Add member | Admin |
| DELETE | `/api/projects/:id/members/:userId` | Remove member | Admin |

### Tasks
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/projects/:id/tasks` | List tasks | Member+ |
| POST | `/api/projects/:id/tasks` | Create task | Admin |
| PUT | `/api/projects/:id/tasks/:taskId` | Update task | Admin / Assigned |
| DELETE | `/api/projects/:id/tasks/:taskId` | Delete task | Admin |
| GET | `/api/projects/:id/dashboard` | Stats | Member+ |

---

## Project Structure

```
team-task-manager/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js           # PostgreSQL connection pool
│   │   │   ├── schema.sql      # Database schema
│   │   │   └── initDB.js       # Auto-runs schema on startup
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── projectController.js
│   │   │   └── taskController.js
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT verification
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── projects.js
│   │   │   └── tasks.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── layout/Layout.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx  # Global auth state
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Signup.jsx
    │   │   ├── Dashboard.jsx    # Project list + stats
    │   │   └── ProjectView.jsx  # Kanban + members + dashboard
    │   ├── utils/
    │   │   └── api.js           # Axios with JWT interceptors
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── .env.example
    └── package.json
```

---

## Database Schema

```sql
users           — id, name, email, password (hashed), created_at
projects        — id, name, description, created_by → users, created_at
project_members — project_id, user_id, role (admin|member)
tasks           — id, title, description, project_id, assigned_to, created_by,
                  status (todo|in_progress|done), priority (low|medium|high),
                  due_date, created_at, updated_at
```

---

## Security Notes
- Passwords hashed with bcryptjs (12 rounds)
- JWT tokens expire in 7 days
- All routes require authentication except `/auth/signup` and `/auth/login`
- Role checks enforced on every mutating endpoint
- SQL injection protected via parameterized queries (`pg` driver)
