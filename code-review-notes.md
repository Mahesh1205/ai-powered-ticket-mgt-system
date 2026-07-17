# Code Review Notes

## AI-Assisted Review Summary

Kiro was used to review code against the spec's acceptance criteria after each implementation phase. The review process checked:

1. **Architectural compliance** — Routes only import services; services only import repositories
2. **Security patterns** — No passwordHash in responses, parameterized queries everywhere, JWT secret validation
3. **Error handling** — Consistent `{ error, code, details? }` structure, no stack traces in 500s
4. **Input validation** — All boundary conditions (max lengths, enum values, required fields)
5. **State machine enforcement** — Single source of truth, no bypass paths

## My Review Observations

### Strengths
- Clean separation of concerns: each layer has a single responsibility
- State machine as a pure function module is highly testable and reusable
- Property-based tests catch edge cases that unit tests might miss (e.g., case-insensitive email collisions)
- Consistent error response format across all endpoints
- JWT startup guard prevents deployment with weak secrets

### Areas I Validated Manually
- Checked that all repository methods use parameterized queries (no string interpolation)
- Verified auth middleware is applied before all protected routes
- Confirmed passwordHash exclusion in SELECT statements (not just post-processing)
- Tested terminal state transitions manually via API calls
- Verified Docker Compose startup sequence (postgres healthy → backend → frontend)

### Architecture Boundary Checks
- ✅ No `pool.query()` calls in route files
- ✅ No repository imports in route files
- ✅ Services don't import Express types (no `req`/`res` coupling)
- ✅ Error handler is the last middleware registered

## Changes Made After Review

| Change | Reason |
|--------|--------|
| Added `.trim()` to JWT_SECRET read | Trailing whitespace in .env files caused verification failures |
| Moved `dotenv.config()` before imports | Pool instantiation was reading undefined DATABASE_URL |
| Added explicit try/catch in async route handlers | Unhandled promise rejections caused 500 instead of proper error codes |
| Added `ON CONFLICT DO NOTHING` to seed script | Multiple seed runs caused duplicate key errors |
| Added startup guard for JWT_SECRET length | Allows deployment with weak/missing secret otherwise |

## Suggestions Rejected (and why)

| Suggestion | Why Rejected |
|------------|--------------|
| Add refresh token rotation | Over-engineering for internal tool with 24h expiry; adds complexity without proportional benefit |
| Use ORM (Prisma/TypeORM) | Raw SQL with parameterized queries is simpler, more transparent, and avoids ORM abstraction leakage |
| Add rate limiting to all endpoints | Only login endpoint benefits from rate limiting for this internal tool; blanket rate limiting adds friction |
| Implement soft deletes | Hard deletes with FK guards (409) are simpler and match the requirement spec; soft deletes add query complexity |
| Add WebSocket for real-time updates | Not in requirements; polling/manual refresh is sufficient for team-sized user base |
