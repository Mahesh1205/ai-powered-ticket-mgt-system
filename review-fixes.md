# Review Fixes

## Post-Review Changes Log

### Fix 1: dotenv Configuration Order

**Issue:** Server crashed on startup with `ECONNREFUSED` — DATABASE_URL was undefined when pg Pool was instantiated.

**Root Cause:** `dotenv.config()` was called after the database module was imported.

**Fix:** Moved `dotenv.config()` to the very first line of `src/index.ts` before any other imports.

**Files Changed:** `backend-api/src/index.ts`

---

### Fix 2: JWT Secret Whitespace Handling

**Issue:** Tokens signed correctly but verification failed intermittently.

**Root Cause:** `.env` file had trailing whitespace/newline in JWT_SECRET value. Different code paths trimmed vs. used raw value.

**Fix:** Centralized JWT_SECRET access with `.trim()` and validated length after trimming.

**Files Changed:** `backend-api/src/index.ts`, `backend-api/src/services/authService.ts`

---

### Fix 3: Async Route Handler Error Propagation

**Issue:** Invalid state transitions returned 500 instead of 409.

**Root Cause:** Async route handlers without try/catch caused promise rejections to bypass Express error middleware.

**Fix:** Added explicit try/catch blocks in all async route handlers with `next(error)` in catch.

**Files Changed:** `backend-api/src/routes/tickets.ts`, `backend-api/src/routes/users.ts`, `backend-api/src/routes/comments.ts`

---

### Fix 4: Seed Script Idempotency

**Issue:** Running `npm run db:seed` twice caused duplicate key constraint violations.

**Root Cause:** INSERT statement didn't handle existing records.

**Fix:** Changed to `INSERT ... ON CONFLICT (email) DO NOTHING` for idempotent seeding.

**Files Changed:** `backend-api/db/seed.js`

---

### Fix 5: JWT_SECRET Startup Guard

**Issue:** Application could start with an empty or short JWT_SECRET, making tokens insecure.

**Root Cause:** No validation on secret length at startup.

**Fix:** Added guard in `src/index.ts` that exits with a clear error if JWT_SECRET is undefined or fewer than 32 characters.

**Files Changed:** `backend-api/src/index.ts`

---

### Fix 6: Database Setup Script Portability

**Issue:** `db:setup` script failed on systems where the database didn't exist yet.

**Root Cause:** `setup.sh` assumed the target database already existed for running migrations.

**Fix:** Script now derives admin URL from DATABASE_URL (replacing db name with `postgres`), creates the target database first, then runs migrations and seeds.

**Files Changed:** `backend-api/db/scripts/setup.sh`, `backend-api/db/scripts/create-database.sql`

---

## Verification

All fixes were verified by:
1. Running the full test suite (`npm test`) — all passing
2. Clean-slate setup test (`npm run db:setup` on fresh database)
3. Docker Compose startup from scratch (`docker-compose up --build`)
