---
inclusion: fileMatch
fileMatchPattern: '**/server/**,**/src/routes/**,**/src/services/**,**/src/repositories/**,**/src/middleware/**,**/api/**'
---

# Node.js Backend Performance & Security Patterns

These rules apply strictly to all backend server code: routes, services, repositories, middleware, and API handlers.

## Event Loop & Performance

### Async-First Operations
- **Never use blocking synchronous operations** (e.g., `fs.readFileSync`, `crypto.randomBytes` sync variant).
- Use asynchronous promise-based variations (`fs.promises.readFile`, `crypto.randomBytes` with callback/promisify).

```typescript
// ✅ CORRECT
import { readFile } from 'node:fs/promises';
const content = await readFile(configPath, 'utf-8');

// ❌ WRONG — blocks the event loop
import { readFileSync } from 'node:fs';
const content = readFileSync(configPath, 'utf-8');
```

### CPU-Bound Work
- Do not perform heavy CPU-bound parsing algorithms directly in the request-response thread.
- Offload intensive tasks to Node.js Worker Threads or process queues.
- For password hashing (bcrypt), use the async variant: `await bcrypt.hash(password, saltRounds)`.

### Streaming for Large Payloads
- Use streams (`stream.Readable.from()`) instead of memory buffers when handling large payload data or database record chunks.
- For file uploads or large exports, stream directly to/from the response.

## Security & Database Operations

### SQL Injection Prevention
- **Never generate raw string concatenations for database execution.**
- Parameterize all SQL queries using `$1, $2, ...` placeholders.
- Enforce strict ORM/query builder parsing (Prisma, Kysely, or pg parameterization).

```typescript
// ✅ CORRECT — parameterized
const { rows } = await pool.query(
  'SELECT id, title, status FROM tickets WHERE status = $1 AND created_by = $2',
  [status, userId]
);

// ❌ WRONG — SQL injection
const { rows } = await pool.query(
  `SELECT * FROM tickets WHERE status = '${status}'`
);
```

### Cryptographic Operations
- Use the native `node:crypto` library for secure cryptographic routines and random generation.
- Never import deprecated external crypto dependencies.
- Use `crypto.randomUUID()` for generating UUIDs in application code.

```typescript
import { randomUUID } from 'node:crypto';
const id = randomUUID();
```

### Input Validation at Route Boundary
- Force local runtime input validation using Zod at the entrance layer of every Express route.
- Validate BEFORE any business logic executes.
- Return structured 400 errors with field-level details on validation failure.

```typescript
import { z } from 'zod';

const createTicketSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  priority: z.enum(['low', 'medium', 'high']),
  assignedTo: z.string().uuid().optional(),
});

// In route handler:
const parsed = createTicketSchema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: parsed.error.flatten().fieldErrors,
  });
}
// Now use parsed.data — fully typed and safe
```

### Rate Limiting
- Implement rate limiting on authentication endpoints (login, register).
- Use express-rate-limit or equivalent middleware.
- Return HTTP 429 with a structured error response when limit is exceeded.

### Security Headers
- Set appropriate security headers on all responses:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security` (for production)
  - CORS configured to allow only the frontend origin.

## Error Handling Patterns

### Structured Error Responses
- All errors must follow the contract: `{ error: string, code: string, details?: object }`.
- Never expose stack traces, file paths, or internal details in responses.
- Log full error details server-side; return sanitized messages client-side.

### Global Error Handler
- Implement a global Express error handler as the last middleware.
- Catch unhandled promise rejections and uncaught exceptions gracefully.
- Return 500 with a generic message — never the raw error.

```typescript
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
});
```

## Validation Checklist

Before accepting any backend code, verify:

1. ✅ No synchronous file/crypto operations — all async
2. ✅ No string concatenation in SQL — parameterized queries only
3. ✅ Zod validation at route entry point before business logic
4. ✅ Uses `node:crypto` for randomUUID and hashing support
5. ✅ Bcrypt uses async variant (`await bcrypt.hash(...)`)
6. ✅ Global error handler catches and sanitizes all unhandled errors
7. ✅ Rate limiting on auth endpoints
8. ✅ Security headers set on all responses
9. ✅ No raw error details exposed in HTTP responses
10. ✅ Heavy computation offloaded from request thread
