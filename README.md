# TRACKER — Team Task Manager

A full-stack collaborative task management app. Teams can create projects, assign tasks, and track progress with role-based access (Admin / Member).

## Live Demo
- **App:** https://frontend-production-cf71.up.railway.app
- **API Health:** https://backend-production-79ad9.up.railway.app/api/health

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18 + Vite + Inter/Space Grotesk |
| Backend    | Node.js + Express                 |
| Database   | PostgreSQL                        |
| Auth       | JWT (7-day expiry)                |
| Deployment | Railway (3 services)              |

---

## Features

- **Authentication** — JWT-based signup / login
- **Projects** — Create projects; creator becomes Admin automatically
- **Role-Based Access** — Admins manage everything; Members update their assigned tasks
- **Tasks** — Title, description, due date, priority (low / medium / high), status (To Do / In Progress / Done)
- **Kanban Board** — Visual 3-column board per project with filter pills
- **Dashboard** — Per-project stats: totals, status breakdown, overall progress bar, per-user progress, overdue count
- **Member Management** — Admin can add / remove members by email
- **Modern UI** — Dark glassmorphism design, smooth animations, gradient accents

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database

### 1. Clone
```bash
git clone https://github.com/Hxrsh01/Team-Task-Manager.git
cd team-task-manager
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET
npm install
npm run dev
```

Runs on `http://localhost:5000`. DB schema is auto-created on first start.

### 3. Frontend
```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
```

Runs on `http://localhost:5173`.

---

## Deployment (Railway)

This project is deployed as **3 Railway services** in a single project:

| Service    | Description                        |
|------------|------------------------------------|
| `Postgres`  | Managed PostgreSQL database        |
| `backend`   | Express API, auto-inits DB schema  |
| `frontend`  | React app served via `serve`       |

### Environment Variables

**Backend service:**
```
NODE_ENV=production
DATABASE_URL=<Railway Postgres URL>
JWT_SECRET=<random 32+ char string>
FRONTEND_URL=https://your-frontend.up.railway.app
```

**Frontend service:**
```
VITE_API_URL=https://your-backend.up.railway.app/api
```

### Deploy via CLI
```bash
npm install -g @railway/cli
railway login
railway init
railway add --database postgres
railway add --service backend
railway add --service frontend

# Set env vars, then deploy each service:
railway up --service backend  --path-as-root backend
railway up --service frontend --path-as-root frontend
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login |
| GET  | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET    | `/api/projects` | My projects | Any |
| POST   | `/api/projects` | Create project | Any |
| GET    | `/api/projects/:id` | Project detail | Member+ |
| DELETE | `/api/projects/:id` | Delete project | Admin |
| POST   | `/api/projects/:id/members` | Add member | Admin |
| DELETE | `/api/projects/:id/members/:userId` | Remove member | Admin |

### Tasks
| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET    | `/api/projects/:id/tasks` | List tasks | Member+ |
| POST   | `/api/projects/:id/tasks` | Create task | Admin |
| PUT    | `/api/projects/:id/tasks/:taskId` | Update task | Admin / Assigned |
| DELETE | `/api/projects/:id/tasks/:taskId` | Delete task | Admin |
| GET    | `/api/projects/:id/dashboard` | Stats | Member+ |

---

## Project Structure

```
team-task-manager/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js           # PostgreSQL connection pool
│   │   │   ├── schema.sql      # Database schema (auto-applied)
│   │   │   └── initDB.js       # Runs schema on startup with retry
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
│   ├── railway.toml
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/layout/
    │   │   └── Layout.jsx       # Sidebar + outlet
    │   ├── context/
    │   │   └── AuthContext.jsx  # Global auth state
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Signup.jsx
    │   │   ├── Dashboard.jsx    # Project grid + stats
    │   │   └── ProjectView.jsx  # Kanban + dashboard + members
    │   ├── utils/
    │   │   └── api.js           # Axios with JWT interceptors
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css            # Design system (CSS vars, components)
    ├── .env.example
    ├── railway.toml
    └── package.json
```

---

## Database Schema

```sql
users           — id, name, email, password (bcrypt), created_at
projects        — id, name, description, created_by → users, created_at
project_members — project_id, user_id, role (admin|member)
tasks           — id, title, description, project_id, assigned_to, created_by,
                  status (todo|in_progress|done), priority (low|medium|high),
                  due_date, created_at, updated_at (auto-updated via trigger)
```

---

## Security

- Passwords hashed with bcryptjs (12 rounds)
- JWT tokens expire in 7 days
- All routes require authentication except `/auth/signup` and `/auth/login`
- Role checks enforced on every mutating endpoint
- SQL injection protected via parameterized queries (`pg` driver)
- CORS restricted to `FRONTEND_URL` in production
