# Implementation Plan: Support Ticket Management System

## Overview

This plan implements a full-stack internal support ticket management system with a React 19 + Vite 6 frontend (ui/) and Node.js 22 + Express 5 + TypeScript backend (backend-api/). The implementation proceeds bottom-up: database schema → backend auth → backend ticket/comment/user services → frontend auth → frontend ticket management → frontend user management → integration tests → documentation artifacts.

## Tasks

- [x] 1. Project scaffolding and core setup
  - [x] 1.1 Initialize backend-api project with TypeScript and Express 5
    - Create `backend-api/` directory with `package.json` (Node.js 22, Express 5, TypeScript 5.x)
    - Configure `tsconfig.json` with strict mode, ES2022 target, Node module resolution
    - Install dependencies: express, typescript, jsonwebtoken, bcryptjs, pg, uuid, dotenv, cors
    - Install dev dependencies: @types/express, @types/jsonwebtoken, @types/bcryptjs, @types/pg, @types/cors, ts-node, nodemon, vitest, fast-check, supertest, @types/supertest
    - Create directory structure: `src/routes/`, `src/services/`, `src/repositories/`, `src/middleware/`, `src/utils/`, `src/types/`
    - Create `src/index.ts` entry point with Express app setup, CORS, JSON parsing, and startup guard for JWT_SECRET length ≥ 32
    - Create `.env.example` with DATABASE_URL, JWT_SECRET, PORT placeholders
    - Add `backend-api/.gitignore` (node_modules, dist, .env)
    - _Requirements: 18.1, 17.2, 17.3, 17.5_

  - [x] 1.2 Initialize ui project with React 19, Vite 6, Zustand 5, and Tailwind CSS 4
    - Create `ui/` directory using Vite React-TS template (React 19, Vite 6)
    - Install dependencies: zustand, axios, react-router-dom
    - Install Tailwind CSS 4 and configure
    - Create directory structure: `src/pages/`, `src/components/`, `src/stores/`, `src/api/`, `src/types/`
    - Create `src/api/client.ts` with Axios instance configured with base URL from env and interceptor for 401 → logout
    - Add `ui/.env.example` with VITE_API_URL placeholder
    - _Requirements: 14.1, 3.5_

  - [x] 1.3 Define shared TypeScript interfaces and types
    - Create `backend-api/src/types/index.ts` with all DTOs: UserDTO, TicketDTO, TicketDetailDTO, CommentDTO, ErrorResponse
    - Create `backend-api/src/types/requests.ts` with request interfaces: LoginRequest, CreateTicketRequest, UpdateTicketRequest, TransitionStatusRequest, CreateCommentRequest, CreateUserRequest, UpdateUserRequest
    - Define TicketStatus type as union: "Open" | "In Progress" | "Resolved" | "Closed" | "Cancelled"
    - Create `ui/src/types/index.ts` mirroring backend DTOs for frontend use
    - _Requirements: 15.1, 8.3_

- [x] 2. Database setup and migrations
  - [x] 2.1 Create database migration files
    - Create `backend-api/db/scripts/create-database.sql` with CREATE DATABASE IF NOT EXISTS logic
    - Create `backend-api/db/scripts/setup.sh` executable script that derives admin URL from DATABASE_URL, creates database, runs migrations, and seeds data
    - Create `backend-api/db/migrations/001_create_users.sql` with users table (UUID PK, name, email UNIQUE, passwordHash, role CHECK, timestamps) using CREATE TABLE IF NOT EXISTS
    - Create `backend-api/db/migrations/002_create_tickets.sql` with tickets table (UUID PK, title, description, priority CHECK, status CHECK DEFAULT 'Open', assignedTo FK, createdBy FK, timestamps, indexes) using CREATE TABLE/INDEX IF NOT EXISTS
    - Create `backend-api/db/migrations/003_create_comments.sql` with comments table (UUID PK, ticketId FK CASCADE, createdBy FK, message, createdAt, index on ticketId) using CREATE TABLE/INDEX IF NOT EXISTS
    - Create `backend-api/db/migrate.js` Node.js script to run SQL migration files in order using pg Pool and DATABASE_URL
    - Create `backend-api/db/seeds/001_users.sql` documenting seed data
    - Create `backend-api/src/utils/db.ts` with PostgreSQL connection pool using pg Pool and DATABASE_URL
    - DATABASE_URL format: `postgresql://username:password@host:port/database_name`
    - _Requirements: 16.1, 16.2, 16.3, 16.5, 16.6, 16.8, 16.9, 16.10, 16.11_

  - [x] 2.2 Create seed data script
    - Create `backend-api/db/seed.js` Node.js script that inserts default admin (admin@example.com / Admin123!) and agent (agent@example.com / Agent123!) users
    - Use INSERT ... ON CONFLICT DO NOTHING for idempotency
    - Hash passwords with bcrypt cost factor 10
    - Add npm scripts to package.json: `db:create`, `db:migrate`, `db:seed`, `db:setup` (runs create → migrate → seed)
    - Keep legacy `npm run migrate` and `npm run seed` scripts for backward compatibility
    - _Requirements: 16.4, 16.9, 16.10, 17.1_

- [x] 3. Backend authentication and middleware
  - [x] 3.1 Implement auth middleware (JWT verification and role enforcement)
    - Create `backend-api/src/middleware/auth.ts` with `authMiddleware` that extracts Bearer token, verifies JWT signature and expiry, attaches decoded user to `req.user`
    - Create `requireAdmin` middleware that checks `req.user.role === "admin"` or returns 403
    - Return structured error responses: 401 for missing/invalid/expired tokens, 403 for insufficient role
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.2 Implement auth service and login endpoint
    - Create `backend-api/src/repositories/userRepository.ts` with `findByEmail(email)` method using parameterized query
    - Create `backend-api/src/services/authService.ts` with `login(email, password)` that validates credentials, issues JWT with sub/email/role/iat/exp claims (24h expiry)
    - Create `backend-api/src/routes/auth.ts` with POST /api/auth/login and GET /api/auth/me routes
    - Validate request body: return 400 if email or password missing
    - Return generic "Invalid credentials" message for both wrong email and wrong password (no user enumeration)
    - Never include passwordHash in responses
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2_

  - [x] 3.3 Write property tests for auth module
    - **Property 4: JWT contains required claims with correct expiry**
    - **Property 5: Login authentication round trip**
    - **Property 6: Wrong password is always rejected**
    - **Property 7: Malformed login requests are rejected**
    - **Property 8: Session retrieval round trip**
    - **Property 9: Invalid or expired tokens are universally rejected**
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.6, 2.1, 2.2, 3.1, 3.2**

- [x] 4. Backend ticket CRUD and state machine
  - [x] 4.1 Implement ticket repository
    - Create `backend-api/src/repositories/ticketRepository.ts` with methods: create, findAll, findById, update, updateStatus
    - Implement search via PostgreSQL `ILIKE` on title and description
    - Implement status filter via WHERE clause
    - Use parameterized queries for all operations
    - Return tickets ordered by createdAt DESC
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 16.5_

  - [x] 4.2 Implement ticket state machine service
    - Create `backend-api/src/services/ticketStateMachine.ts` as a pure function module
    - Define transition table: Open→[In Progress, Cancelled], In Progress→[Resolved, Cancelled], Resolved→[Closed], Closed→[], Cancelled→[]
    - Export `isValidTransition(currentStatus, targetStatus): boolean`
    - Export `getValidTransitions(currentStatus): TicketStatus[]`
    - _Requirements: 8.3, 8.4, 8.5_

  - [x] 4.3 Implement ticket service with business logic
    - Create `backend-api/src/services/ticketService.ts` with methods: createTicket, getTickets, getTicketById, updateTicket, transitionStatus
    - Enforce state machine via ticketStateMachine for status transitions (return 409 on invalid)
    - Reject status field in PATCH /api/tickets/:id (return 400)
    - Validate input: title max 200 chars, description max 5000 chars, priority in enum
    - Validate assignedTo references existing user
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.6, 8.7_

  - [x] 4.4 Implement ticket routes
    - Create `backend-api/src/routes/tickets.ts` with all ticket endpoints
    - POST /api/tickets — create ticket (authenticated)
    - GET /api/tickets — list/search/filter tickets (authenticated)
    - GET /api/tickets/:id — get ticket detail with comments (authenticated)
    - PATCH /api/tickets/:id — update ticket fields (authenticated)
    - PATCH /api/tickets/:id/status — transition status (authenticated)
    - Apply authMiddleware to all routes
    - _Requirements: 4.1, 5.1, 6.1, 6.2, 7.1, 8.1_

  - [x] 4.5 Write property tests for ticket state machine
    - **Property 1: Valid state machine transitions succeed**
    - **Property 2: Invalid state machine transitions are rejected and preserve state**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**

  - [x] 4.6 Write property tests for ticket creation and updates
    - **Property 11: Valid ticket creation produces correct defaults**
    - **Property 12: Invalid ticket creation input is rejected**
    - **Property 13: Ticket search and filter results match criteria**
    - **Property 14: Ticket list is ordered by createdAt descending**
    - **Property 16: Ticket partial update preserves unmodified fields**
    - **Property 17: Status cannot be modified via ticket PATCH endpoint**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 7.1, 7.6, 16.1, 16.2**

- [x] 5. Backend comments
  - [x] 5.1 Implement comment repository and service
    - Create `backend-api/src/repositories/commentRepository.ts` with methods: create, findByTicketId (ordered by createdAt ASC)
    - Create `backend-api/src/services/commentService.ts` with createComment method
    - Validate: message not empty/whitespace-only, max 2000 chars, ticket must exist
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 5.2 Implement comment routes
    - Create `backend-api/src/routes/comments.ts` with POST /api/tickets/:id/comments (authenticated)
    - Wire into ticket detail response (comments included in GET /api/tickets/:id)
    - _Requirements: 9.1, 6.1_

  - [x] 5.3 Write property tests for comments
    - **Property 15: Ticket detail comments are ordered by createdAt ascending**
    - **Property 18: Whitespace-only comments are rejected**
    - **Validates: Requirements 6.1, 9.2**

- [x] 6. Backend user management (admin-only)
  - [x] 6.1 Implement user repository
    - Extend `backend-api/src/repositories/userRepository.ts` with methods: findAll, findById, create, update, deleteUser, findByEmailCaseInsensitive
    - Check for existing references (tickets, comments) before delete
    - Never return passwordHash in query results
    - _Requirements: 10.1, 10.2, 11.1, 12.1, 13.1, 13.2_

  - [x] 6.2 Implement user service with business logic
    - Create `backend-api/src/services/userService.ts` with methods: listUsers, createUser, updateUser, deleteUser
    - Validate: name max 100 chars (create) / 200 chars (update), email format, password min 6 chars, role in enum
    - Case-insensitive duplicate email check
    - Hash password with bcrypt cost factor ≥ 10
    - Block self-deletion
    - Block deletion of users with ticket/comment references (HTTP 409)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 13.1, 13.2, 13.3, 13.4, 13.5, 17.1_

  - [x] 6.3 Implement user management routes
    - Create `backend-api/src/routes/users.ts` with endpoints
    - GET /api/users — list users (authenticated, any role)
    - POST /api/users — create user (admin only)
    - PATCH /api/users/:id — update user (admin only)
    - DELETE /api/users/:id — delete user (admin only)
    - Apply authMiddleware + requireAdmin to write endpoints
    - _Requirements: 10.1, 11.3, 12.3, 13.3_

  - [x] 6.4 Write property tests for user management
    - **Property 3: passwordHash is never exposed in any API response**
    - **Property 10: Agent role cannot access admin-only endpoints**
    - **Property 19: Duplicate email detection is case-insensitive**
    - **Property 20: User partial update preserves unmodified fields**
    - **Property 21: User deletion blocked when references exist**
    - **Property 22: Passwords stored with bcrypt cost factor ≥ 10**
    - **Validates: Requirements 1.5, 10.2, 11.2, 11.3, 12.1, 12.3, 13.2, 13.3, 17.1, 17.4**

- [x] 7. Backend wiring and final error handling
  - [x] 7.1 Implement global error handling middleware and custom error classes
    - Create `backend-api/src/utils/errors.ts` with custom error classes: ValidationError, NotFoundError, ConflictError, UnauthorizedError, ForbiddenError
    - Create `backend-api/src/middleware/errorHandler.ts` implementing global error middleware
    - Ensure 500 responses never expose stack traces, file paths, SQL, or env vars
    - Return consistent `{ error, code, details? }` structure for all error responses
    - _Requirements: 15.1, 15.2_

  - [x] 7.2 Wire user routes and finalize Express app
    - Update `backend-api/src/index.ts` to mount user route module under /api/users prefix
    - Apply authMiddleware globally except POST /api/auth/login
    - Apply errorHandler as final middleware
    - Verify the server starts with `npm run dev` and responds to health check
    - _Requirements: 18.1, 18.4_

  - [x] 7.3 Write property test for error response structure
    - **Property 24: Error responses follow consistent structure**
    - **Validates: Requirements 15.1**

- [x] 8. Checkpoint — Backend complete
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 9. Frontend authentication
  - [x] 9.1 Implement auth store (Zustand) and login page
    - Create `ui/src/stores/authStore.ts` with AuthState interface: token, user, isLoading, login, logout, restoreSession
    - Store token in sessionStorage; restoreSession calls GET /api/auth/me on app load
    - Create `ui/src/pages/LoginPage.tsx` with email/password form, error display, submit handler calling authStore.login
    - Style with Tailwind CSS 4
    - _Requirements: 1.1, 2.3, 2.4, 3.5, 15.3_

  - [x] 9.2 Implement protected route component and app routing
    - Create `ui/src/components/ProtectedRoute.tsx` that checks sessionStorage token, validates role, shows loading state during session restore
    - Redirect to /login if no token; redirect to /tickets if agent accesses admin routes
    - Update `ui/src/App.tsx` with react-router-dom routes: /login, /tickets, /tickets/:id, /tickets/new, /users, /users/new, /users/:id/edit
    - Wrap authenticated routes with ProtectedRoute
    - _Requirements: 3.4, 14.4, 14.5_

  - [x] 9.3 Implement navigation bar with role-based rendering
    - Create `ui/src/components/NavBar.tsx` displaying user name/role, navigation links, logout button
    - Show "Users" nav item only for admin role
    - Handle logout: clear sessionStorage, reset authStore, redirect to /login
    - _Requirements: 14.1, 14.2, 14.3, 2.3_

- [x] 10. Frontend ticket management
  - [x] 10.1 Implement ticket store (Zustand)
    - Create `ui/src/stores/ticketStore.ts` with TicketState interface
    - Methods: fetchTickets (with search/status params), fetchTicket, createTicket, updateTicket, transitionStatus, addComment
    - Handle API errors and set error state for display
    - _Requirements: 5.1, 6.1, 4.1, 7.1, 8.1, 9.1_

  - [x] 10.2 Implement ticket list page with search and filter
    - Create `ui/src/pages/TicketListPage.tsx` displaying tickets in a table/list
    - Add search input (keyword) and status dropdown filter
    - Show ticket title, priority, status, assignedTo, createdAt
    - Link each ticket to detail page
    - Add "Create Ticket" button linking to /tickets/new
    - Style with Tailwind CSS 4
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 10.3 Implement create ticket page
    - Create `ui/src/pages/CreateTicketPage.tsx` with form: title, description, priority dropdown
    - Client-side validation: required fields, title max 200, description max 5000
    - Display API validation errors inline
    - Redirect to ticket list on success
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 15.3_

  - [x] 10.4 Implement ticket detail page with status transitions and comments
    - Create `ui/src/pages/TicketDetailPage.tsx` showing full ticket info, edit form, status transition buttons, and comment list
    - Display only valid transition buttons based on current status (use state machine logic)
    - Hide all transition buttons for terminal states (Closed, Cancelled)
    - Show 409 error as toast/alert when invalid transition attempted
    - Update UI immediately on successful transition
    - Display comments ordered by createdAt ascending
    - Add comment form with validation (not empty/whitespace, max 2000 chars)
    - _Requirements: 6.1, 7.1, 8.1, 9.1, 22.1, 22.2, 22.3, 22.4, 22.5, 15.3_

  - [x] 10.5 Write frontend tests for status transition button rendering
    - **Property 23: Frontend displays only valid transition buttons**
    - **Validates: Requirements 22.1, 22.2, 22.4**

- [x] 11. Frontend user management (admin-only)
  - [x] 11.1 Implement user store (Zustand) and user list page
    - Create `ui/src/stores/userStore.ts` with UserState interface
    - Methods: fetchUsers, createUser, updateUser, deleteUser
    - Create `ui/src/pages/UserListPage.tsx` showing user table with name, email, role, actions (edit, delete)
    - Confirm before delete; show 409 error if user has references
    - _Requirements: 10.1, 13.1, 13.2_

  - [x] 11.2 Implement create and edit user pages
    - Create `ui/src/pages/CreateUserPage.tsx` with form: name, email, password, role dropdown
    - Create `ui/src/pages/EditUserPage.tsx` with pre-populated form, optional password field
    - Client-side validation matching backend rules
    - Display API errors inline (duplicate email 409, validation 400)
    - _Requirements: 11.1, 11.4, 11.5, 11.6, 12.1, 12.5, 12.6, 15.3_

- [x] 12. Checkpoint — Frontend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Integration tests
  - [x] 13.1 Write state machine integration tests
    - Create `backend-api/tests/integration/stateMachine.test.ts`
    - Test all 5 valid transitions: Open→In Progress, Open→Cancelled, In Progress→Resolved, In Progress→Cancelled, Resolved→Closed (expect HTTP 200)
    - Test 5 invalid transitions: Open→Resolved, Open→Closed, In Progress→Open, Closed→any, Cancelled→any (expect HTTP 409)
    - Use supertest against Express app with test database
    - Setup/teardown: create test user, authenticate, create test ticket per test
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10_

  - [x] 13.2 Write authentication and authorization integration tests
    - Create `backend-api/tests/integration/auth.test.ts`
    - Test valid login returns 200 with token and user object
    - Test wrong password returns 401 without token
    - Test non-existent email returns 401 without token
    - Test missing Bearer token returns 401
    - Test expired JWT returns 401
    - Test agent calling DELETE /api/users/:id returns 403
    - Test admin creating user returns 201 without passwordHash
    - Test GET /api/auth/me with valid token returns user without passwordHash
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8_

- [x] 14. Documentation artifacts
  - [x] 14.1 Create project README and environment documentation
    - Create/update root `README.md` with: project overview, prerequisites (Node.js 22, PostgreSQL), environment variable setup, dependency installation, migration command, seed command, start commands for backend and frontend
    - Create root `.env.example` with all required env vars: DATABASE_URL, JWT_SECRET, PORT
    - Ensure .gitignore at root includes .env files
    - _Requirements: 18.3, 17.2, 17.3, 21.8_

  - [x] 14.2 Create design and workflow documentation
    - Create `docs/design-notes.md` covering architectural decisions (layered backend, Zustand stores, JWT stateless auth)
    - Create `docs/state-machine.md` documenting ticket lifecycle states and transitions
    - Create `docs/auth-design.md` documenting authentication flow, JWT structure, middleware chain
    - Create `docs/nfr-checklist.md` verifying each non-functional requirement is met
    - Create `docs/debugging-notes.md` as template for documenting debugging sessions
    - Create `tool-workflow.md` at repository root documenting AI tool usage methodology
    - _Requirements: 21.1, 21.2, 21.4, 21.5, 21.6_

- [x] 15. Final checkpoint — All tests pass and project is complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. API Documentation via OpenAPI Specification
  - [ ] 16.1 Install swagger-jsdoc and swagger-ui-express with type definitions
    - Run `npm install swagger-jsdoc swagger-ui-express` in backend-api
    - Run `npm install -D @types/swagger-jsdoc @types/swagger-ui-express` in backend-api
    - _Requirements: 23.1, 23.2_

  - [ ] 16.2 Create src/config/swagger.ts with OpenAPI 3.x configuration
    - Define OpenAPI 3.0.3 specification with info (title, version, description)
    - Configure servers array pointing to `/api`
    - Define `securitySchemes` with bearerAuth (type: http, scheme: bearer, bearerFormat: JWT)
    - Define reusable schemas: ErrorResponse, UserDTO, TicketDTO, TicketDetailDTO, CommentDTO, CreateTicketRequest, UpdateTicketRequest, TransitionStatusRequest, CreateCommentRequest, CreateUserRequest, UpdateUserRequest, LoginRequest, LoginResponse
    - Set `apis` glob to `./src/routes/*.ts` for JSDoc annotation discovery
    - Export `swaggerSpec` and `swaggerUi` for use in index.ts
    - _Requirements: 23.1, 23.4, 23.5, 23.6_

  - [ ] 16.3 Add JSDoc OpenAPI annotations to src/routes/auth.ts
    - Annotate POST /api/auth/login with request body schema, 200/401/400 responses
    - Annotate GET /api/auth/me with security requirement, 200/401 responses
    - Include field types, required indicators, and validation constraints
    - _Requirements: 23.4, 23.5, 23.7_

  - [ ] 16.4 Add JSDoc OpenAPI annotations to src/routes/tickets.ts
    - Annotate POST /api/tickets with request body, 201/400/401 responses
    - Annotate GET /api/tickets with query parameters (search, status), 200/401 responses
    - Annotate GET /api/tickets/:id with path parameter, 200/404/401 responses
    - Annotate PATCH /api/tickets/:id with request body, 200/400/404/401 responses
    - Annotate PATCH /api/tickets/:id/status with request body, 200/400/409/404/401 responses
    - _Requirements: 23.4, 23.5, 23.7_

  - [ ] 16.5 Add JSDoc OpenAPI annotations to src/routes/comments.ts
    - Annotate POST /api/tickets/:id/comments with request body, 201/400/404/401 responses
    - Include message field max length constraint in schema
    - _Requirements: 23.4, 23.5, 23.7_

  - [ ] 16.6 Add JSDoc OpenAPI annotations to src/routes/users.ts
    - Annotate GET /api/users with 200/401 responses
    - Annotate POST /api/users with request body, security, 201/400/409/403 responses
    - Annotate PATCH /api/users/:id with request body, security, 200/400/404/409/403 responses
    - Annotate DELETE /api/users/:id with security, 200/404/409/403 responses
    - _Requirements: 23.4, 23.5, 23.6, 23.7_

  - [ ] 16.7 Register /api-docs route BEFORE auth middleware in src/index.ts
    - Import swaggerSpec and swaggerUi from src/config/swagger
    - Add `app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))` before authMiddleware registration
    - Ensure /api-docs is accessible without authentication
    - _Requirements: 23.2, 23.3_

  - [ ]* 16.8 Write smoke test verifying GET /api-docs returns 200 without auth
    - Create `backend-api/tests/integration/swagger.test.ts`
    - Test that GET /api-docs returns HTTP 200 without any Authorization header
    - Test that response content-type includes text/html (Swagger UI page)
    - **Property 25: OpenAPI documentation is accessible without authentication**
    - **Validates: Requirements 23.2, 23.3**

- [ ] 17. Docker Setup for Containerized Development and Deployment
  - [ ] 17.1 Create backend-api/Dockerfile (multi-stage, Node.js 22 Alpine)
    - Stage 1 (builder): FROM node:22-alpine, WORKDIR /app, copy package files, npm ci, copy source, npm run build
    - Stage 2 (production): FROM node:22-alpine, WORKDIR /app, copy dist, node_modules, package.json, and db/ from builder
    - EXPOSE 3000, CMD ["node", "dist/index.js"]
    - _Requirements: 24.1_

  - [ ] 17.2 Create backend-api/.dockerignore
    - Exclude: node_modules, .env, .env.*, dist, .git, *.log, tests, coverage
    - _Requirements: 24.8_

  - [ ] 17.3 Create ui/Dockerfile (multi-stage, nginx:alpine for serving built React)
    - Stage 1 (builder): FROM node:22-alpine, WORKDIR /app, copy package files, npm ci, copy source, npm run build
    - Stage 2 (production): FROM nginx:alpine, copy built dist to /usr/share/nginx/html, copy nginx.conf
    - EXPOSE 80, CMD ["nginx", "-g", "daemon off;"]
    - _Requirements: 24.2_

  - [ ] 17.4 Create ui/nginx.conf with SPA fallback routing
    - Configure server block listening on port 80
    - Set root to /usr/share/nginx/html
    - Add `try_files $uri $uri/ /index.html` for SPA client-side routing support
    - Include gzip compression and appropriate cache headers for static assets
    - _Requirements: 24.2_

  - [ ] 17.5 Create ui/.dockerignore
    - Exclude: node_modules, .env, .env.*, dist, .git, *.log, coverage
    - _Requirements: 24.8_

  - [ ] 17.6 Create docker-compose.yml at repo root with postgres, backend, and frontend services
    - Define `postgres` service: image postgres:16-alpine, POSTGRES_USER/PASSWORD/DB env vars, port 5432, named volume `pgdata`, healthcheck with pg_isready
    - Define `backend` service: build context ./backend-api, port 3000, environment (DATABASE_URL, JWT_SECRET, PORT), depends_on postgres with condition service_healthy, command runs migrations + seed + server
    - Define `frontend` service: build context ./ui, port 5173:80, depends_on backend
    - Define named volume `pgdata` for PostgreSQL data persistence
    - _Requirements: 24.3, 24.4, 24.5, 24.6, 24.7, 24.9_

- [ ] 18. CI Workflow via GitHub Actions
  - [ ] 18.1 Create .github/workflows/ci.yml
    - Configure triggers: push to main branch, pull_request targeting main branch
    - Define single job `ci` running on ubuntu-latest
    - Add PostgreSQL 16-alpine service container with health check, credentials (postgres/postgres), and exposed port 5432
    - Set job-level env vars: DATABASE_URL, JWT_SECRET (≥32 chars), PORT
    - _Requirements: 25.1, 25.7_

  - [ ] 18.2 Configure CI steps with fail-fast ordering
    - Step 1: actions/checkout@v4
    - Step 2: actions/setup-node@v4 with node-version 22 and npm cache
    - Step 3: Install backend dependencies (`npm ci` in backend-api/)
    - Step 4: Install frontend dependencies (`npm ci` in ui/)
    - Step 5: Lint backend (`npm run lint` in backend-api/)
    - Step 6: Lint frontend (`npm run lint` in ui/)
    - Step 7: Build backend (`npm run build` in backend-api/)
    - Step 8: Build frontend (`npm run build` in ui/)
    - Step 9: Run migrations (`node db/migrate.js` in backend-api/)
    - Step 10: Run backend tests (`npm test` in backend-api/)
    - Ensure sequential step ordering so any failure stops the pipeline
    - _Requirements: 25.2, 25.3, 25.4, 25.5, 25.6, 25.8_

- [ ] 19. Final checkpoint — New features complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Backend uses TypeScript throughout with strict mode enabled
- Frontend uses React 19 + Vite 6 + Zustand 5 + Tailwind CSS 4
- All database operations use parameterized queries (no raw string interpolation)
- fast-check is the PBT library for TypeScript property-based tests
- Integration tests use supertest against the Express app with a dedicated test PostgreSQL database

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["6.2"] },
    { "id": 1, "tasks": ["6.3"] },
    { "id": 2, "tasks": ["6.4", "7.2"] },
    { "id": 3, "tasks": ["7.3", "9.1"] },
    { "id": 4, "tasks": ["9.2", "9.3"] },
    { "id": 5, "tasks": ["10.1", "11.1"] },
    { "id": 6, "tasks": ["10.2", "10.3", "11.2"] },
    { "id": 7, "tasks": ["10.4"] },
    { "id": 8, "tasks": ["10.5", "13.1", "13.2"] },
    { "id": 9, "tasks": ["14.1", "14.2"] },
    { "id": 10, "tasks": ["16.1", "17.1", "17.2", "17.3", "17.4", "17.5", "18.1"] },
    { "id": 11, "tasks": ["16.2", "17.6", "18.2"] },
    { "id": 12, "tasks": ["16.3", "16.4", "16.5", "16.6"] },
    { "id": 13, "tasks": ["16.7"] },
    { "id": 14, "tasks": ["16.8"] }
  ]
}
```
