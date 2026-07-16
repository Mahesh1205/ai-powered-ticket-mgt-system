# AI-Powered Support Ticket Management System

An internal support ticket management system that enables authenticated users to create, progress, and manage support tickets through a defined lifecycle. The system provides role-based access control (agent and admin roles), a strict state-machine-enforced ticket workflow, commenting capabilities, and full user management for administrators.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, Zustand 5, Tailwind CSS 4, TypeScript |
| Backend | Node.js 22, Express 5, TypeScript 5.x |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken), bcrypt password hashing |
| Testing | Vitest, fast-check (property-based), Supertest |

## Prerequisites

- **Node.js** >= 22.0.0
- **PostgreSQL** (running locally or accessible via connection string)
- **npm** (comes with Node.js)

## Project Structure

```
ai-powered-ticket-mgt-system/
├── backend-api/          # Express 5 REST API (TypeScript)
│   ├── db/               # Database migrations, seeds, and scripts
│   ├── src/              # Application source code
│   │   ├── middleware/   # Auth and error handling middleware
│   │   ├── repositories/ # Data access layer
│   │   ├── routes/       # HTTP route handlers
│   │   ├── services/     # Business logic layer
│   │   ├── types/        # TypeScript interfaces
│   │   └── utils/        # Shared utilities (db pool, errors)
│   └── tests/            # Unit, property, and integration tests
├── ui/                   # React 19 SPA (Vite 6)
│   └── src/
│       ├── api/          # Axios HTTP client
│       ├── components/   # Shared UI components
│       ├── pages/        # Route page components
│       ├── stores/       # Zustand state stores
│       └── types/        # TypeScript interfaces
└── docs/                 # Design and workflow documentation
```

## Environment Variables

### Backend (`backend-api/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/ticket_system` |
| `JWT_SECRET` | Secret for signing JWTs (min 32 characters) | `your-secret-key-must-be-at-least-32-characters-long` |
| `PORT` | Port for the API server | `3001` |

### Frontend (`ui/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3001/api` |

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd ai-powered-ticket-mgt-system
```

### 2. Set up environment variables

```bash
# Backend
cp backend-api/.env.example backend-api/.env
# Edit backend-api/.env with your PostgreSQL credentials and a JWT secret (≥ 32 chars)

# Frontend
cp ui/.env.example ui/.env
# Default VITE_API_URL=http://localhost:3001/api should work for local development
```

Or use the root `.env.example` as a reference for all required variables:

```bash
cp .env.example .env
```

### 3. Install dependencies

```bash
# Backend
cd backend-api
npm install

# Frontend
cd ../ui
npm install
```

### 4. Set up the database

Ensure PostgreSQL is running, then from the `backend-api/` directory:

```bash
# Full setup: creates database, runs migrations, seeds default users
npm run db:setup
```

Or run each step individually:

```bash
npm run db:create    # Create the database (if not exists)
npm run db:migrate   # Run all SQL migrations
npm run db:seed      # Seed default admin and agent users
```

### 5. Start the application

```bash
# Start the backend API (from backend-api/)
npm run dev

# Start the frontend dev server (from ui/)
npm run dev
```

The backend runs on `http://localhost:3001` and the frontend on `http://localhost:5173` by default.

## Default Users (Seeded)

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | Admin123! | admin |
| agent@example.com | Agent123! | agent |

## Available Scripts

### Backend (`backend-api/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run compiled production build |
| `npm run db:setup` | Full database setup (create + migrate + seed) |
| `npm run db:create` | Create database only |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:seed` | Seed default users |
| `npm test` | Run all tests |
| `npm run test:properties` | Run property-based tests only |
| `npm run test:integration` | Run integration tests only |

### Frontend (`ui/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |

## API Endpoints

### Authentication
- `POST /api/auth/login` — Login with email/password
- `GET /api/auth/me` — Get current authenticated user

### Tickets
- `POST /api/tickets` — Create a ticket
- `GET /api/tickets` — List tickets (supports `?search=` and `?status=` query params)
- `GET /api/tickets/:id` — Get ticket details with comments
- `PATCH /api/tickets/:id` — Update ticket fields
- `PATCH /api/tickets/:id/status` — Transition ticket status

### Comments
- `POST /api/tickets/:id/comments` — Add a comment to a ticket

### Users (Admin only for write operations)
- `GET /api/users` — List all users
- `POST /api/users` — Create a user (admin only)
- `PATCH /api/users/:id` — Update a user (admin only)
- `DELETE /api/users/:id` — Delete a user (admin only)

## Ticket Status Lifecycle

```
[Open] → [In Progress] → [Resolved] → [Closed]
  ↓            ↓
[Cancelled] [Cancelled]
```

Valid transitions:
- **Open** → In Progress, Cancelled
- **In Progress** → Resolved, Cancelled
- **Resolved** → Closed
- **Closed** — terminal (no transitions)
- **Cancelled** — terminal (no transitions)

## License

This project is for internal use and assessment purposes.
