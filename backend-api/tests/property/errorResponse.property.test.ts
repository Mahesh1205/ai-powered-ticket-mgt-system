import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import * as fc from "fast-check";
import request from "supertest";
import express from "express";
import { errorHandler } from "../../src/middleware/errorHandler";
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from "../../src/utils/errors";

/**
 * Property-based tests for Error Response Structure.
 *
 * Feature: support-ticket-management
 * Property 24: Error responses follow consistent structure
 * **Validates: Requirements 15.1**
 *
 * Verifies that all error responses from the API follow a consistent structure
 * with { error: string, code: string, details?: object } format across all
 * error scenarios (400, 401, 403, 404, 409, 500).
 */

// --- Test Express App ---
// Create a minimal Express app with routes that trigger various errors
// through the error handler to test response structure in isolation.

function createTestApp() {
  const app = express();
  app.use(express.json());

  // Route that throws a ValidationError (400)
  app.post("/test/validation-error", (req, res, next) => {
    const { message, details } = req.body;
    next(new ValidationError(message || "Validation failed", details));
  });

  // Route that throws a NotFoundError (404)
  app.get("/test/not-found", (req, res, next) => {
    const message = (req.query.message as string) || "Resource not found";
    next(new NotFoundError(message));
  });

  // Route that throws a ConflictError (409)
  app.post("/test/conflict", (req, res, next) => {
    const { message } = req.body;
    next(new ConflictError(message || "Conflict occurred"));
  });

  // Route that throws an UnauthorizedError (401)
  app.get("/test/unauthorized", (req, res, next) => {
    const message = (req.query.message as string) || undefined;
    next(new UnauthorizedError(message));
  });

  // Route that throws a ForbiddenError (403)
  app.get("/test/forbidden", (req, res, next) => {
    const message = (req.query.message as string) || undefined;
    next(new ForbiddenError(message));
  });

  // Route that throws a generic Error (500)
  app.get("/test/internal-error", (req, res, next) => {
    next(new Error("Something went wrong internally"));
  });

  // Route that throws an AppError with custom status code
  app.post("/test/app-error", (req, res, next) => {
    const { message, statusCode, code, details } = req.body;
    next(new AppError(message || "App error", statusCode || 400, code || "CUSTOM_ERROR", details));
  });

  // Route that simulates a JSON parse error
  app.post("/test/parse-error", (req, res, next) => {
    const err: any = new SyntaxError("Unexpected token");
    err.type = "entity.parse.failed";
    err.status = 400;
    next(err);
  });

  // Apply the error handler
  app.use(errorHandler);

  return app;
}

// --- Generators ---

/** Generate a non-empty error message string */
const errorMessageArb = fc
  .stringOf(
    fc.constantFrom(
      ...("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_.,!?:;'\"()").split("")
    ),
    { minLength: 1, maxLength: 200 }
  )
  .filter((s) => s.trim().length > 0);

/** Generate validation detail field names */
const fieldNameArb = fc.constantFrom(
  "title",
  "description",
  "priority",
  "email",
  "password",
  "name",
  "role",
  "message",
  "status",
  "assignedTo"
);

/** Generate validation detail entries (field -> reason) */
const detailsArb = fc.dictionary(fieldNameArb, errorMessageArb, { minKeys: 1, maxKeys: 5 });

/** Generate an error code string */
const errorCodeArb = fc.constantFrom(
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "CONFLICT",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "INTERNAL_ERROR",
  "CUSTOM_ERROR"
);

/** Generate HTTP status codes for 400-level errors */
const clientErrorStatusArb = fc.constantFrom(400, 401, 403, 404, 409);

// --- Helper: Validate the error response structure ---

function assertErrorResponseStructure(body: any): void {
  // Must have "error" field as a string
  expect(body).toHaveProperty("error");
  expect(typeof body.error).toBe("string");
  expect(body.error.length).toBeGreaterThan(0);

  // Must have "code" field as a string
  expect(body).toHaveProperty("code");
  expect(typeof body.code).toBe("string");
  expect(body.code.length).toBeGreaterThan(0);

  // "details" is optional but if present must be an object
  if ("details" in body) {
    expect(typeof body.details).toBe("object");
    expect(body.details).not.toBeNull();
    expect(Array.isArray(body.details)).toBe(false);
  }

  // Must NOT have any unexpected top-level fields beyond error, code, details
  const allowedKeys = new Set(["error", "code", "details"]);
  for (const key of Object.keys(body)) {
    expect(allowedKeys.has(key)).toBe(true);
  }
}

// ============================================================================
// Property 24: Error responses follow consistent structure
// **Validates: Requirements 15.1**
// ============================================================================
describe("Property 24: Error responses follow consistent structure", () => {
  let app: express.Express;

  beforeAll(() => {
    app = createTestApp();
  });

  it("ValidationError (400) with arbitrary messages and details always produces consistent error structure", async () => {
    await fc.assert(
      fc.asyncProperty(
        errorMessageArb,
        detailsArb,
        async (message, details) => {
          const res = await request(app)
            .post("/test/validation-error")
            .send({ message, details });

          expect(res.status).toBe(400);
          assertErrorResponseStructure(res.body);
          expect(res.body.code).toBe("VALIDATION_ERROR");
          expect(res.body.error).toBe(message);
          expect(res.body.details).toEqual(details);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("ValidationError (400) without details still follows consistent structure (no details field)", async () => {
    await fc.assert(
      fc.asyncProperty(errorMessageArb, async (message) => {
        const res = await request(app)
          .post("/test/validation-error")
          .send({ message, details: {} });

        expect(res.status).toBe(400);
        assertErrorResponseStructure(res.body);
        expect(res.body.code).toBe("VALIDATION_ERROR");
        // Empty details should NOT be included in the response
        expect(res.body).not.toHaveProperty("details");
      }),
      { numRuns: 100 }
    );
  });

  it("NotFoundError (404) with arbitrary messages always produces consistent error structure", async () => {
    await fc.assert(
      fc.asyncProperty(errorMessageArb, async (message) => {
        const res = await request(app)
          .get("/test/not-found")
          .query({ message });

        expect(res.status).toBe(404);
        assertErrorResponseStructure(res.body);
        expect(res.body.code).toBe("NOT_FOUND");
        expect(res.body.error).toBe(message);
      }),
      { numRuns: 100 }
    );
  });

  it("ConflictError (409) with arbitrary messages always produces consistent error structure", async () => {
    await fc.assert(
      fc.asyncProperty(errorMessageArb, async (message) => {
        const res = await request(app)
          .post("/test/conflict")
          .send({ message });

        expect(res.status).toBe(409);
        assertErrorResponseStructure(res.body);
        expect(res.body.code).toBe("CONFLICT");
        expect(res.body.error).toBe(message);
      }),
      { numRuns: 100 }
    );
  });

  it("UnauthorizedError (401) always produces consistent error structure", async () => {
    await fc.assert(
      fc.asyncProperty(errorMessageArb, async (message) => {
        const res = await request(app)
          .get("/test/unauthorized")
          .query({ message });

        expect(res.status).toBe(401);
        assertErrorResponseStructure(res.body);
        expect(res.body.code).toBe("UNAUTHORIZED");
        expect(res.body.error).toBe(message);
      }),
      { numRuns: 100 }
    );
  });

  it("ForbiddenError (403) always produces consistent error structure", async () => {
    await fc.assert(
      fc.asyncProperty(errorMessageArb, async (message) => {
        const res = await request(app)
          .get("/test/forbidden")
          .query({ message });

        expect(res.status).toBe(403);
        assertErrorResponseStructure(res.body);
        expect(res.body.code).toBe("FORBIDDEN");
        expect(res.body.error).toBe(message);
      }),
      { numRuns: 100 }
    );
  });

  it("Generic Error (500) always produces consistent sanitized error structure", async () => {
    // Suppress console.error for unhandled error logging during test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(app).get("/test/internal-error");

    expect(res.status).toBe(500);
    assertErrorResponseStructure(res.body);
    expect(res.body.code).toBe("INTERNAL_ERROR");
    expect(res.body.error).toBe("Internal server error");
    // Must NOT expose internal details
    expect(res.body).not.toHaveProperty("details");
    expect(res.body.error).not.toContain("went wrong internally");

    consoleSpy.mockRestore();
  });

  it("JSON parse errors (400) always produce consistent error structure", async () => {
    const res = await request(app).post("/test/parse-error").send({});

    expect(res.status).toBe(400);
    assertErrorResponseStructure(res.body);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("AppError with arbitrary status codes and codes always produces consistent error structure", async () => {
    await fc.assert(
      fc.asyncProperty(
        errorMessageArb,
        clientErrorStatusArb,
        errorCodeArb,
        async (message, statusCode, code) => {
          const res = await request(app)
            .post("/test/app-error")
            .send({ message, statusCode, code });

          expect(res.status).toBe(statusCode);
          assertErrorResponseStructure(res.body);
          expect(res.body.code).toBe(code);
          expect(res.body.error).toBe(message);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("AppError with details always includes them in consistent structure", async () => {
    await fc.assert(
      fc.asyncProperty(
        errorMessageArb,
        detailsArb,
        async (message, details) => {
          const res = await request(app)
            .post("/test/app-error")
            .send({ message, statusCode: 400, code: "VALIDATION_ERROR", details });

          expect(res.status).toBe(400);
          assertErrorResponseStructure(res.body);
          expect(res.body.details).toEqual(details);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("500 error response never exposes stack traces, file paths, SQL, or env vars", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          "Error: ENOENT: no such file /var/app/secret.txt",
          "SELECT * FROM users WHERE password = 'admin123'",
          "at Object.<anonymous> (/app/src/index.ts:42:7)",
          "JWT_SECRET=my-super-secret-key-12345",
          "DATABASE_URL=postgres://user:pass@host/db",
          "TypeError: Cannot read property 'id' of undefined\n    at /Users/dev/project/src/service.ts:15:8"
        ),
        async (dangerousMessage) => {
          // Create an app with a route that throws an error with sensitive info
          const testApp = express();
          testApp.get("/test/sensitive", (_req, _res, next) => {
            next(new Error(dangerousMessage));
          });
          testApp.use(errorHandler);

          const res = await request(testApp).get("/test/sensitive");

          expect(res.status).toBe(500);
          assertErrorResponseStructure(res.body);
          // Response should only contain sanitized message
          expect(res.body.error).toBe("Internal server error");
          expect(res.body.code).toBe("INTERNAL_ERROR");
          // Must not contain sensitive info
          expect(JSON.stringify(res.body)).not.toContain(dangerousMessage);
        }
      ),
      { numRuns: 6 }
    );

    consoleSpy.mockRestore();
  });
});
