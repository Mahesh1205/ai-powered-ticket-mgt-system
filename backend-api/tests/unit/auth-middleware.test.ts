import { describe, it, expect, beforeEach, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authMiddleware, requireAdmin } from "../../src/middleware/auth";

const TEST_SECRET = "test-secret-key-that-is-at-least-32-characters-long";

function createMockReq(authHeader?: string): Partial<Request> {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  };
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

describe("authMiddleware", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", TEST_SECRET);
  });

  it("should return 401 when no Authorization header is present", () => {
    const req = createMockReq() as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect((res as any).statusCode).toBe(401);
    expect((res as any).body.code).toBe("UNAUTHORIZED");
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 when Authorization header does not start with Bearer", () => {
    const req = createMockReq("Basic abc123") as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect((res as any).statusCode).toBe(401);
    expect((res as any).body.code).toBe("UNAUTHORIZED");
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 when Bearer token is empty", () => {
    const req = createMockReq("Bearer ") as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect((res as any).statusCode).toBe(401);
    expect((res as any).body.code).toBe("UNAUTHORIZED");
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 when token has invalid signature", () => {
    const token = jwt.sign(
      { sub: "user-123", email: "test@example.com", role: "agent" },
      "wrong-secret-key-that-is-at-least-32-chars",
      { expiresIn: "24h" }
    );
    const req = createMockReq(`Bearer ${token}`) as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect((res as any).statusCode).toBe(401);
    expect((res as any).body.code).toBe("UNAUTHORIZED");
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 when token is expired", () => {
    const token = jwt.sign(
      { sub: "user-123", email: "test@example.com", role: "agent" },
      TEST_SECRET,
      { expiresIn: "-1h" } // Already expired
    );
    const req = createMockReq(`Bearer ${token}`) as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect((res as any).statusCode).toBe(401);
    expect((res as any).body.code).toBe("UNAUTHORIZED");
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 when token is a random/malformed string", () => {
    const req = createMockReq("Bearer not-a-valid-jwt-token") as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect((res as any).statusCode).toBe(401);
    expect((res as any).body.code).toBe("UNAUTHORIZED");
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next() and attach user to req when token is valid", () => {
    const payload = { sub: "user-123", email: "test@example.com", role: "agent" as const };
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: "24h" });
    const req = createMockReq(`Bearer ${token}`) as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.sub).toBe("user-123");
    expect(req.user!.email).toBe("test@example.com");
    expect(req.user!.role).toBe("agent");
  });

  it("should attach decoded user with correct iat and exp fields", () => {
    const payload = { sub: "user-456", email: "admin@example.com", role: "admin" as const };
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: "24h" });
    const req = createMockReq(`Bearer ${token}`) as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user!.iat).toBeDefined();
    expect(req.user!.exp).toBeDefined();
    expect(req.user!.exp - req.user!.iat).toBe(86400); // 24 hours in seconds
  });
});

describe("requireAdmin", () => {
  it("should return 401 when req.user is not set", () => {
    const req = { user: undefined } as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    requireAdmin(req, res, next);

    expect((res as any).statusCode).toBe(401);
    expect((res as any).body.code).toBe("UNAUTHORIZED");
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 when user role is agent", () => {
    const req = {
      user: { sub: "user-123", email: "agent@example.com", role: "agent" as const, iat: 0, exp: 0 },
    } as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    requireAdmin(req, res, next);

    expect((res as any).statusCode).toBe(403);
    expect((res as any).body.code).toBe("FORBIDDEN");
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next() when user role is admin", () => {
    const req = {
      user: { sub: "user-456", email: "admin@example.com", role: "admin" as const, iat: 0, exp: 0 },
    } as Request;
    const res = createMockRes() as unknown as Response;
    const next = vi.fn() as NextFunction;

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((res as any).statusCode).toBeUndefined();
  });
});
