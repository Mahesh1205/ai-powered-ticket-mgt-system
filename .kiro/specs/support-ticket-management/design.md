# Design Document: Support Ticket Management System

## Overview

This design describes a full-stack internal support ticket management system built with React 19 / Vite 6 on the frontend and Node.js 22 / Express 5 / TypeScript on the backend, persisting data in PostgreSQL. The system allows authenticated users (agents and admins) to create, track, and resolve support tickets through a strict state-machine-enforced lifecycle. Admins additionally manage user accounts.

Key design goals:
- **Strict ticket lifecycle** — A deterministic state machine governs all status transitions, making illegal states unrepresentable at runtime.
- **Layered backend** — Routes → Services → Repositories separation ensures testability and maintainability.
- **Stateless auth** — JWT-based authentication with 24-hour tokens stored in sessionStorage; no server-side session state.
- **Role-based access** — Middleware enforces agent/admin permissions at the API layer; the frontend mirrors these constraints in the UI.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph Frontend["ui/ (React 19 + Vite 6)"]
        UI[React Components]
        Store[Zustand Stores]
        API_Client[API Client / Axios]
    end

    subgraph Backend["backend-api/ (Node.js 22 + Express 5 + TypeScript)"]
        Router[Route Layer]
        Middleware[Auth Middleware]
        Services[Service Layer]
        Repos[Repository Layer]
    end

    subgraph Database["PostgreSQL"]
        Users_Table[users]
        Tickets_Table[tickets]
        Comments_Table[comments]
    end

    UI --> Store
    Store --> API_Client
    API_Client -->|HTTP/JSON| Middleware
    Middleware --> Router
    Router --> Services
    Services --> Repos
    Repos -->|SQL via parameterized queries| Database
```

### Backend Layer Responsibilities

| Layer | Responsibility | Imports From |
|-------|---------------|--------------|
| Routes | HTTP request/response handling, parameter extraction, response formatting | Services only |
| Middleware | JWT verification, role enforcement, request validation | — |
| Services | Business logic, orchestration, state machine enforcement | Repositories only |
| Repositories | Data access, SQL queries, entity mapping | Database driver |

### Request Flow

```mermaid
sequenceDiagram
    participant Client as Frontend
    participant MW as Auth Middleware
    participant Route as Route Handler
    participant Svc as Service
    participant Repo as Repository
    participant DB as PostgreSQL

    Client->>MW: HTTP Request + Bearer Token
    MW->>MW: Verify JWT signature + expiry
    MW->>MW: Check role authorization
    MW->>Route: Attach user context
    Route->>Svc: Call service method
    Svc->>Repo: Data access call
    Repo->>DB: Parameterized SQL query
    DB-->>Repo: Result rows
    Repo-->>Svc: Mapped entities
    Svc-->>Route: Business result
    Route-->>Client: HTTP Response (JSON)
```

### Ticket State Machine

```mermaid
stateDiagram-v2
    [*] --> Open : Ticket Created
    Open --> InProgress : Start Work
    Open --> Cancelled : Cancel
    InProgress --> Resolved : Resolve
    InProgress --> Cancelled : Cancel
    Resolved --> Closed : Close
    Closed --> [*]
    Cancelled --> [*]
```

**Transition Table:**

| From | Allowed Targets |
|------|----------------|
| Open | In Progress, Cancelled |
| In Progress | Resolved, Cancelled |
| Resolved | Closed |
| Closed | _(terminal — no transitions)_ |
| Cancelled | _(terminal — no transitions)_ |

## Components and Interfaces

### Backend Components

#### Auth Module

```typescript
// POST /api/auth/login
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: UserDTO;
}

// GET /api/auth/me
interface MeResponse extends UserDTO {}

interface UserDTO {
  id: string;       // UUID
  name: string;
  email: string;
  role: "agent" | "admin";
}
```

#### Ticket Module

```typescript
// POST /api/tickets
interface CreateTicketRequest {
  title: string;        // max 200 chars
  description: string;  // max 5000 chars
  priority: "low" | "medium" | "high";
}

// PATCH /api/tickets/:id
interface UpdateTicketRequest {
  title?: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  assignedTo?: string | null; // User UUID
}

// PATCH /api/tickets/:id/status
interface TransitionStatusRequest {
  status: TicketStatus;
}

type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed" | "Cancelled";

interface TicketDTO {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: TicketStatus;
  assignedTo: string | null;
  createdBy: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

interface TicketDetailDTO extends TicketDTO {
  comments: CommentDTO[];
}
```

#### Comment Module

```typescript
// POST /api/tickets/:id/comments
interface CreateCommentRequest {
  message: string; // max 2000 chars
}

interface CommentDTO {
  id: string;
  ticketId: string;
  createdBy: string;
  message: string;
  createdAt: string; // ISO 8601
}
```

#### User Management Module

```typescript
// POST /api/users (admin only)
interface CreateUserRequest {
  name: string;      // max 100 chars
  email: string;     // valid email format
  password: string;  // min 6 chars
  role: "agent" | "admin";
}

// PATCH /api/users/:id (admin only)
interface UpdateUserRequest {
  name?: string;     // max 200 chars
  email?: string;
  role?: "agent" | "admin";
  password?: string; // min 6 chars, optional
}

// GET /api/users
interface UserListDTO {
  id: string;
  name: string;
  email: string;
  role: "agent" | "admin";
  createdAt: string;
  updatedAt: string;
}
```

#### Error Response Format

```typescript
interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, string>;
}
```

### Frontend Components

#### Store Architecture (Zustand 5)

```typescript
// authStore
interface AuthState {
  token: string | null;
  user: UserDTO | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

// ticketStore
interface TicketState {
  tickets: TicketDTO[];
  currentTicket: TicketDetailDTO | null;
  isLoading: boolean;
  error: string | null;
  fetchTickets: (params?: { search?: string; status?: string }) => Promise<void>;
  fetchTicket: (id: string) => Promise<void>;
  createTicket: (data: CreateTicketRequest) => Promise<void>;
  updateTicket: (id: string, data: UpdateTicketRequest) => Promise<void>;
  transitionStatus: (id: string, status: TicketStatus) => Promise<void>;
  addComment: (ticketId: string, message: string) => Promise<void>;
}

// userStore (admin only)
interface UserState {
  users: UserListDTO[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  createUser: (data: CreateUserRequest) => Promise<void>;
  updateUser: (id: string, data: UpdateUserRequest) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}
```

#### Route Structure

| Route | Component | Access |
|-------|-----------|--------|
| `/login` | LoginPage | Public |
| `/tickets` | TicketListPage | Authenticated |
| `/tickets/:id` | TicketDetailPage | Authenticated |
| `/tickets/new` | CreateTicketPage | Authenticated |
| `/users` | UserListPage | Admin only |
| `/users/new` | CreateUserPage | Admin only |
| `/users/:id/edit` | EditUserPage | Admin only |

#### Protected Route Component

```typescript
// Wraps authenticated routes
// - If no token in sessionStorage → redirect to /login
// - If token exists but role check fails → redirect to /tickets
// - While validating session → show loading state
```

### Middleware Stack

```typescript
// Applied to all /api/* routes except /api/auth/login
const authMiddleware = (req, res, next) => {
  // 1. Extract Bearer token from Authorization header
  // 2. Verify JWT signature and expiry
  // 3. Attach decoded user to req.user
  // 4. Call next() or return 401
};

// Applied to admin-only routes
const requireAdmin = (req, res, next) => {
  // 1. Check req.user.role === "admin"
  // 2. Call next() or return 403
};
```

## Data Models

### Entity Relationship Diagram

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar(100) name
        varchar(255) email UK
        varchar(255) passwordHash
        varchar(10) role
        timestamp createdAt
        timestamp updatedAt
    }

    TICKETS {
        uuid id PK
        varchar(200) title
        text description
        varchar(10) priority
        varchar(20) status
        uuid assignedTo FK
        uuid createdBy FK
        timestamp createdAt
        timestamp updatedAt
    }

    COMMENTS {
        uuid id PK
        uuid ticketId FK
        uuid createdBy FK
        varchar(2000) message
        timestamp createdAt
    }

    USERS ||--o{ TICKETS : "creates"
    USERS ||--o{ TICKETS : "assigned to"
    USERS ||--o{ COMMENTS : "writes"
    TICKETS ||--o{ COMMENTS : "has"
```

### Database Schema (PostgreSQL)

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    "passwordHash" VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('agent', 'admin')),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed', 'Cancelled')),
    "assignedTo" UUID REFERENCES users(id) ON DELETE SET NULL,
    "createdBy" UUID NOT NULL REFERENCES users(id),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ticketId" UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    "createdBy" UUID NOT NULL REFERENCES users(id),
    message VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets("createdAt" DESC);
CREATE INDEX idx_tickets_search ON tickets USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX idx_comments_ticket_id ON comments("ticketId");
```

### Migration Strategy

Database artifacts are organized under `backend-api/db/`:

```
db/
├── scripts/
│   ├── create-database.sql   # CREATE DATABASE IF NOT EXISTS
│   └── setup.sh              # create → migrate → seed (single-command setup)
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_tickets.sql
│   └── 003_create_comments.sql
├── seeds/
│   └── 001_users.sql         # Documents seed data (actual seeding via seed.js)
├── migrate.js                # Node.js migration runner
└── seed.js                   # Node.js seed runner (bcrypt hashing)
```

**NPM Scripts:**

```json
{
  "db:create": "bash db/scripts/setup.sh create",
  "db:migrate": "node db/migrate.js",
  "db:seed": "node db/seed.js",
  "db:setup": "bash db/scripts/setup.sh"
}
```

**DATABASE_URL Format:**

```
postgresql://username:password@host:port/database_name
```

Examples:
- With credentials: `postgresql://postgres:postgres@localhost:5432/ticket_system`
- macOS Homebrew (no password): `postgresql://localhost:5432/ticket_system`

The `setup.sh` script derives the admin connection URL from DATABASE_URL by replacing the database name with `postgres`:

```bash
ADMIN_URL="${DATABASE_URL%/*}/postgres"
```

**Local Setup Sequence:**

```bash
cp .env.example .env          # Set DATABASE_URL, JWT_SECRET, PORT
npm install
npm run db:setup              # Creates DB → runs migrations → seeds users
npm run dev                   # Start the API server
```

- Migrations use raw SQL files with a lightweight Node.js runner (`db/migrate.js`).
- Migrations are numbered sequentially and use `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` for idempotency.
- Running all migrations on an empty database produces the complete schema.

### Seed Data

```typescript
// Seed script (idempotent — uses INSERT ... ON CONFLICT DO NOTHING)
const seedUsers = [
  { name: "Admin User", email: "admin@example.com", password: "Admin123!", role: "admin" },
  { name: "Agent User", email: "agent@example.com", password: "Agent123!", role: "agent" },
];
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid state machine transitions succeed

*For any* ticket in a non-terminal status and *for any* target status that is a valid transition from that status (per the transition table: Open→In Progress, Open→Cancelled, In Progress→Resolved, In Progress→Cancelled, Resolved→Closed), requesting the transition SHALL update the ticket status to the target and return the updated ticket.

**Validates: Requirements 8.1, 8.3**

### Property 2: Invalid state machine transitions are rejected and preserve state

*For any* ticket in any status and *for any* target status that is NOT a valid transition from the current status, requesting the transition SHALL be rejected (HTTP 409) and the ticket status SHALL remain unchanged.

**Validates: Requirements 8.2, 8.4**

### Property 3: passwordHash is never exposed in any API response

*For any* API endpoint that returns user data (login response, /auth/me, user list, user create/update, ticket detail with createdBy), the response body SHALL never contain a `passwordHash` field at any nesting level.

**Validates: Requirements 1.5, 10.2, 17.4**

### Property 4: JWT contains required claims with correct expiry

*For any* successful login, the issued JWT SHALL decode to a payload containing `sub` (matching user ID), `email` (matching user email), `role` (matching user role), `iat` (issuance timestamp), and `exp` (exactly 24 hours after `iat`).

**Validates: Requirements 1.4**

### Property 5: Login authentication round trip

*For any* user with known credentials (email, password), submitting a login request with those exact credentials SHALL return a valid JWT token and a user object matching the stored user's id, name, email, and role.

**Validates: Requirements 1.1**

### Property 6: Wrong password is always rejected

*For any* registered user email and *for any* password string that does not match the user's stored credential, the login request SHALL return HTTP 401 with a generic error message that does not reveal whether the email or password was incorrect.

**Validates: Requirements 1.2**

### Property 7: Malformed login requests are rejected

*For any* request body sent to POST /api/auth/login that is missing the `email` field, missing the `password` field, or is not valid JSON, the API SHALL return HTTP 400 with a structured error response.

**Validates: Requirements 1.6**

### Property 8: Session retrieval round trip

*For any* user who has successfully logged in and received a JWT token, using that token to call GET /api/auth/me SHALL return the same user object (id, name, email, role) that was returned at login.

**Validates: Requirements 2.1**

### Property 9: Invalid or expired tokens are universally rejected

*For any* request to a protected endpoint with a Bearer token that is malformed (random string), has an invalid signature, or has an expired `exp` claim, the API SHALL return HTTP 401.

**Validates: Requirements 2.2, 3.1, 3.2**

### Property 10: Agent role cannot access admin-only endpoints

*For any* admin-only endpoint (POST /api/users, PATCH /api/users/:id, DELETE /api/users/:id) and *for any* valid JWT belonging to an agent-role user, the API SHALL return HTTP 403.

**Validates: Requirements 3.3, 11.3, 12.3, 13.3**

### Property 11: Valid ticket creation produces correct defaults

*For any* valid ticket creation input (title ≤ 200 chars, non-empty; description ≤ 5000 chars, non-empty; priority ∈ {"low", "medium", "high"}), the created ticket SHALL have status "Open", a valid UUID as id, the requesting user as createdBy, and timestamps for createdAt and updatedAt.

**Validates: Requirements 4.1, 16.1, 16.2**

### Property 12: Invalid ticket creation input is rejected

*For any* ticket creation request that has a missing/empty title, missing/empty description, missing/empty priority, priority not in {"low","medium","high"}, title > 200 chars, or description > 5000 chars, the API SHALL return HTTP 400 with a structured error identifying the failing fields.

**Validates: Requirements 4.2, 4.3, 4.4, 4.5**

### Property 13: Ticket search and filter results match criteria

*For any* set of tickets in the database and *for any* combination of search keyword and/or status filter, every ticket in the response SHALL satisfy all applied filter criteria: if a search keyword is provided, the ticket's title or description contains it (case-insensitive); if a status filter is provided, the ticket's status matches it exactly.

**Validates: Requirements 5.2, 5.3, 5.4**

### Property 14: Ticket list is ordered by createdAt descending

*For any* response from GET /api/tickets (with or without filters), the tickets in the response array SHALL be ordered such that each ticket's createdAt is ≥ the next ticket's createdAt.

**Validates: Requirements 5.1**

### Property 15: Ticket detail comments are ordered by createdAt ascending

*For any* ticket with one or more comments, the comments array in the GET /api/tickets/:id response SHALL be ordered such that each comment's createdAt is ≤ the next comment's createdAt.

**Validates: Requirements 6.1**

### Property 16: Ticket partial update preserves unmodified fields

*For any* existing ticket and *for any* non-empty subset of updatable fields (title, description, priority, assignedTo) provided in a PATCH request, only the specified fields SHALL change; all other fields SHALL retain their previous values.

**Validates: Requirements 7.1**

### Property 17: Status cannot be modified via ticket PATCH endpoint

*For any* PATCH /api/tickets/:id request body that includes a `status` field (regardless of its value), the API SHALL return HTTP 400 indicating that status changes must use the status transition endpoint.

**Validates: Requirements 7.6**

### Property 18: Whitespace-only comments are rejected

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines, or empty string), submitting it as a comment message SHALL be rejected with HTTP 400 and the comment SHALL not be created.

**Validates: Requirements 9.2**

### Property 19: Duplicate email detection is case-insensitive

*For any* existing user with email E, attempting to create a new user with an email that differs from E only in letter casing SHALL return HTTP 409.

**Validates: Requirements 11.2**

### Property 20: User partial update preserves unmodified fields

*For any* existing user and *for any* non-empty subset of updatable fields (name, email, role, password) provided in a PATCH request, only the specified fields SHALL change; all other fields (except updatedAt) SHALL retain their previous values.

**Validates: Requirements 12.1**

### Property 21: User deletion blocked when references exist

*For any* user who is referenced as createdBy or assignedTo on a ticket, or as createdBy on a comment, attempting to delete that user SHALL return HTTP 409 and the user record SHALL remain in the database.

**Validates: Requirements 13.2**

### Property 22: Passwords stored with bcrypt cost factor ≥ 10

*For any* user created or updated with a password, the stored passwordHash SHALL be a valid bcrypt hash string with a cost factor of at least 10.

**Validates: Requirements 17.1**

### Property 23: Frontend displays only valid transition buttons

*For any* ticket rendered in the detail view, the set of status transition buttons displayed SHALL exactly equal the set of valid target statuses from the ticket's current status per the state machine. Terminal states (Closed, Cancelled) SHALL have zero transition buttons.

**Validates: Requirements 22.1, 22.2, 22.4**

### Property 24: Error responses follow consistent structure

*For any* API request that results in a 400-level error, the response body SHALL conform to the structure `{ error: string, code: string, details?: object }`.

**Validates: Requirements 15.1**

### Property 25: OpenAPI documentation is accessible without authentication

*For any* HTTP GET request to /api-docs (with or without a Bearer token), the API SHALL return a successful HTTP response (2xx) rendering the Swagger UI page.

**Validates: Requirements 23.2, 23.3**

### Non-Property Requirements (Infrastructure)

The following requirements are validated through smoke tests and integration checks rather than property-based tests:

- **Requirement 24 (Docker)** — Validated by running `docker-compose up` and confirming all services start and communicate correctly. This is Infrastructure as Code — PBT does not apply.
- **Requirement 25 (CI)** — Validated by triggering the GitHub Actions workflow and confirming all steps pass. This is pipeline configuration — PBT does not apply.

## API Documentation (OpenAPI / Swagger)

### Integration Approach

The API documentation is auto-generated from a programmatically-defined OpenAPI 3.x specification using `swagger-jsdoc` and served via `swagger-ui-express`.

```mermaid
graph LR
    A[JSDoc annotations in route files] --> B[swagger-jsdoc]
    B --> C[OpenAPI 3.x JSON spec]
    C --> D[swagger-ui-express]
    D --> E["GET /api-docs (no auth)"]
```

### Key Design Decisions

1. **Spec-from-code** — OpenAPI annotations live alongside route handlers (JSDoc comments) so the spec stays in sync with implementation. Changes to a route require updating the annotation in the same file.
2. **No auth on /api-docs** — The Swagger UI route is registered before the auth middleware in the Express pipeline, ensuring unauthenticated access for developer convenience.
3. **securitySchemes** — A `bearerAuth` security scheme is declared globally; protected endpoints reference it via `security: [{ bearerAuth: [] }]`.

### OpenAPI Configuration

```typescript
// src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Support Ticket Management API',
      version: '1.0.0',
      description: 'Internal support ticket management REST API',
    },
    servers: [{ url: '/api', description: 'API server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // Reusable schemas: ErrorResponse, TicketDTO, UserDTO, CommentDTO, etc.
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'], // Path to route files with JSDoc annotations
};

export const swaggerSpec = swaggerJsdoc(options);
export { swaggerUi };
```

### Express Registration

```typescript
// In src/index.ts — registered BEFORE auth middleware
import { swaggerSpec, swaggerUi } from './config/swagger';

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

### Specification Coverage

The OpenAPI document SHALL describe:
- All REST endpoints (auth, tickets, comments, users)
- Request body schemas with field types, required indicators, and validation constraints (min/max length, enum values)
- Response schemas for both success and error cases
- Path parameters and query parameters (search, status filter)
- Authentication requirements per endpoint

---

## Docker Infrastructure

### Container Architecture

```mermaid
graph TB
    subgraph docker-compose
        FE["frontend<br/>(nginx:alpine)"]
        BE["backend-api<br/>(node:22-alpine)"]
        DB["postgres:16-alpine"]
    end

    FE -->|"port 80 → 5173"| Browser
    BE -->|"port 3000"| FE
    BE -->|"port 5432"| DB
    DB --- Volume["pgdata (named volume)"]
```

### Dockerfile — Backend API

```dockerfile
# backend-api/Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/db ./db
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Design decisions:**
- Multi-stage build keeps the production image lean (no devDependencies, no source TypeScript).
- The `db/` directory is copied so the container can run migrations on startup.
- Node.js 22 Alpine base minimizes image size (~180 MB).

### Dockerfile — Frontend

```dockerfile
# ui/Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Design decisions:**
- The built React app is static files served by nginx — no Node.js runtime needed in production.
- A custom `nginx.conf` handles SPA fallback routing (`try_files $uri /index.html`).

### docker-compose.yml Structure

```yaml
# docker-compose.yml (repo root)
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ticket_system
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  backend:
    build:
      context: ./backend-api
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/ticket_system
      JWT_SECRET: ${JWT_SECRET:-a-very-long-secret-key-for-development-only-32chars}
      PORT: "3000"
    depends_on:
      postgres:
        condition: service_healthy
    command: >
      sh -c "node db/migrate.js && node db/seed.js && node dist/index.js"

  frontend:
    build:
      context: ./ui
      dockerfile: Dockerfile
    ports:
      - "5173:80"
    depends_on:
      - backend

volumes:
  pgdata:
```

**Key design decisions:**
- **Named volume `pgdata`** — PostgreSQL data persists across `docker-compose down` / `up` cycles.
- **Health check + `depends_on` condition** — Backend starts only after PostgreSQL accepts connections (prevents migration failures).
- **Auto-migration on start** — The backend `command` runs `migrate.js` and `seed.js` before starting the server, ensuring the database is initialized on first start.
- **Environment variables** — Passed via the `environment` section; production deployments can substitute an `env_file` reference.

### .dockerignore Files

Both contexts include `.dockerignore` files to exclude:
```
node_modules
.env
.env.*
dist
.git
*.log
```

---

## CI Pipeline (GitHub Actions)

### Workflow Architecture

```mermaid
graph LR
    Trigger["push to main<br/>PR → main"] --> Install["Install<br/>(npm ci)"]
    Install --> Lint["Lint<br/>(ESLint)"]
    Lint --> Build["Build<br/>(TypeScript + Vite)"]
    Build --> Test["Test<br/>(Jest + PG service)"]
```

**Fail-fast:** Each step depends on the previous; any failure stops the pipeline immediately.

### Workflow Configuration

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: ticket_system_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/ticket_system_test
      JWT_SECRET: ci-test-secret-key-at-least-32-characters-long
      PORT: "3000"

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "npm"

      # Install all dependencies
      - name: Install backend dependencies
        run: npm ci
        working-directory: backend-api

      - name: Install frontend dependencies
        run: npm ci
        working-directory: ui

      # Lint
      - name: Lint backend
        run: npm run lint
        working-directory: backend-api

      - name: Lint frontend
        run: npm run lint
        working-directory: ui

      # Build
      - name: Build backend
        run: npm run build
        working-directory: backend-api

      - name: Build frontend
        run: npm run build
        working-directory: ui

      # Test (backend with PostgreSQL service container)
      - name: Run migrations
        run: node db/migrate.js
        working-directory: backend-api

      - name: Run backend tests
        run: npm test
        working-directory: backend-api
```

### CI Design Decisions

1. **Single job, sequential steps** — Keeps the pipeline simple and ensures fail-fast ordering (install → lint → build → test).
2. **PostgreSQL service container** — GitHub Actions provisions a real Postgres instance for integration tests; credentials match the test env vars.
3. **Node.js 22** — Matches `.nvmrc` and production runtime.
4. **`npm ci`** — Installs from lockfile for reproducible, deterministic builds.
5. **Separate working directories** — backend-api and ui are independent packages; each gets its own install/lint/build step.
6. **Migrations before tests** — The migration step runs against the test database before the test suite executes.

---

## Error Handling

### Backend Error Strategy

| Error Type | HTTP Status | Response Format | Example |
|-----------|------------|-----------------|---------|
| Validation failure | 400 | `{ error, code: "VALIDATION_ERROR", details: { field: reason } }` | Missing title field |
| Authentication failure | 401 | `{ error, code: "UNAUTHORIZED" }` | Invalid/expired JWT |
| Authorization failure | 403 | `{ error, code: "FORBIDDEN" }` | Agent accessing admin endpoint |
| Resource not found | 404 | `{ error, code: "NOT_FOUND" }` | Non-existent ticket UUID |
| Conflict | 409 | `{ error, code: "CONFLICT" }` | Invalid state transition, duplicate email |
| Server error | 500 | `{ error: "Internal server error", code: "INTERNAL_ERROR" }` | Unexpected exception |

### Error Handling Principles

1. **Never expose internals** — 500 responses exclude stack traces, file paths, SQL, and env vars.
2. **Generic auth failures** — Login failures (wrong email or password) return the same error message to prevent user enumeration.
3. **Field-level detail on validation** — 400 responses include `details` mapping field names to specific failure reasons.
4. **Idempotent error messages** — Same invalid input always produces the same error response.

### Global Error Middleware

```typescript
// Catches all unhandled errors in the Express pipeline
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message, code: "VALIDATION_ERROR", details: err.details });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message, code: "NOT_FOUND" });
  }
  if (err instanceof ConflictError) {
    return res.status(409).json({ error: err.message, code: "CONFLICT" });
  }
  // Log full error internally, return sanitized response
  logger.error(err);
  return res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
};
```

### Frontend Error Handling

1. **API errors** — Displayed inline adjacent to the form/action that triggered them. Error messages come from the `error` field of the response body.
2. **Network failures** — Detected via catch on fetch/axios. Display "Service unavailable" with a retry action.
3. **401 responses** — Trigger automatic logout: clear sessionStorage, reset authStore, redirect to /login.
4. **409 on status transition** — Display a toast/alert indicating the transition is not allowed; do not reload the page.

## Testing Strategy

### Testing Pyramid

```
         ╱╲
        ╱  ╲        E2E (manual / optional)
       ╱────╲
      ╱      ╲      Integration Tests (API-level, DB-backed)
     ╱────────╲
    ╱          ╲    Property-Based Tests (state machine, validation, services)
   ╱────────────╲
  ╱              ╲  Unit Tests (pure functions, utilities)
 ╱────────────────╲
```

### Property-Based Testing

**Library:** [fast-check](https://github.com/dubzzz/fast-check) (TypeScript-native PBT library)

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: support-ticket-management, Property {N}: {title}`

**Key property test targets:**
- State machine transition logic (Properties 1, 2) — pure function, no DB needed
- Input validation functions (Properties 7, 12, 18) — pure functions
- JWT claim verification (Property 4) — decode and validate
- Partial update field preservation (Properties 16, 20)
- passwordHash exclusion from response serialization (Property 3)
- Search/filter correctness (Property 13) — test against in-memory data or test DB

### Unit Tests

- Specific examples for each service function
- Edge cases: empty strings, boundary lengths (200, 5000, 2000 chars), null assignedTo
- Error conditions: non-existent UUIDs, duplicate emails

### Integration Tests

As specified in Requirements 19 and 20:
- **State machine integration tests** — all valid and invalid transitions via HTTP (10 tests)
- **Auth integration tests** — login flows, token validation, role enforcement (8 tests)

**Test setup:** Use a dedicated test PostgreSQL database with transaction rollback or truncation between tests.

### Frontend Tests

- Component tests with React Testing Library
- Role-based rendering tests (admin vs agent navigation)
- Form validation tests
- Error display tests (API errors, network failures)
- State transition button rendering tests (Property 23)

### Test Commands

```bash
# Run all backend tests
npm run test --prefix backend-api

# Run property-based tests only
npm run test:properties --prefix backend-api

# Run integration tests (requires test DB)
npm run test:integration --prefix backend-api

# Run frontend tests
npm run test --prefix ui
```

### CI Integration

All test suites run automatically in the GitHub Actions CI pipeline (see [CI Pipeline section](#ci-pipeline-github-actions)):
- **Lint** — ESLint runs on both backend and frontend source before tests execute.
- **Build** — TypeScript compilation (backend) and Vite production build (frontend) must succeed before test step.
- **Test** — Backend tests run against a PostgreSQL service container provisioned by the CI workflow. This ensures integration tests hit a real database, matching production behavior.
- **Fail-fast** — Any step failure (lint, build, or test) halts the pipeline immediately, providing fast feedback.

### Docker-Based Local Testing

For full-stack integration testing, developers can use Docker Compose:
```bash
docker-compose up --build    # Start all services with fresh builds
docker-compose down -v       # Tear down including volumes (clean slate)
```

The Docker setup automatically runs migrations and seeds on first PostgreSQL start, providing a zero-configuration development environment for manual testing and exploratory QA.

