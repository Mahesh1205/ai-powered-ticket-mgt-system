import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
import * as fc from "fast-check";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";

const TEST_SECRET = "test-secret-key-that-is-at-least-32-characters-long";

// Pre-compute bcrypt hashes to avoid expensive hashing in property loops
// We use a small set of pre-hashed passwords to make tests fast while still exercising the logic
const PRECOMPUTED_PASSWORDS: { plain: string; hash: string }[] = [];

beforeAll(async () => {
  const passwords = ["password1", "Str0ngP@ss!", "simple123", "another-pwd", "testPass99"];
  for (const p of passwords) {
    const hash = await bcrypt.hash(p, 10);
    PRECOMPUTED_PASSWORDS.push({ plain: p, hash });
  }
});

// Mock the database pool
vi.mock("../../src/utils/db", () => ({
  default: {
    query: vi.fn(),
  },
}));

import pool from "../../src/utils/db";
import { login } from "../../src/services/authService";
import { authMiddleware } from "../../src/middleware/auth";

// --- Generators ---

/** Generates valid email-like strings */
const emailArb = fc.tuple(
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 1, maxLength: 20 }),
  fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 2, maxLength: 10 }),
  fc.constantFrom("com", "org", "net", "io")
).map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/** Generates user roles */
const roleArb = fc.constantFrom("agent" as const, "admin" as const);

/** Generates user names */
const nameArb = fc.string({ minLength: 1, maxLength: 50 });

/** Generates UUID-like strings */
const uuidArb = fc.uuid();

/** Index into pre-computed passwords */
const passwordIndexArb = fc.nat({ max: 4 });

// --- Helpers ---

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

// ============================================================================
// Property 4: JWT contains required claims with correct expiry
// **Validates: Requirements 1.4**
// ============================================================================
describe("Property 4: JWT contains required claims with correct expiry", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", TEST_SECRET);
    vi.clearAllMocks();
  });

  it("For any successful login, the issued JWT SHALL decode to a payload containing sub, email, role, iat, and exp with exp exactly 24h after iat", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        nameArb,
        emailArb,
        passwordIndexArb,
        roleArb,
        async (userId, name, email, pwdIdx, role) => {
          const { plain, hash } = PRECOMPUTED_PASSWORDS[pwdIdx];
          (pool.query as any).mockResolvedValue({
            rows: [
              {
                id: userId,
                name,
                email,
                passwordHash: hash,
                role,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          });

          const result = await login(email, plain);

          expect(result).not.toBeNull();
          const decoded = jwt.verify(result!.token, TEST_SECRET) as any;
          expect(decoded.sub).toBe(userId);
          expect(decoded.email).toBe(email);
          expect(decoded.role).toBe(role);
          expect(typeof decoded.iat).toBe("number");
          expect(typeof decoded.exp).toBe("number");
          expect(decoded.exp - decoded.iat).toBe(86400); // 24 hours in seconds
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);
});

// ============================================================================
// Property 5: Login authentication round trip
// **Validates: Requirements 1.1**
// ============================================================================
describe("Property 5: Login authentication round trip", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", TEST_SECRET);
    vi.clearAllMocks();
  });

  it("For any user with known credentials, login SHALL return a valid JWT and matching user object", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        nameArb,
        emailArb,
        passwordIndexArb,
        roleArb,
        async (userId, name, email, pwdIdx, role) => {
          const { plain, hash } = PRECOMPUTED_PASSWORDS[pwdIdx];
          (pool.query as any).mockResolvedValue({
            rows: [
              {
                id: userId,
                name,
                email,
                passwordHash: hash,
                role,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          });

          const result = await login(email, plain);

          expect(result).not.toBeNull();
          expect(result!.token).toBeTruthy();
          expect(result!.user).toEqual({
            id: userId,
            name,
            email,
            role,
          });

          // Token should be verifiable
          const decoded = jwt.verify(result!.token, TEST_SECRET) as any;
          expect(decoded.sub).toBe(userId);
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);
});

// ============================================================================
// Property 6: Wrong password is always rejected
// **Validates: Requirements 1.2**
// ============================================================================
describe("Property 6: Wrong password is always rejected", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", TEST_SECRET);
    vi.clearAllMocks();
  });

  it("For any registered user and any password that doesn't match, login SHALL return null", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        nameArb,
        emailArb,
        passwordIndexArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        roleArb,
        async (userId, name, email, pwdIdx, wrongPassword, role) => {
          const { plain, hash } = PRECOMPUTED_PASSWORDS[pwdIdx];
          // Ensure the wrong password is actually different
          fc.pre(wrongPassword !== plain);

          (pool.query as any).mockResolvedValue({
            rows: [
              {
                id: userId,
                name,
                email,
                passwordHash: hash,
                role,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          });

          const result = await login(email, wrongPassword);

          expect(result).toBeNull();
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);
});

// ============================================================================
// Property 7: Malformed login requests are rejected
// **Validates: Requirements 1.6**
// ============================================================================
describe("Property 7: Malformed login requests are rejected", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", TEST_SECRET);
    vi.clearAllMocks();
  });

  it("For any request with an empty email, the service returns null (route rejects with 400 before service call)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 50 }),
        async (password) => {
          // Empty email means findByEmail returns no rows
          (pool.query as any).mockResolvedValue({ rows: [] });

          const result = await login("", password);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("For any request with a non-existent email, login returns null (generic rejection)", async () => {
    await fc.assert(
      fc.asyncProperty(
        emailArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        async (email, password) => {
          // User not found
          (pool.query as any).mockResolvedValue({ rows: [] });

          const result = await login(email, password);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("For any request with empty password against a valid user, login returns null", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        nameArb,
        emailArb,
        passwordIndexArb,
        roleArb,
        async (userId, name, email, pwdIdx, role) => {
          const { hash } = PRECOMPUTED_PASSWORDS[pwdIdx];
          (pool.query as any).mockResolvedValue({
            rows: [
              {
                id: userId,
                name,
                email,
                passwordHash: hash,
                role,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          });

          // Empty string will never match a bcrypt hash
          const result = await login(email, "");
          expect(result).toBeNull();
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);
});

// ============================================================================
// Property 8: Session retrieval round trip
// **Validates: Requirements 2.1, 2.2**
// ============================================================================
describe("Property 8: Session retrieval round trip", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", TEST_SECRET);
    vi.clearAllMocks();
  });

  it("For any user who successfully logs in, using the JWT with authMiddleware SHALL attach the correct user claims", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        nameArb,
        emailArb,
        passwordIndexArb,
        roleArb,
        async (userId, name, email, pwdIdx, role) => {
          const { plain, hash } = PRECOMPUTED_PASSWORDS[pwdIdx];
          (pool.query as any).mockResolvedValue({
            rows: [
              {
                id: userId,
                name,
                email,
                passwordHash: hash,
                role,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          });

          // Step 1: Login to get a token
          const loginResult = await login(email, plain);
          expect(loginResult).not.toBeNull();

          // Step 2: Use the token with authMiddleware
          const req = createMockReq(`Bearer ${loginResult!.token}`) as Request;
          const res = createMockRes() as unknown as Response;
          const next = vi.fn() as NextFunction;

          authMiddleware(req, res, next);

          // Step 3: Verify middleware passes and attaches correct user
          expect(next).toHaveBeenCalled();
          expect(req.user).toBeDefined();
          expect(req.user!.sub).toBe(userId);
          expect(req.user!.email).toBe(email);
          expect(req.user!.role).toBe(role);
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);
});

// ============================================================================
// Property 9: Invalid or expired tokens are universally rejected
// **Validates: Requirements 2.2, 3.1, 3.2**
// ============================================================================
describe("Property 9: Invalid or expired tokens are universally rejected", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", TEST_SECRET);
    vi.clearAllMocks();
  });

  it("For any random/malformed string used as a Bearer token, authMiddleware SHALL return 401", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (randomToken) => {
          const req = createMockReq(`Bearer ${randomToken}`) as Request;
          const res = createMockRes() as unknown as Response;
          const next = vi.fn() as NextFunction;

          authMiddleware(req, res, next);

          expect((res as any).statusCode).toBe(401);
          expect((res as any).body.code).toBe("UNAUTHORIZED");
          expect(next).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("For any JWT signed with a wrong secret, authMiddleware SHALL return 401", () => {
    fc.assert(
      fc.property(
        uuidArb,
        emailArb,
        roleArb,
        fc.string({ minLength: 32, maxLength: 64 }),
        (userId, email, role, wrongSecret) => {
          // Ensure the wrong secret is actually different
          fc.pre(wrongSecret !== TEST_SECRET);

          const token = jwt.sign(
            { sub: userId, email, role },
            wrongSecret,
            { expiresIn: "24h" }
          );

          const req = createMockReq(`Bearer ${token}`) as Request;
          const res = createMockRes() as unknown as Response;
          const next = vi.fn() as NextFunction;

          authMiddleware(req, res, next);

          expect((res as any).statusCode).toBe(401);
          expect((res as any).body.code).toBe("UNAUTHORIZED");
          expect(next).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("For any JWT with an expired exp claim, authMiddleware SHALL return 401", () => {
    fc.assert(
      fc.property(
        uuidArb,
        emailArb,
        roleArb,
        fc.integer({ min: 1, max: 86400 }),
        (userId, email, role, secondsAgo) => {
          // Create a token that expired secondsAgo seconds in the past
          const now = Math.floor(Date.now() / 1000);
          const token = jwt.sign(
            {
              sub: userId,
              email,
              role,
              iat: now - secondsAgo - 86400,
              exp: now - secondsAgo,
            },
            TEST_SECRET
          );

          const req = createMockReq(`Bearer ${token}`) as Request;
          const res = createMockRes() as unknown as Response;
          const next = vi.fn() as NextFunction;

          authMiddleware(req, res, next);

          expect((res as any).statusCode).toBe(401);
          expect((res as any).body.code).toBe("UNAUTHORIZED");
          expect(next).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("For any request without a Bearer token, authMiddleware SHALL return 401", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(undefined, "", "Basic abc123", "Token xyz", "bearer token", "BEARER abc"),
        (authHeader) => {
          const req: Partial<Request> = {
            headers: authHeader ? { authorization: authHeader } : {},
          };
          const res = createMockRes() as unknown as Response;
          const next = vi.fn() as NextFunction;

          authMiddleware(req as Request, res, next);

          expect((res as any).statusCode).toBe(401);
          expect((res as any).body.code).toBe("UNAUTHORIZED");
          expect(next).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 20 }
    );
  });
});
