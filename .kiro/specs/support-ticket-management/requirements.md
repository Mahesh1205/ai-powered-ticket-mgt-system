# Requirements Document

## Introduction

An internal support ticket management system that enables authenticated users to create, progress, and manage support tickets through a defined lifecycle. The system provides role-based access control with agent and admin roles, a strict state-machine-enforced ticket workflow, commenting capabilities, and full user management for administrators. All data persists in PostgreSQL. The tech stack comprises a React 19 (Vite 6) SPA frontend with Zustand 5 state management and Tailwind CSS 4 for styling, a Node.js 22 + Express 5 REST API backend in TypeScript 5.x, custom JWT authentication (jsonwebtoken), and bcrypt password hashing. All dependencies use their latest stable versions as of July 2025.

## Glossary

- **System**: The complete support ticket management application (frontend + backend + database)
- **API**: The Node.js + Express REST API backend
- **Frontend**: The React 19 (Vite 6) single-page application styled with Tailwind CSS 4
- **Auth_Service**: The authentication module responsible for login, token issuance, and session validation
- **Ticket_Service**: The backend service managing ticket CRUD operations
- **TicketStatus_Service**: The backend service enforcing the ticket status state machine transitions
- **Comment_Service**: The backend service managing ticket comments
- **User_Service**: The backend service managing user CRUD operations
- **Auth_Middleware**: Express middleware that validates JWT tokens and enforces role-based access
- **Agent**: An authenticated user with the "agent" role who can manage tickets and comments
- **Admin**: An authenticated user with the "admin" role who can manage tickets, comments, and users
- **Ticket**: A support request with title, description, priority, status, and assignment
- **State_Machine**: The defined set of valid ticket status transitions enforced by TicketStatus_Service
- **JWT**: A JSON Web Token used for stateless authentication with 24-hour expiry
- **Protected_Route**: A frontend route component that redirects unauthenticated users to login
- **OpenAPI_Specification**: The machine-readable API description document conforming to the OpenAPI 3.x standard
- **Swagger_UI**: The interactive documentation interface rendered from the OpenAPI specification, served at /api-docs
- **CI_Pipeline**: The GitHub Actions automated workflow that runs lint, build, and test steps on code changes
- **Docker_Compose**: The multi-container orchestration configuration (docker-compose.yml) defining backend, frontend, and database services

## Optional Scope (Stretch Goals)

The following items are explicitly out of scope for the core delivery but may be added as stretch goals if time permits:

- **Pagination and sorting** — Server-side pagination (limit/offset or cursor-based) and column sorting for ticket and user lists
- **Priority and assignee filters** — Additional query parameters (GET /api/tickets?priority=high&assignedTo=userId) beyond the core status filter

## Requirements

### Requirement 1: User Authentication via Login

**User Story:** As a user, I want to log in with my email and password, so that I can access the system securely.

#### Acceptance Criteria

1. WHEN a user submits a request to POST /api/auth/login with a JSON body containing a registered email and a password that matches the stored credential, THE Auth_Service SHALL return HTTP 200 with a JSON body containing a JWT token and the user object (id, name, email, role)
2. WHEN a user submits a request to POST /api/auth/login with a registered email and a password that does not match the stored credential, THE Auth_Service SHALL return HTTP 401 with a JSON error response containing an error field indicating invalid credentials, without revealing whether the email or password was incorrect
3. WHEN a user submits a request to POST /api/auth/login with an email that does not exist in the system, THE Auth_Service SHALL return HTTP 401 with a JSON error response containing an error field indicating invalid credentials, without revealing whether the email or password was incorrect
4. THE Auth_Service SHALL issue JWTs with a payload containing sub (userId), email, role, iat, and exp claims with a 24-hour expiry
5. THE Auth_Service SHALL never include the passwordHash field in any response body
6. IF a request to POST /api/auth/login is missing the email field, the password field, or contains a malformed JSON body, THEN THE Auth_Service SHALL return HTTP 400 with a JSON error response containing an error field indicating the validation failure

### Requirement 2: User Session Management

**User Story:** As an authenticated user, I want to retrieve my current session and log out, so that I can verify my identity and end my session securely.

#### Acceptance Criteria

1. WHEN a valid Bearer token is provided to GET /api/auth/me, THE Auth_Service SHALL return HTTP 200 with the current user object (id, name, email, role) excluding the passwordHash field
2. WHEN an invalid or expired token is provided to GET /api/auth/me, THE Auth_Middleware SHALL return HTTP 401 with a structured error response
3. WHEN the user clicks the logout action in the Frontend, THE Frontend SHALL remove the token from sessionStorage in authStore and redirect to the /login page
4. WHEN the Frontend application loads and a token exists in sessionStorage, THE Frontend SHALL send GET /api/auth/me to validate the token and restore the authenticated user state in authStore before rendering protected content

### Requirement 3: Route Protection and Access Control Middleware

**User Story:** As a system administrator, I want all protected endpoints secured by authentication and role checks, so that unauthorized access is prevented.

#### Acceptance Criteria

1. WHEN a request is made to a protected endpoint without a Bearer token in the Authorization header, THE Auth_Middleware SHALL return HTTP 401 with a structured error response
2. WHEN a request is made to a protected endpoint with a malformed, incorrectly-signed, or expired Bearer token, THE Auth_Middleware SHALL return HTTP 401 with a structured error response
3. WHEN a request is made to an admin-only endpoint by an agent-role user, THE Auth_Middleware SHALL return HTTP 403 with a structured error response
4. WHILE no valid token exists in sessionStorage, THE Frontend Protected_Route SHALL redirect the user to the /login page without rendering the protected content
5. WHEN the API returns HTTP 401 to the Frontend, THE Frontend SHALL clear the token from sessionStorage, reset the authStore state, and redirect to /login

### Requirement 4: Create Ticket

**User Story:** As an authenticated user, I want to create a support ticket, so that I can report issues for tracking and resolution.

#### Acceptance Criteria

1. WHEN a user submits a valid ticket creation request to POST /api/tickets with title, description, and priority, THE Ticket_Service SHALL create a new ticket with status "Open", a generated UUID, the requesting user as createdBy, and return HTTP 201 with the created ticket
2. WHEN a ticket creation request is missing required fields (title, description, or priority) or provides empty strings for any required field, THE API SHALL return HTTP 400 with a structured error response identifying the missing fields
3. WHEN a ticket creation request contains a priority value other than "low", "medium", or "high", THE API SHALL return HTTP 400 with a structured error response
4. IF a ticket creation request contains a title exceeding 200 characters, THEN THE API SHALL return HTTP 400 with a structured error response indicating the title length constraint
5. IF a ticket creation request contains a description exceeding 5000 characters, THEN THE API SHALL return HTTP 400 with a structured error response indicating the description length constraint

### Requirement 5: List and Search Tickets

**User Story:** As an authenticated user, I want to list, search, and filter tickets, so that I can find relevant tickets efficiently.

#### Acceptance Criteria

1. WHEN an authenticated user sends GET /api/tickets, THE Ticket_Service SHALL return HTTP 200 with a list of all tickets ordered by createdAt descending
2. WHEN a search query parameter is provided (GET /api/tickets?search=keyword), THE Ticket_Service SHALL return only tickets where the title or description contains the keyword using case-insensitive matching (PostgreSQL ILIKE)
3. WHEN a status filter parameter is provided (GET /api/tickets?status=value), THE Ticket_Service SHALL return only tickets matching the specified status
4. WHEN both search and status parameters are provided, THE Ticket_Service SHALL return tickets matching both the keyword and the status filter combined
5. WHEN the search or filter returns no matching results, THE Ticket_Service SHALL return HTTP 200 with an empty array

### Requirement 6: View Ticket Details

**User Story:** As an authenticated user, I want to view a ticket's full details including comments, so that I can understand the issue context and history.

#### Acceptance Criteria

1. WHEN an authenticated user sends GET /api/tickets/:id with a valid ticket UUID, THE Ticket_Service SHALL return HTTP 200 with the full ticket object (id, title, description, priority, status, assignedTo, createdBy, createdAt, updatedAt) including associated comments ordered by createdAt ascending
2. WHEN an authenticated user sends GET /api/tickets/:id with a non-existent UUID, THE API SHALL return HTTP 404 with a structured error response

### Requirement 7: Update Ticket Fields

**User Story:** As an authenticated user, I want to update a ticket's editable fields, so that I can correct information or reassign the ticket.

#### Acceptance Criteria

1. WHEN an authenticated user sends PATCH /api/tickets/:id with one or more valid field updates (title, description, priority, assignedTo), THE Ticket_Service SHALL apply only the provided fields, leave unspecified fields unchanged, and return HTTP 200 with the full updated ticket object
2. WHEN an update request references a non-existent ticket UUID, THE API SHALL return HTTP 404 with a structured error response
3. IF an update request contains a priority value other than "low", "medium", or "high", THEN THE API SHALL return HTTP 400 with a structured error response
4. IF an update request contains an assignedTo value that does not reference an existing user UUID, THEN THE API SHALL return HTTP 400 with a structured error response
5. IF an update request contains a title exceeding 200 characters, THEN THE API SHALL return HTTP 400 with a structured error response
6. THE Ticket_Service SHALL reject any attempt to modify the status field via PATCH /api/tickets/:id and return HTTP 400 with a structured error response indicating that status changes must use the status transition endpoint

### Requirement 8: Ticket Status Transitions via State Machine

**User Story:** As an authenticated user, I want to change a ticket's status through defined workflow stages, so that tickets follow a consistent lifecycle.

#### Acceptance Criteria

1. WHEN a valid status transition is requested via PATCH /api/tickets/:id/status with a request body containing the target status field, THE TicketStatus_Service SHALL update the ticket status and return HTTP 200 with the updated ticket object
2. IF the requested status transition violates the State_Machine rules, THEN THE TicketStatus_Service SHALL reject the change, preserve the current ticket status, and return HTTP 409 with a structured error response indicating the transition is not permitted
3. THE State_Machine SHALL permit the following transitions: Open to In Progress, Open to Cancelled, In Progress to Resolved, In Progress to Cancelled, Resolved to Closed
4. THE State_Machine SHALL treat Closed and Cancelled as terminal states with no outgoing transitions
5. THE TicketStatus_Service SHALL be the single source of truth for all status transition validation
6. IF a status transition request references a non-existent ticket UUID, THEN THE API SHALL return HTTP 404 with a structured error response
7. IF a status transition request contains a status value that is not one of the defined states (Open, In Progress, Resolved, Closed, Cancelled), THEN THE API SHALL return HTTP 400 with a structured error response indicating the invalid status value

### Requirement 22: Frontend Handling of Ticket Status Transitions

**User Story:** As a user, I want the UI to guide me through valid status transitions and clearly communicate when an invalid transition is rejected, so that I can progress tickets without confusion.

#### Acceptance Criteria

1. WHEN a ticket detail view is rendered, THE Frontend SHALL display only the status transition buttons corresponding to valid next states for the ticket's current status (e.g., Open shows only "In Progress" and "Cancelled")
2. THE Frontend SHALL disable or hide status transition buttons for states that are not valid targets from the current status
3. WHEN a status transition request returns HTTP 409 from the API, THE Frontend SHALL display a user-visible error message indicating the transition is not allowed, without requiring a page reload
4. WHEN a ticket is in a terminal state (Closed or Cancelled), THE Frontend SHALL not render any status transition buttons
5. WHEN a status transition succeeds (HTTP 200), THE Frontend SHALL immediately update the displayed ticket status and re-render the available transition buttons to reflect the new valid transitions

### Requirement 9: Ticket Comments

**User Story:** As an authenticated user, I want to add comments to tickets, so that I can communicate updates and context on issues.

#### Acceptance Criteria

1. WHEN an authenticated user sends POST /api/tickets/:id/comments with a message body, THE Comment_Service SHALL create a comment linked to the ticket and the requesting user, and return HTTP 201 with the created comment object containing id, ticketId, createdBy, message, and createdAt fields
2. IF a comment creation request is missing the message field or the message contains only whitespace, THEN THE API SHALL return HTTP 400 with a structured error response
3. IF a comment creation request references a non-existent ticket UUID, THEN THE API SHALL return HTTP 404 with a structured error response
4. THE Comment_Service SHALL limit the message field to a maximum of 2000 characters and reject requests exceeding this limit with HTTP 400 and a structured error response

### Requirement 10: User Management — List Users

**User Story:** As an authenticated user, I want to view the list of system users, so that I can assign tickets to specific people.

#### Acceptance Criteria

1. WHEN an authenticated user (agent or admin) sends GET /api/users, THE User_Service SHALL return HTTP 200 with a JSON array of all user objects, each containing: id, name, email, role, createdAt (ISO 8601 format), and updatedAt (ISO 8601 format)
2. THE User_Service SHALL never include passwordHash in user list responses
3. WHEN an authenticated user sends GET /api/users and no users exist in the system, THE User_Service SHALL return HTTP 200 with an empty JSON array

### Requirement 11: User Management — Create User

**User Story:** As an administrator, I want to create new user accounts, so that I can onboard team members into the system.

#### Acceptance Criteria

1. WHEN an admin sends POST /api/users with valid user data (name, email, password, role), THE User_Service SHALL create the user with a bcrypt-hashed password and return HTTP 201 with the created user object containing id, name, email, role, createdAt, and updatedAt (excluding passwordHash)
2. WHEN a user creation request contains an email that already exists (case-insensitive comparison), THE User_Service SHALL return HTTP 409 with a structured error response
3. WHEN a non-admin user sends POST /api/users, THE Auth_Middleware SHALL return HTTP 403
4. WHEN a user creation request is missing one or more required fields (name, email, password, role), THE API SHALL return HTTP 400 with a structured error response identifying the missing fields
5. WHEN a user creation request contains a role value other than "agent" or "admin", THE API SHALL return HTTP 400 with a structured error response
6. WHEN a user creation request contains an invalid email format or a password shorter than 6 characters, THE API SHALL return HTTP 400 with a structured error response
7. THE User_Service SHALL limit the name field to a maximum of 100 characters

### Requirement 12: User Management — Update User

**User Story:** As an administrator, I want to update user accounts including optional password resets, so that I can manage team member information.

#### Acceptance Criteria

1. WHEN an admin sends PATCH /api/users/:id with valid updates (name, email, role, optional password), THE User_Service SHALL apply the changes and return HTTP 200 with the updated user (excluding passwordHash), where name is limited to 200 characters, role is one of "agent" or "admin", and at least one updatable field must be provided
2. WHEN a password field is provided in the update, THE User_Service SHALL bcrypt-hash the new password before storage
3. WHEN a non-admin user sends PATCH /api/users/:id, THE Auth_Middleware SHALL return HTTP 403
4. WHEN an update references a non-existent user UUID, THE API SHALL return HTTP 404 with a structured error response
5. WHEN an update request contains an email that already belongs to another user, THE User_Service SHALL return HTTP 409 with a structured error response
6. WHEN an update request contains invalid field values (malformed email format, role not in "agent" or "admin", name exceeding 200 characters, or no updatable fields provided), THE API SHALL return HTTP 400 with a structured error response

### Requirement 13: User Management — Delete User

**User Story:** As an administrator, I want to delete user accounts, so that I can remove access for departed team members.

#### Acceptance Criteria

1. WHEN an admin sends DELETE /api/users/:id for an existing user with no ticket or comment references, THE User_Service SHALL delete the user and return HTTP 200
2. WHEN a delete request targets a user referenced by existing tickets (createdBy or assignedTo) or comments (createdBy), THE User_Service SHALL return HTTP 409 with a structured error response indicating the foreign key conflict
3. WHEN a non-admin user sends DELETE /api/users/:id, THE Auth_Middleware SHALL return HTTP 403
4. WHEN a delete request references a non-existent user UUID, THE API SHALL return HTTP 404 with a structured error response
5. WHEN an admin sends DELETE /api/users/:id targeting their own user account, THE User_Service SHALL return HTTP 409 with a structured error response indicating self-deletion is not permitted

### Requirement 14: Frontend Role-Based UI

**User Story:** As a user, I want the interface to show only the features relevant to my role, so that the experience is clean and appropriate to my permissions.

#### Acceptance Criteria

1. WHILE a user with the admin role is authenticated, THE Frontend SHALL display the user management section in the navigation
2. WHILE a user with the agent role is authenticated, THE Frontend SHALL hide the user management section from the navigation
3. WHILE a user is authenticated, THE Frontend SHALL display the authenticated user's name and role in the navigation bar
4. IF a user with the agent role navigates to the user management route, THEN THE Frontend SHALL redirect the user to the tickets page
5. WHILE the Frontend is resolving the authenticated user's role from stored session, THE Frontend SHALL withhold rendering role-dependent navigation elements until the role is determined

### Requirement 15: Input Validation and Error Handling

**User Story:** As a user, I want clear feedback when I submit invalid data, so that I can correct my input efficiently.

#### Acceptance Criteria

1. WHEN the API receives a request with invalid input, THE API SHALL return HTTP 400 with a structured error response in the format { "error": "message", "code": "CODE", "details": {} } where the details object contains field-level validation information identifying which fields failed and why
2. WHEN the API encounters an unexpected server error, THE API SHALL return HTTP 500 with a structured error response that excludes stack traces, file paths, database query text, and environment variable values
3. WHEN the Frontend receives an error response from the API, THE Frontend SHALL display the error message from the response in a visible element adjacent to the form or action that triggered the request
4. IF the Frontend cannot reach the API due to a network failure, THEN THE Frontend SHALL display an error indication informing the user that the service is unavailable and allow the user to retry the action

### Requirement 16: Data Persistence and Database Design

**User Story:** As a system operator, I want all data to persist in PostgreSQL across application restarts, so that no data is lost during maintenance.

#### Acceptance Criteria

1. THE System SHALL store all User, Ticket, and Comment records in PostgreSQL with createdAt and updatedAt timestamp columns automatically managed on each entity
2. THE System SHALL use UUID primary keys for all entities
3. THE System SHALL use database migrations to manage schema changes such that running all migrations in sequence against an empty PostgreSQL database produces the complete application schema without errors
4. THE System SHALL provide a seed script that creates the default admin (admin@example.com / Admin123!, admin role) and agent (agent@example.com / Agent123!, agent role) users, and the script SHALL be idempotent such that running it multiple times does not produce duplicate records or errors
5. THE System SHALL use parameterized queries or an ORM to prevent SQL injection
6. THE System SHALL enforce foreign key constraints such that Ticket references User via createdBy and assignedTo columns, and Comment references both Ticket and User
7. WHEN the application process restarts or reconnects to the database, THE System SHALL retain all previously committed User, Ticket, and Comment records without data loss
8. THE System SHALL organize all database artifacts under a `backend-api/db/` directory with the structure: `db/scripts/` (setup shell script and create-database SQL), `db/migrations/` (numbered SQL migration files), and `db/seeds/` (seed data documentation)
9. THE System SHALL provide a single `npm run db:setup` command that executes the full database initialization sequence: create database (if not exists) → run migrations → seed default users
10. THE System SHALL provide individual npm scripts `db:create`, `db:migrate`, and `db:seed` for running each database step independently
11. THE System SHALL accept a DATABASE_URL environment variable in the PostgreSQL connection string format `postgresql://username:password@host:port/database_name` (e.g., `postgresql://postgres:postgres@localhost:5432/ticket_system`), and the setup script SHALL derive the admin connection URL from DATABASE_URL by replacing the database name with `postgres`

### Requirement 17: Security Requirements

**User Story:** As a system operator, I want the application to follow security best practices, so that user data and credentials remain protected.

#### Acceptance Criteria

1. THE System SHALL store all passwords using bcrypt hashing with a minimum cost factor of 10
2. THE System SHALL store JWT_SECRET exclusively in environment variables, never in source code
3. THE System SHALL ensure .env files are listed in .gitignore and never committed to the repository
4. THE Auth_Service SHALL never expose passwordHash in any API response
5. THE System SHALL require JWT_SECRET to be at least 32 characters in length and reject application startup if the secret is shorter

### Requirement 18: Backend Architecture

**User Story:** As a developer, I want the backend organized in clean layers, so that the codebase is maintainable and testable.

#### Acceptance Criteria

1. THE API SHALL be organized into separate directory layers: routes (HTTP handling), services (business logic), and repositories (data access), where route files import only from services, and service files import only from repositories for data access
2. THE TicketStatus_Service SHALL encapsulate all state machine transition logic such that it can be invoked and tested independently without instantiating an HTTP server or making network requests
3. THE System SHALL provide a README that includes: prerequisites (Node.js version, PostgreSQL), environment variable setup, dependency installation command, database migration command, seed data command, and the command to start the server
4. THE API route handlers SHALL NOT contain direct database queries or direct repository imports; all data access from routes SHALL pass through a service layer function

### Requirement 19: Integration Testing — State Machine

**User Story:** As a developer, I want comprehensive state machine tests, so that ticket lifecycle integrity is verified.

#### Acceptance Criteria

1. THE System SHALL include an integration test that sends PATCH /api/tickets/:id/status with an authenticated user to transition a ticket from Open to In Progress and verifies HTTP 200 with the updated status in the response body
2. THE System SHALL include an integration test verifying In Progress to Resolved returns HTTP 200 with the updated status
3. THE System SHALL include an integration test verifying Resolved to Closed returns HTTP 200 with the updated status
4. THE System SHALL include an integration test verifying Open to Cancelled returns HTTP 200 with the updated status
5. THE System SHALL include an integration test verifying In Progress to Cancelled returns HTTP 200 with the updated status
6. THE System SHALL include an integration test verifying Open to Resolved returns HTTP 409
7. THE System SHALL include an integration test verifying Open to Closed returns HTTP 409
8. THE System SHALL include an integration test verifying In Progress to Open returns HTTP 409
9. THE System SHALL include an integration test verifying Closed to Open, Closed to In Progress, Closed to Resolved, and Closed to Cancelled each return HTTP 409
10. THE System SHALL include an integration test verifying Cancelled to Open, Cancelled to In Progress, Cancelled to Resolved, and Cancelled to Closed each return HTTP 409

### Requirement 20: Integration Testing — Authentication and Authorization

**User Story:** As a developer, I want comprehensive auth tests, so that security enforcement is verified.

#### Acceptance Criteria

1. THE System SHALL include an integration test verifying POST /api/auth/login with valid credentials returns HTTP 200 with a JSON body containing a non-empty token string and a user object with id, name, email, and role fields
2. THE System SHALL include an integration test verifying POST /api/auth/login with a valid email and incorrect password returns HTTP 401 with a structured error response and no token in the body
3. THE System SHALL include an integration test verifying POST /api/auth/login with a non-existent email returns HTTP 401 with a structured error response and no token in the body
4. THE System SHALL include an integration test verifying GET /api/tickets without a Bearer token in the Authorization header returns HTTP 401
5. THE System SHALL include an integration test verifying GET /api/tickets with an expired JWT returns HTTP 401
6. THE System SHALL include an integration test verifying an agent-role user calling DELETE /api/users/:id returns HTTP 403
7. THE System SHALL include an integration test verifying an admin-role user calling POST /api/users with valid user data (name, email, password, role) returns HTTP 201 with the created user object excluding passwordHash
8. THE System SHALL include an integration test verifying GET /api/auth/me with a valid token returns HTTP 200 with a user object containing id, name, email, and role fields, and not containing passwordHash

### Requirement 21: AI Workflow Documentation and Repository Artifacts

**User Story:** As a reviewer, I want all AI workflow documentation and lifecycle artifacts included in the repository, so that I can evaluate the candidate's engineering process and AI-assisted delivery methodology.

#### Acceptance Criteria

1. THE System SHALL include a tool-workflow.md file at the repository root documenting: the primary AI tool used, how project context is provided to the tool, and how AI is used for requirement analysis, planning/design, code generation, validation, testing, debugging, and code review
2. THE System SHALL include a tool-workflow.md section describing what information is avoided sharing with AI tools and how the workflow would be reused in a real project
3. THE System SHALL include a prompt-history directory (tool-specific/cursor-workflow/prompt-history/) containing timestamped or sequenced records of significant AI prompts and their outcomes
4. THE System SHALL include design documentation (docs/design-notes.md, docs/state-machine.md, docs/auth-design.md) covering architectural decisions and the state machine design
5. THE System SHALL include docs/nfr-checklist.md verifying each non-functional requirement is met
6. THE System SHALL include docs/debugging-notes.md documenting significant debugging sessions and their resolutions
7. THE System SHALL include a PR description with a summary of changes, what was tested, and a reflection on the AI-assisted development process
8. THE System SHALL include a .env.example file at the repository root documenting all required environment variables with placeholder values

### Requirement 23: API Documentation via OpenAPI Specification

**User Story:** As a developer, I want auto-generated API documentation accessible at a dedicated endpoint, so that I can explore and test API endpoints without reading source code.

#### Acceptance Criteria

1. THE API SHALL include a machine-readable OpenAPI 3.x specification document describing all endpoints, request bodies, response schemas, and authentication requirements
2. THE API SHALL serve a Swagger UI documentation interface at GET /api-docs that renders the OpenAPI specification as an interactive, browsable page
3. WHEN the API starts successfully, THE API SHALL make the Swagger UI accessible at the /api-docs path without requiring authentication
4. THE OpenAPI specification SHALL document all request body schemas with field types, required fields, and validation constraints matching the implemented validation rules
5. THE OpenAPI specification SHALL document all response schemas including success responses and structured error responses for each endpoint
6. THE OpenAPI specification SHALL include a securitySchemes definition for Bearer JWT authentication and apply it to all protected endpoints
7. WHEN a new route is added or an existing route is modified, THE OpenAPI specification SHALL be updated to reflect the change before the feature is considered complete

### Requirement 24: Docker Setup for Containerized Development and Deployment

**User Story:** As a developer, I want a Docker-based setup for the application, so that I can run the full stack locally without manual dependency installation and ensure consistent environments across machines.

#### Acceptance Criteria

1. THE System SHALL include a Dockerfile for the backend API service that builds a production-ready Node.js container image based on Node.js 22 Alpine
2. THE System SHALL include a Dockerfile for the Frontend service that builds a production-ready container image serving the built React application via a static file server
3. THE System SHALL include a docker-compose.yml at the repository root that defines services for the backend API, the Frontend, and a PostgreSQL database
4. WHEN a developer runs `docker-compose up` from the repository root, THE System SHALL start all three services (backend API, Frontend, PostgreSQL) and the backend API SHALL be accessible on its configured port
5. THE docker-compose.yml SHALL configure the PostgreSQL service with a named volume for data persistence across container restarts
6. THE docker-compose.yml SHALL configure service dependencies such that the backend API service waits for the PostgreSQL service to be ready before starting
7. THE docker-compose.yml SHALL pass all required environment variables (DATABASE_URL, JWT_SECRET, PORT) to the backend API service via an environment section or env_file reference
8. THE System SHALL include a .dockerignore file for both the backend API and Frontend contexts that excludes node_modules, .env files, and other non-essential files from the build context
9. WHEN the PostgreSQL container starts for the first time, THE System SHALL automatically run database migrations and seed data so the application is ready to use without manual setup steps

### Requirement 25: CI Workflow via GitHub Actions

**User Story:** As a developer, I want an automated CI pipeline that runs on every push and pull request, so that code quality issues and test failures are caught before merging.

#### Acceptance Criteria

1. THE System SHALL include a GitHub Actions workflow configuration file at .github/workflows/ci.yml that triggers on push to the main branch and on pull request events targeting the main branch
2. WHEN the CI workflow is triggered, THE CI pipeline SHALL execute a linting step that runs the configured linter (ESLint) on both the backend API and Frontend source code and fails the workflow if lint errors are detected
3. WHEN the CI workflow is triggered, THE CI pipeline SHALL execute a build step that compiles the backend API TypeScript source and builds the Frontend production bundle, failing the workflow if either build produces errors
4. WHEN the CI workflow is triggered, THE CI pipeline SHALL execute a test step that runs the backend API test suite and fails the workflow if any test fails
5. THE CI workflow SHALL use Node.js 22 as the runtime environment matching the project's .nvmrc specification
6. THE CI workflow SHALL install dependencies using the lockfile (npm ci) to ensure reproducible builds
7. THE CI workflow SHALL provision a PostgreSQL service container for the test step with credentials matching the test environment configuration
8. THE CI workflow SHALL execute steps in the order: install dependencies, lint, build, test, ensuring early termination if any step fails
