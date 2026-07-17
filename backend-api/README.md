# Backend API — Support Ticket Management

An internal REST API that powers ticket lifecycle management with JWT authentication, role-based access, and a state-machine-enforced workflow — built with Node.js 22, Express 5, and TypeScript.

## Tech Stack

| Library | Version | Purpose |
|---------|---------|---------|
| Node.js | 22 | Runtime |
| Express | 5 | HTTP framework |
| TypeScript | 5.x | Type safety (strict mode) |
| PostgreSQL | 16+ | Database |
| jsonwebtoken | latest | JWT auth |
| bcryptjs | latest | Password hashing |
| pg | latest | PostgreSQL driver |
| Vitest | latest | Test runner |
| fast-check | latest | Property-based testing |
| Supertest | latest | HTTP test assertions |

## Prerequisites

- Node.js >= 22.0.0
- PostgreSQL (running locally or accessible via connection string)
- npm (comes with Node.js)

## Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your database credentials and JWT secret
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/ticket_system` |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars) | `your-secret-key-must-be-at-least-32-characters-long` |
| `PORT` | Server port | `3001` |

## Database Setup

```bash
# Full setup: create database → run migrations → seed default users
npm run db:setup

# Or run individual steps:
npm run db:create    # Create database (if not exists)
npm run db:migrate   # Run SQL migration files
npm run db:seed      # Seed admin + agent users (idempotent)
```

The setup script derives the admin connection from `DATABASE_URL` by replacing the database name with `postgres`.

## Running Locally

```bash
# Development server with hot reload (nodemon + ts-node)
npm run dev

# Production build
npm run build
npm start
```

The API starts at **http://localhost:3001** (or whatever PORT is set in .env).

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run compiled production build |
| `npm run db:setup` | Full DB setup (create + migrate + seed) |
| `npm run db:create` | Create database only |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:seed` | Seed default users |
| `npm test` | Run all tests |
| `npm run test:properties` | Run property-based tests only |
| `npm run test:integration` | Run integration tests only |

## Project Structure

```
backend-api/
├── src/
│   ├── config/        # Swagger/OpenAPI configuration
│   ├── middleware/    # Auth and error handling middleware
│   │   ├── auth.ts           # JWT verification + role enforcement
│   │   └── errorHandler.ts   # Global error handler
│   ├── repositories/  # Data access layer (SQL queries)
│   │   ├── userRepository.ts
│   │   ├── ticketRepository.ts
│   │   └── commentRepository.ts
│   ├── routes/        # HTTP route handlers
│   │   ├── auth.ts
│   │   ├── tickets.ts
│   │   ├── comments.ts
│   │   └── users.ts
│   ├── services/      # Business logic
│   │   ├── authService.ts
│   │   ├── ticketService.ts
│   │   ├── ticketStateMachine.ts
│   │   ├── commentService.ts
│   │   └── userService.ts
│   ├── types/         # TypeScript interfaces
│   ├── utils/         # Shared utilities (db pool, error classes)
│   └── index.ts       # Express app entry point
├── db/
│   ├── scripts/       # setup.sh, create-database.sql
│   ├── migrations/    # Numbered SQL migration files
│   ├── seeds/         # Seed data documentation
│   ├── migrate.js     # Migration runner
│   └── seed.js        # Seed script (bcrypt hashing)
├── tests/
│   ├── property/      # Property-based tests (fast-check)
│   ├── integration/   # API integration tests (supertest)
│   └── unit/          # Unit tests
├── Dockerfile         # Multi-stage production build
├── tsconfig.json      # TypeScript configuration
├── vitest.config.ts   # Vitest test runner configuration
└── package.json
```

## Architecture

```
Routes (HTTP) → Services (Business Logic) → Repositories (SQL)
```

- **Routes** handle HTTP request/response only — no business logic, no direct DB access
- **Services** contain business rules, validation, orchestration
- **Repositories** execute parameterized SQL queries against PostgreSQL
- **Middleware** handles cross-cutting concerns (auth, errors)

## API Endpoints

### Authentication
- `POST /api/auth/login` — Login (public)
- `GET /api/auth/me` — Get current user (authenticated)

### Tickets
- `POST /api/tickets` — Create ticket
- `GET /api/tickets` — List/search/filter tickets (`?search=`, `?status=`)
- `GET /api/tickets/:id` — Get ticket detail with comments
- `PATCH /api/tickets/:id` — Update ticket fields
- `PATCH /api/tickets/:id/status` — Transition ticket status

### Comments
- `POST /api/tickets/:id/comments` — Add comment to ticket

### Users (admin-only for write operations)
- `GET /api/users` — List users (any authenticated user)
- `POST /api/users` — Create user (admin)
- `PATCH /api/users/:id` — Update user (admin)
- `DELETE /api/users/:id` — Delete user (admin)

### Documentation
- `GET /api-docs` — Swagger UI (no auth required)

## Default Seed Users

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | Admin123! | admin |
| agent@example.com | Agent123! | agent |

## Testing

```bash
# Run all tests (requires PostgreSQL running with test database)
npm test

# Property tests only (25 correctness properties)
npm run test:properties

# Integration tests only (state machine + auth matrix)
npm run test:integration
```

Tests require a running PostgreSQL instance. Set `DATABASE_URL` to a test database.

## Docker

```bash
# Build and run
docker build -t ticket-api .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/ticket_system \
  -e JWT_SECRET=your-secret-key-must-be-at-least-32-characters-long \
  -e PORT=3000 \
  ticket-api
```

The Dockerfile uses multi-stage build: compile TypeScript → slim production image with only dist + node_modules + db directory.
