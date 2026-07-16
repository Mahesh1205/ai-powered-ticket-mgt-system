import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from "../../src/utils/errors";
import { errorHandler } from "../../src/middleware/errorHandler";

function createMockReq(): Partial<Request> {
  return { method: "GET", path: "/test" };
}

function createMockRes(): Partial<Response> & { statusCode?: number; body?: any } {
  const res: any = {};
  res.statusCode = undefined;
  res.body = undefined;
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((data: any) => {
    res.body = data;
    return res;
  });
  return res;
}

describe("Custom Error Classes", () => {
  describe("ValidationError", () => {
    it("should create error with status 400 and VALIDATION_ERROR code", () => {
      const err = new ValidationError("Title is required");
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.message).toBe("Title is required");
      expect(err.name).toBe("ValidationError");
    });

    it("should accept field-level details", () => {
      const details = { title: "Required", priority: "Must be low, medium, or high" };
      const err = new ValidationError("Validation failed", details);
      expect(err.details).toEqual(details);
    });

    it("should be an instance of AppError and Error", () => {
      const err = new ValidationError("test");
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe("NotFoundError", () => {
    it("should create error with status 404 and NOT_FOUND code", () => {
      const err = new NotFoundError("Ticket not found");
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe("NOT_FOUND");
      expect(err.message).toBe("Ticket not found");
      expect(err.name).toBe("NotFoundError");
    });

    it("should not have details", () => {
      const err = new NotFoundError("User not found");
      expect(err.details).toBeUndefined();
    });
  });

  describe("ConflictError", () => {
    it("should create error with status 409 and CONFLICT code", () => {
      const err = new ConflictError("Invalid state transition");
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe("CONFLICT");
      expect(err.message).toBe("Invalid state transition");
      expect(err.name).toBe("ConflictError");
    });
  });

  describe("UnauthorizedError", () => {
    it("should create error with status 401 and UNAUTHORIZED code", () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe("UNAUTHORIZED");
      expect(err.message).toBe("Authentication required.");
      expect(err.name).toBe("UnauthorizedError");
    });

    it("should accept custom message", () => {
      const err = new UnauthorizedError("Token expired");
      expect(err.message).toBe("Token expired");
    });
  });

  describe("ForbiddenError", () => {
    it("should create error with status 403 and FORBIDDEN code", () => {
      const err = new ForbiddenError();
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toBe("Access denied. Insufficient permissions.");
      expect(err.name).toBe("ForbiddenError");
    });

    it("should accept custom message", () => {
      const err = new ForbiddenError("Admin access required");
      expect(err.message).toBe("Admin access required");
    });
  });
});

describe("errorHandler middleware", () => {
  it("should return 400 with details for ValidationError", () => {
    const details = { title: "Required", priority: "Invalid value" };
    const err = new ValidationError("Validation failed", details);
    const req = createMockReq() as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect((res as any).statusCode).toBe(400);
    expect((res as any).body).toEqual({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: { title: "Required", priority: "Invalid value" },
    });
  });

  it("should return 400 without details when ValidationError has no details", () => {
    const err = new ValidationError("Bad input");
    const req = createMockReq() as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect((res as any).statusCode).toBe(400);
    expect((res as any).body).toEqual({
      error: "Bad input",
      code: "VALIDATION_ERROR",
    });
    expect((res as any).body.details).toBeUndefined();
  });

  it("should return 404 for NotFoundError", () => {
    const err = new NotFoundError("Ticket not found");
    const req = createMockReq() as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect((res as any).statusCode).toBe(404);
    expect((res as any).body).toEqual({
      error: "Ticket not found",
      code: "NOT_FOUND",
    });
  });

  it("should return 409 for ConflictError", () => {
    const err = new ConflictError("Duplicate email");
    const req = createMockReq() as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect((res as any).statusCode).toBe(409);
    expect((res as any).body).toEqual({
      error: "Duplicate email",
      code: "CONFLICT",
    });
  });

  it("should return 401 for UnauthorizedError", () => {
    const err = new UnauthorizedError("Invalid token");
    const req = createMockReq() as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect((res as any).statusCode).toBe(401);
    expect((res as any).body).toEqual({
      error: "Invalid token",
      code: "UNAUTHORIZED",
    });
  });

  it("should return 403 for ForbiddenError", () => {
    const err = new ForbiddenError("Admin only");
    const req = createMockReq() as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect((res as any).statusCode).toBe(403);
    expect((res as any).body).toEqual({
      error: "Admin only",
      code: "FORBIDDEN",
    });
  });

  it("should return sanitized 500 for unknown errors without exposing internals", () => {
    const err = new Error("FATAL: connection to database at 'localhost:5432' failed: password authentication failed for user 'admin'");
    const req = createMockReq() as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    // Suppress console.error during test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    errorHandler(err, req, res, next);

    expect((res as any).statusCode).toBe(500);
    expect((res as any).body).toEqual({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
    // Verify no stack trace, file paths, SQL, or env vars in response
    const responseStr = JSON.stringify((res as any).body);
    expect(responseStr).not.toContain("stack");
    expect(responseStr).not.toContain("localhost");
    expect(responseStr).not.toContain("password");
    expect(responseStr).not.toContain(".ts");
    expect(responseStr).not.toContain(".js");

    consoleSpy.mockRestore();
  });

  it("should never expose stack traces in 500 response", () => {
    const err = new Error("Something broke");
    err.stack = "Error: Something broke\n    at /app/src/services/ticketService.ts:42:5\n    at processTickElement";
    const req = createMockReq() as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    errorHandler(err, req, res, next);

    const responseStr = JSON.stringify((res as any).body);
    expect(responseStr).not.toContain("ticketService");
    expect(responseStr).not.toContain("/app/src");
    expect(responseStr).not.toContain("at ");
    expect((res as any).statusCode).toBe(500);

    consoleSpy.mockRestore();
  });

  it("should handle body-parser JSON errors as 400", () => {
    const err: any = new SyntaxError("Unexpected token < in JSON at position 0");
    err.type = "entity.parse.failed";
    err.status = 400;
    const req = createMockReq() as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect((res as any).statusCode).toBe(400);
    expect((res as any).body).toEqual({
      error: "Invalid request body.",
      code: "VALIDATION_ERROR",
    });
  });

  it("should return consistent { error, code } structure for all error types", () => {
    const errors = [
      new ValidationError("bad"),
      new NotFoundError("missing"),
      new ConflictError("conflict"),
      new UnauthorizedError(),
      new ForbiddenError(),
    ];

    for (const err of errors) {
      const req = createMockReq() as Request;
      const res = createMockRes() as unknown as Response;
      const next = vi.fn() as NextFunction;

      errorHandler(err, req, res, next);

      expect((res as any).body).toHaveProperty("error");
      expect((res as any).body).toHaveProperty("code");
      expect(typeof (res as any).body.error).toBe("string");
      expect(typeof (res as any).body.code).toBe("string");
    }
  });
});
