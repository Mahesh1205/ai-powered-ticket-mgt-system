# Debugging Notes

## Issue 1

### Problem
Server crashed on startup with `ECONNREFUSED` when attempting to connect to PostgreSQL.

### How I Investigated
1. Verified PostgreSQL service was running (`pg_isready` returned success)
2. Checked DATABASE_URL format in `.env` — correct
3. Connected manually with `psql` using the same connection string — worked
4. Added console.log before Pool creation — discovered `process.env.DATABASE_URL` was undefined at that point

### How AI Helped
Kiro identified that `dotenv.config()` was being called AFTER the database module was imported. Since the pg Pool reads `process.env.DATABASE_URL` at module evaluation time (import time), the environment variable hadn't been populated yet.

### What I Validated
- Added `console.log(process.env.DATABASE_URL)` at different points in the startup sequence
- Confirmed that moving dotenv before imports resolved the issue
- Ran `npm run dev` successfully after the fix

### Final Fix
Moved `dotenv.config()` to the very first line of `src/index.ts` before any other imports. Added a comment noting that dotenv must be first.

---

## Issue 2

### Problem
All authenticated requests returning 401 "Invalid token" despite tokens decoding correctly on jwt.io.

### How I Investigated
1. Logged the JWT_SECRET being used for signing vs verification
2. Found they appeared identical but string comparison failed
3. Checked for invisible characters — found trailing newline in .env value
4. Compared `secret.length` between sign and verify code paths

### How AI Helped
Kiro suggested checking for whitespace/newline characters in the .env file and recommended centralizing env var access through a config module with `.trim()`.

### What I Validated
- Confirmed `JWT_SECRET.length` was different between code paths (one had trailing \n)
- After adding `.trim()`, token verification worked consistently
- Ran integration tests to verify sign→verify round trip

### Final Fix
Added `.trim()` to JWT_SECRET read. Centralized all env var access through consistent access patterns.

---

## Issue 3

### Problem
Invalid status transitions returning HTTP 500 instead of the expected HTTP 409.

### How I Investigated
1. Verified error handler middleware was mounted after routes — it was
2. Added logging in the error handler — ConflictError was not reaching it
3. Traced the error flow: service throws → route handler... → unhandled rejection
4. Found the route handler was not `await`-ing the async service call properly

### How AI Helped
Kiro traced the execution path and identified that without explicit try/catch in the async route handler, the promise rejection became "unhandled" and bypassed Express's synchronous error middleware chain.

### What I Validated
- Added try/catch with `next(error)` — confirmed 409 responses returned correctly
- Ran integration tests for all invalid transitions — all passed with 409
- Verified no other async handlers had the same issue

### Final Fix
Wrapped all async route handler bodies in try/catch with `next(error)` in the catch block. Adopted this as a consistent pattern for all route handlers.

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
