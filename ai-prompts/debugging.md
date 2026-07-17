# AI Prompts — Debugging Phase

## Session 1: Database Connection Failure

**Context:** Server crashed on startup with `ECONNREFUSED`.

**Prompt:**
> The server crashes on startup with "Error: connect ECONNREFUSED 127.0.0.1:5432". PostgreSQL is running and I can connect with psql. The DATABASE_URL is correct in .env. What's wrong?

**AI Analysis:** Identified that `dotenv.config()` was being called after the pg Pool was imported. The Pool reads `process.env.DATABASE_URL` at import time, which is before dotenv populates the environment.

**Resolution:** Moved `dotenv.config()` to the very first line of `src/index.ts` before any other imports.

---

## Session 2: JWT Verification Failures

**Context:** All authenticated requests returning 401 despite valid tokens.

**Prompt:**
> Tokens decode correctly on jwt.io but auth middleware returns "Invalid token". The JWT_SECRET in .env matches what I expect. What could cause verification to fail?

**AI Analysis:** Identified trailing whitespace/newline in the .env file's JWT_SECRET value. The signing code path read the raw value, while verification trimmed it (or vice versa), causing signature mismatch.

**Resolution:** Added `.trim()` to JWT_SECRET access and centralized env var reads.

---

## Session 3: Wrong HTTP Status on Invalid Transition

**Context:** Invalid state transitions returning 500 instead of 409.

**Prompt:**
> The ConflictError is being thrown in ticketService but the API returns 500 instead of 409. The error handler middleware is mounted. Why isn't it catching the error?

**AI Analysis:** Traced the issue to missing `await` in the async route handler. The promise rejection became unhandled rather than flowing through Express's error middleware chain.

**Resolution:** Added explicit try/catch blocks with `next(error)` in all async route handlers.
