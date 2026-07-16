# Frontend & Backend Coding Standards

These standards apply to all code generated or modified in this project. Validate AI-generated code against these rules before accepting it.

## Backend Standards (Node.js / Express / TypeScript)

The backend serves as the protective firewall between external services and the client application.

### Runtime Data Validation
- Never pass raw user inputs directly to any service or database query.
- Use Zod schemas for runtime validation on all request bodies, query parameters, and route parameters.
- Strip unexpected fields and enforce strict typing before data reaches any service layer.
- Define shared Zod schemas that can be reused across routes and tests.

### Input Sanitization & Injection Prevention
- Implement middleware to scan incoming strings for adversarial or malformed content.
- Sanitize all user-provided text fields (title, description, message) to prevent XSS payloads from being stored.
- Use parameterized queries exclusively — never interpolate user input into SQL strings.

### Secure API Orchestration
- All secrets (JWT_SECRET, DATABASE_URL) must come from environment variables only.
- Use structured error responses consistently: `{ error, code, details }`.
- Implement rate limiting on authentication endpoints.
- Set appropriate security headers (CORS, Content-Security-Policy, X-Content-Type-Options).

### Data Minimization
- Never return passwordHash in any API response — strip it at the repository/service layer.
- Log errors without including sensitive user data (passwords, tokens, PII).
- Avoid exposing internal stack traces or file paths in production error responses.

### Layered Architecture Enforcement
- Route handlers: HTTP concerns only (parse request, call service, send response).
- Services: Business logic, validation rules, orchestration.
- Repositories: Database access only — no business logic.
- Routes import services; services import repositories. No skipping layers.

## Frontend Standards (React / Vite / Tailwind CSS)

The frontend is responsible for setting clear boundaries for users and handling interactions gracefully.

### Asynchronous State & Loading UX
- All API calls must have deterministic loading states (spinner, skeleton, or disabled button).
- Implement error boundaries for unexpected component failures.
- Show optimistic updates where appropriate (e.g., comment submission).
- Use proper loading indicators during status transitions and form submissions.
- Never leave the user with a blank screen during async operations.

### Response Attribution & Content Safety
- Clearly distinguish system-generated content from user-generated content.
- If any AI-generated content is displayed, visually mark it with a disclaimer.
- Sanitize any dynamic HTML content before rendering (use DOMPurify or equivalent if rendering markdown/HTML).

### Output Sanitization
- Never use `dangerouslySetInnerHTML` without sanitizing content first.
- Escape user-provided text in all rendered components.
- Validate and sanitize data received from the API before displaying.

### Accessibility Requirements
- All interactive elements must be keyboard navigable.
- Form inputs must have associated labels (visible or aria-label).
- Error messages must be announced to screen readers (aria-live regions).
- Color contrast must meet WCAG 2.1 AA minimum (4.5:1 for text).
- Status transitions and notifications must be perceivable by assistive technology.
- Focus management: modals trap focus; after form submission, focus moves to result/error.

### Tailwind CSS Conventions
- Use Tailwind utility classes for all styling — no custom CSS files unless absolutely necessary.
- Extract repeated patterns into reusable components, not @apply directives.
- Use responsive prefixes (sm:, md:, lg:) for mobile-first responsive design.
- Use Tailwind's color system consistently — define custom colors in tailwind.config if the default palette doesn't fit.
- Dark mode: use `dark:` variant if implementing theme support.

### State Management (Zustand)
- Keep stores focused: one store per domain (auth, tickets, users, filters, UI).
- No business logic in stores — stores are data + async action wrappers.
- On 401 responses: clear auth state and redirect to login.
- On 409 responses: surface the error message via uiStore for display.

## Code Quality Checks

Before accepting any generated code, verify:

1. ✅ All request inputs validated with Zod schemas
2. ✅ No raw SQL interpolation — parameterized queries only
3. ✅ No passwordHash in any API response
4. ✅ Loading states present for all async operations
5. ✅ Error states handled and displayed to user
6. ✅ All forms have proper labels and validation feedback
7. ✅ Keyboard navigation works for all interactive elements
8. ✅ No secrets hardcoded — all from environment variables
9. ✅ Layered architecture respected (routes → services → repositories)
10. ✅ Tailwind utilities used consistently — no inline styles
