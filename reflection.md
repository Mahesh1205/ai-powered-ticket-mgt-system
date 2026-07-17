# Reflection

## What I Built

A full-stack internal support ticket management system with:
- React 19 frontend (Vite 6, Zustand 5, Tailwind CSS 4)
- Node.js 22 + Express 5 + TypeScript backend
- PostgreSQL database with migrations and seed data
- JWT stateless authentication with role-based access
- Deterministic state machine for ticket lifecycle
- 25 property-based correctness tests + integration tests
- Docker containerization and GitHub Actions CI
- OpenAPI/Swagger documentation

The system demonstrates spec-driven, AI-assisted delivery across the entire software development lifecycle.

## How I Used AI (across the lifecycle)

| Phase | How AI Was Used |
|-------|----------------|
| **Requirements** | Structured raw requirements into formal user stories with EARS-format acceptance criteria. AI identified gaps (missing edge cases, ambiguous validation rules) and refined each requirement for testability. |
| **Design** | Generated architecture diagrams (Mermaid), defined data models, API contracts, state machine transition table, and 25 correctness properties bridging spec to tests. |
| **Implementation** | Layer-by-layer code generation following spec patterns. 56 tasks executed in dependency order. AI generated code, I reviewed for correctness and architectural compliance. |
| **Testing** | Property-based tests derived directly from correctness properties. Integration tests from the mandatory test matrix in requirements. AI generated test scaffolding, I validated coverage. |
| **Debugging** | AI analyzed error messages, traced execution paths through layers, proposed fixes. Documented 3 significant debugging sessions. |
| **Documentation** | Generated from implementation and design decisions. OpenAPI annotations alongside route handlers. README verified to work from clean clone. |

## What AI Helped With Most

1. **Formal specification** — Turning informal requirements into precise, testable acceptance criteria with consistent EARS formatting. This gave me a clear contract to implement against.

2. **Property-based test generation** — Deriving universal invariants from the specification and translating them into fast-check properties. This is tedious manual work that AI does well because the properties are directly stated in the design doc.

3. **Boilerplate reduction** — Generating repository methods, route handlers, and type definitions that follow consistent patterns. Once the first module was established, subsequent modules followed the same structure.

4. **Consistency enforcement** — Ensuring all endpoints follow the same error format, all repositories use parameterized queries, and all responses exclude passwordHash.

## What AI Got Wrong

1. **Import ordering with dotenv** — Generated code that imported modules before `dotenv.config()`, causing undefined environment variables at module load time. Required manual reordering.

2. **Async error propagation** — Initial route handlers lacked try/catch, causing unhandled promise rejections to bypass Express error middleware. Had to add explicit error handling patterns.

3. **Over-engineering suggestions** — Suggested refresh tokens, rate limiting on all endpoints, soft deletes, and WebSocket support that were beyond scope. Had to maintain focus on actual requirements.

4. **Test isolation assumptions** — Some generated integration tests assumed a clean database state without proper setup/teardown, causing test-order-dependent failures.

## How I Validated AI Output

1. **Against acceptance criteria** — Every feature checked against the specific acceptance criteria in the spec. If criteria says "HTTP 409 with structured error response", I verified both the status code and response shape.

2. **Property-based testing** — fast-check generates random inputs and verifies invariants hold universally. This catches edge cases that example-based tests miss (e.g., unicode in titles, boundary lengths).

3. **Integration tests with real database** — Supertest against the actual Express app with a PostgreSQL instance. No mocking at this level — validates the full stack.

4. **Manual API testing** — Used Swagger UI to manually exercise edge cases after implementation (expired tokens, terminal state transitions, self-deletion).

5. **Clean-clone verification** — Tested setup instructions from scratch on a fresh environment to ensure README accuracy.

## What I Would Improve Next

1. **E2E browser tests** (Playwright) — Currently relying on component tests + manual testing for frontend; automated E2E would close this gap.

2. **Pagination** — The current list endpoints return all records. For production use, cursor-based pagination is needed.

3. **Observability** — Structured logging (pino/winston), request tracing, and health check endpoints for production monitoring.

4. **More granular authorization** — Currently binary agent/admin. A production system might need ticket-level permissions (creator can edit, assignee can transition).

5. **Database connection resilience** — Connection pooling with retry logic, graceful degradation on transient failures.

## Reusable Workflow (prompts, rules, specs, templates)

### Spec Template
```
Requirements (formal EARS criteria) → Design (architecture + correctness properties) → Tasks (dependency DAG)
```

### Steering Rules
- Coding standards enforced via `.kiro/steering/` files
- Architecture patterns documented once, referenced by all tasks
- Property-based testing as first-class correctness validation

### Prompt Patterns That Worked Well
- "Implement [layer] following the pattern established in [existing file]"
- "Write property tests for [correctness property N] from the design doc"
- "Review this implementation against acceptance criteria [N.1-N.5]"

### Workflow for Next Project
1. Define requirements with formal acceptance criteria
2. Design with correctness properties (what must always be true)
3. Break into dependency-ordered tasks
4. Implement bottom-up (data → services → API → UI)
5. Test with properties (universal invariants) + integration (specific flows)
6. Review against criteria, fix gaps, document decisions
