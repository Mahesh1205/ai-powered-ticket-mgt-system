# Authentication Design

## Overview

The system uses stateless JWT-based authentication. Tokens are issued on successful login, stored in the browser's sessionStorage, and sent as Bearer tokens in the Authorization header on every API request. No server-side session state is maintained.

## Authentication Flow

```
┌──────────┐         ┌─────────────┐         ┌────────────┐
│  Client  │         │  Auth API   │         │  Database  │
└────┬─────┘         └──────┬──────┘         └─────┬──────┘
     │                      │                       │
     │  POST /api/auth/login│                       │
     │  {email, password}   │                       │
     │─────────────────────►│                       │
     │                      │  Find user by email   │
     │                      │──────────────────────►│
     │                      │                       │
     │                      │  User record (or null)│
     │                      │◄──────────────────────│
     │                      │                       │
     │                      │  bcrypt.compare()     │
     │                      │  (verify password)    │
     │                      │                       │
     │                      │  Sign JWT             │
     │                      │  (sub, email, role,   │
     │                      │   iat, exp)           │
     │                      │                       │
     │  200: {token, user}  │                       │
     │◄─────────────────────│                       │
     │                      │                       │
     │  Store token in      │                       │
     │  sessionStorage      │                       │
     │                      │                       │
     │  GET /api/tickets    │                       │
     │  Authorization:      │                       │
     │  Bearer <token>      │                       │
     │─────────────────────►│                       │
     │                      │  Verify JWT           │
     │                      │  Attach user context  │
     │                      │                       │
     │  200: [tickets...]   │                       │
     │◄─────────────────────│                       │
```

## JWT Structure

### Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload (Claims)
```json
{
  "sub": "uuid-of-user",       // User ID (primary key)
  "email": "user@example.com", // User email
  "role": "agent",             // "agent" or "admin"
  "iat": 1700000000,           // Issued at (Unix timestamp)
  "exp": 1700086400            // Expires at (iat + 86400 = 24 hours)
}
```

### Signature
- Algorithm: HS256 (HMAC-SHA256)
- Secret: JWT_SECRET environment variable (minimum 32 characters)

### Token Characteristics
- **Expiry:** 24 hours from issuance
- **No refresh tokens** — Users re-authenticate after expiry
- **No revocation list** — Acceptable for internal tool with 24h window

## Middleware Chain

### 1. authMiddleware (JWT Verification)

Applied to all protected routes (everything except `POST /api/auth/login`).

**Steps:**
1. Extract `Authorization` header
2. Verify it starts with `Bearer `
3. Extract the token string
4. Verify JWT signature using `JWT_SECRET`
5. Check token is not expired (`exp` > current time)
6. Attach decoded payload to `req.user`
7. Call `next()` or return HTTP 401

**Error Responses:**
- Missing header → 401 `{ error: "No token provided", code: "UNAUTHORIZED" }`
- Malformed token → 401 `{ error: "Invalid token", code: "UNAUTHORIZED" }`
- Expired token → 401 `{ error: "Token expired", code: "UNAUTHORIZED" }`
- Invalid signature → 401 `{ error: "Invalid token", code: "UNAUTHORIZED" }`

### 2. requireAdmin (Role Enforcement)

Applied to admin-only routes (POST/PATCH/DELETE `/api/users`).

**Steps:**
1. Check `req.user.role === "admin"`
2. Call `next()` or return HTTP 403

**Error Response:**
- Non-admin role → 403 `{ error: "Admin access required", code: "FORBIDDEN" }`

### Middleware Application

```typescript
// Public routes (no middleware)
app.use("/api/auth", authRoutes);  // login is public, /me uses authMiddleware internally

// Protected routes (authMiddleware)
app.use("/api/tickets", authMiddleware, ticketRoutes);
app.use("/api/users", authMiddleware, userRoutes);

// Admin-only routes (requireAdmin applied within route definitions)
router.post("/", requireAdmin, createUser);
router.patch("/:id", requireAdmin, updateUser);
router.delete("/:id", requireAdmin, deleteUser);
```

## Security Decisions

### Password Storage
- **Algorithm:** bcrypt with minimum cost factor of 10
- **No plaintext passwords** — Only the hash is stored in the database
- **passwordHash field** — Never included in any API response (excluded at repository level)

### Token Storage (Frontend)
- **sessionStorage** — Token is cleared when the browser tab/window closes
- **Not localStorage** — Reduces persistence window if browser is shared
- **No cookies** — Avoids CSRF complexity; Bearer token pattern is simpler for SPAs

### Error Message Design (Anti-Enumeration)
- Login failures always return the same generic message: `"Invalid credentials"`
- No distinction between "email not found" and "wrong password"
- Prevents attackers from discovering valid email addresses

### JWT_SECRET Requirements
- Minimum 32 characters
- Stored ONLY in environment variables
- Application refuses to start if secret is shorter than 32 characters
- `.env` files are gitignored

## Frontend Session Management

### Login Flow
1. User submits email + password
2. `authStore.login()` calls `POST /api/auth/login`
3. On success: store token in sessionStorage, set user in store, redirect to `/tickets`
4. On failure: display error message from API response

### Session Restoration (App Load)
1. App component mounts
2. `authStore.restoreSession()` checks sessionStorage for existing token
3. If token exists: call `GET /api/auth/me` to validate
4. If valid: set user in store, render protected content
5. If invalid (401): clear token, redirect to `/login`

### Logout Flow
1. User clicks logout
2. `authStore.logout()` removes token from sessionStorage
3. Reset store state (user = null, token = null)
4. Redirect to `/login`

### Automatic Logout (401 Interceptor)
1. Axios response interceptor catches any 401 response
2. Clears sessionStorage token
3. Resets authStore
4. Redirects to `/login`

## Property-Based Test Coverage

- **Property 3:** passwordHash never exposed in any response
- **Property 4:** JWT contains all required claims with 24h expiry
- **Property 5:** Valid credentials produce valid token + user
- **Property 6:** Wrong password always rejected with generic message
- **Property 7:** Malformed login requests rejected with 400
- **Property 8:** Token from login works for /auth/me
- **Property 9:** Invalid/expired tokens universally rejected
- **Property 10:** Agent role cannot access admin endpoints
