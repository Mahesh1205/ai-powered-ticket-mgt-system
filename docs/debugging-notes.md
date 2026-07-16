# Debugging Notes

This document records significant debugging sessions encountered during development, including root cause analysis and resolutions.

---

## Template

### Issue: [Brief description]

**Date:** YYYY-MM-DD

**Symptoms:**
- What was observed (error messages, unexpected behavior)

**Investigation Steps:**
1. Step taken to narrow down the issue
2. What was checked / what tools were used
3. Key findings during investigation

**Root Cause:**
- Technical explanation of why the issue occurred

**Resolution:**
- What was changed to fix the issue
- Files modified

**Prevention:**
- What could prevent this in the future (tests, validation, documentation)

---

## Session 1: Database Connection on Startup

**Date:** 2025-07-01

**Symptoms:**
- Server crashed on startup with `ECONNREFUSED` connecting to PostgreSQL
- Error: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Investigation Steps:**
1. Verified PostgreSQL service was running (`pg_isready`)
2. Checked DATABASE_URL format in `.env`
3. Confirmed database existed by connecting with `psql`
4. Checked if the pg Pool was using the correct connection string

**Root Cause:**
- The `DATABASE_URL` environment variable was not being loaded because `dotenv.config()` was called after the Pool was instantiated in `db.ts`.

**Resolution:**
- Moved `dotenv.config()` to the top of `src/index.ts` before any other imports
- Ensured `db.ts` reads `process.env.DATABASE_URL` at Pool creation time (lazy init)

**Prevention:**
- Added startup validation that logs connection status
- Added comment in `index.ts` noting dotenv must be first

---

## Session 2: JWT Verification Failing for Valid Tokens

**Date:** 2025-07-02

**Symptoms:**
- All authenticated requests returning 401 "Invalid token"
- Tokens decoded correctly on jwt.io

**Investigation Steps:**
1. Logged the JWT_SECRET being used for signing vs verification
2. Compared environment variables between sign and verify calls
3. Checked for whitespace/newline characters in `.env` file

**Root Cause:**
- The `.env` file had a trailing newline in the JWT_SECRET value that was included in the string during signing but not during verification (different code paths).

**Resolution:**
- Added `.trim()` to the JWT_SECRET read: `process.env.JWT_SECRET?.trim()`
- Ensured consistent secret access through a single `config.ts` module

**Prevention:**
- Centralized all env var access through a config module
- Added integration test that signs and verifies a token in the same flow

---

## Session 3: State Machine Transition Returning 500 Instead of 409

**Date:** 2025-07-03

**Symptoms:**
- Invalid status transitions returning HTTP 500 instead of HTTP 409
- Error logs showed `ConflictError` being thrown but not caught

**Investigation Steps:**
1. Checked error handler middleware was mounted after routes
2. Traced the error flow from service → route → error handler
3. Found the error was thrown in an async function without proper await

**Root Cause:**
- The route handler was not properly awaiting the async service call, so the rejection became an unhandled promise rejection instead of flowing through Express error handling.

**Resolution:**
- Wrapped route handler body in try/catch with `next(error)` in catch block
- Ensured all async route handlers properly propagate errors

**Prevention:**
- Adopted consistent async route handler pattern with explicit try/catch
- Integration tests verify 409 responses for invalid transitions

---

## Adding New Entries

When documenting a new debugging session:

1. Copy the template section above
2. Fill in the date and symptoms
3. Document your investigation chronologically
4. Clearly state the root cause
5. Describe the fix and what files were changed
6. Note any preventive measures added (tests, validation, docs)
