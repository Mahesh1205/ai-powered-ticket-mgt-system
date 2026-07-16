import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import {
  ValidationError,
  ConflictError,
  ForbiddenError,
} from "../../src/utils/errors";
import type { UserListDTO } from "../../src/types";

/**
 * Property-based tests for User Management.
 *
 * Feature: support-ticket-management
 * Validates: Requirements 1.5, 10.2, 11.2, 11.3, 12.1, 12.3, 13.2, 13.3, 17.1, 17.4
 */

// Mock dependencies
vi.mock("../../src/repositories/userRepository");
vi.mock("../../src/utils/db", () => ({
  default: { query: vi.fn() },
}));

import * as userService from "../../src/services/userService";
import * as userRepository from "../../src/repositories/userRepository";

// --- Generators ---

/** UUID-like string for IDs */
const uuidArb = fc.uuid();

/** Valid email addresses */
const validEmailArb = fc
  .tuple(
    fc.stringOf(
      fc.constantFrom(
        ..."abcdefghijklmnopqrstuvwxyz0123456789".split("")
      ),
      { minLength: 3, maxLength: 15 }
    ),
    fc.stringOf(
      fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz".split("")),
      { minLength: 2, maxLength: 10 }
    ),
    fc.constantFrom("com", "org", "net", "io", "dev")
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/** Valid names: non-empty, max 100 chars */
const validNameArb = fc
  .stringOf(
    fc.constantFrom(
      ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ -".split("")
    ),
    { minLength: 1, maxLength: 50 }
  )
  .filter((s) => s.trim().length > 0);

/** Valid passwords: min 6 chars */
const validPasswordArb = fc.stringOf(
  fc.constantFrom(
    ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%".split(
      ""
    )
  ),
  { minLength: 6, maxLength: 30 }
);

/** Valid user roles */
const validRoleArb = fc.constantFrom<"agent" | "admin">("agent", "admin");

// ============================================================================
// Property 3: passwordHash is never exposed in any API response
// **Validates: Requirements 1.5, 10.2, 17.4**
// ============================================================================
describe("Property 3: passwordHash is never exposed in any API response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listUsers response SHALL never contain a passwordHash field", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: uuidArb,
            name: validNameArb,
            email: validEmailArb,
            role: validRoleArb,
            createdAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2025-12-31") }),
            updatedAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2025-12-31") }),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        async (users) => {
          vi.mocked(userRepository.findAll).mockResolvedValue(users as any);

          const result = await userService.listUsers();

          // Property: no user object should ever contain passwordHash
          for (const user of result) {
            expect(user).not.toHaveProperty("passwordHash");
            // Check deeply via JSON serialization (no hidden fields)
            const json = JSON.stringify(user);
            expect(json).not.toContain("passwordHash");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("createUser response SHALL never contain a passwordHash field", async () => {
    await fc.assert(
      fc.asyncProperty(
        validNameArb,
        validEmailArb,
        validPasswordArb,
        validRoleArb,
        uuidArb,
        async (name, email, password, role, id) => {
          // Mock no existing user (no duplicate email)
          vi.mocked(userRepository.findByEmailCaseInsensitive).mockResolvedValue(null);

          // Mock successful creation returning a SafeUserRow (no passwordHash)
          const now = new Date();
          vi.mocked(userRepository.create).mockResolvedValue({
            id,
            name,
            email,
            role,
            createdAt: now,
            updatedAt: now,
          });

          const result = await userService.createUser({ name, email, password, role });

          // Property: response must not contain passwordHash
          expect(result).not.toHaveProperty("passwordHash");
          const json = JSON.stringify(result);
          expect(json).not.toContain("passwordHash");
        }
      ),
      { numRuns: 20 } // Fewer runs because bcrypt hashing is CPU-intensive
    );
  }, 30000);

  it("updateUser response SHALL never contain a passwordHash field", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        validNameArb,
        validEmailArb,
        validRoleArb,
        async (id, name, email, role) => {
          // Mock no duplicate email
          vi.mocked(userRepository.findByEmailCaseInsensitive).mockResolvedValue(null);

          // Mock successful update returning SafeUserRow
          const now = new Date();
          vi.mocked(userRepository.update).mockResolvedValue({
            id,
            name,
            email,
            role,
            createdAt: new Date("2024-01-01"),
            updatedAt: now,
          });

          const result = await userService.updateUser(id, { name });

          // Property: response must not contain passwordHash
          expect(result).not.toHaveProperty("passwordHash");
          const json = JSON.stringify(result);
          expect(json).not.toContain("passwordHash");
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 10: Agent role cannot access admin-only endpoints
// **Validates: Requirements 11.3, 12.3, 13.3**
// ============================================================================
describe("Property 10: Agent role cannot access admin-only endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("For any valid JWT belonging to an agent-role user, the requireAdmin middleware SHALL reject with 403", async () => {
    // This tests the requireAdmin middleware logic directly
    const { requireAdmin } = await import("../../src/middleware/auth");

    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        validEmailArb,
        async (userId, email) => {
          // Simulate a request with an agent user attached
          const req = {
            user: {
              sub: userId,
              email,
              role: "agent" as const,
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 86400,
            },
          } as any;

          let statusCode: number | undefined;
          let responseBody: any;

          const res = {
            status: (code: number) => {
              statusCode = code;
              return {
                json: (body: any) => {
                  responseBody = body;
                },
              };
            },
          } as any;

          const next = vi.fn();

          requireAdmin(req, res, next);

          // Property: agent role ALWAYS gets 403
          expect(statusCode).toBe(403);
          expect(responseBody.code).toBe("FORBIDDEN");
          // next() should NOT be called
          expect(next).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("For any valid JWT belonging to an admin-role user, the requireAdmin middleware SHALL allow access", async () => {
    const { requireAdmin } = await import("../../src/middleware/auth");

    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        validEmailArb,
        async (userId, email) => {
          // Simulate a request with an admin user attached
          const req = {
            user: {
              sub: userId,
              email,
              role: "admin" as const,
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 86400,
            },
          } as any;

          const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
          } as any;

          const next = vi.fn();

          requireAdmin(req, res, next);

          // Property: admin role ALWAYS gets through
          expect(next).toHaveBeenCalled();
          expect(res.status).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 19: Duplicate email detection is case-insensitive
// **Validates: Requirements 11.2**
// ============================================================================
describe("Property 19: Duplicate email detection is case-insensitive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("For any existing user with email E, attempting to create a user with email differing only in casing SHALL return a ValidationError", async () => {
    await fc.assert(
      fc.asyncProperty(
        validNameArb,
        validEmailArb,
        validPasswordArb,
        validRoleArb,
        uuidArb,
        // Generate a case transformation function
        fc.constantFrom(
          (s: string) => s.toUpperCase(),
          (s: string) => s.toLowerCase(),
          (s: string) =>
            s
              .split("")
              .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
              .join("")
        ),
        async (name, email, password, role, existingId, transform) => {
          const caseVariant = transform(email);

          // Mock: case-insensitive search finds an existing user
          vi.mocked(userRepository.findByEmailCaseInsensitive).mockResolvedValue({
            id: existingId,
            name: "Existing User",
            email: email,
            role: "agent",
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Attempt to create with the case-variant email
          await expect(
            userService.createUser({
              name,
              email: caseVariant,
              password,
              role,
            })
          ).rejects.toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Duplicate email detection prevents repository.create from being called", async () => {
    await fc.assert(
      fc.asyncProperty(
        validNameArb,
        validEmailArb,
        validPasswordArb,
        validRoleArb,
        uuidArb,
        async (name, email, password, role, existingId) => {
          // Mock: case-insensitive search finds an existing user
          vi.mocked(userRepository.findByEmailCaseInsensitive).mockResolvedValue({
            id: existingId,
            name: "Existing User",
            email: email.toLowerCase(),
            role: "agent",
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          try {
            await userService.createUser({
              name,
              email: email.toUpperCase(),
              password,
              role,
            });
          } catch {
            // Expected
          }

          // Property: create should never be called when duplicate detected
          expect(userRepository.create).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 20: User partial update preserves unmodified fields
// **Validates: Requirements 12.1**
// ============================================================================
describe("Property 20: User partial update preserves unmodified fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("When partially updating a user, fields not included in the update remain unchanged", async () => {
    const existingUserArb = fc.record({
      id: uuidArb,
      name: validNameArb,
      email: validEmailArb,
      role: validRoleArb,
      createdAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2025-01-01") }),
      updatedAt: fc.date({ min: new Date("2024-01-01"), max: new Date("2025-01-01") }),
    });

    // Generate which fields to include in the update (at least one of name, email, role)
    const fieldsToUpdateArb = fc.subarray(
      ["name", "email", "role"] as const,
      { minLength: 1, maxLength: 3 }
    );

    await fc.assert(
      fc.asyncProperty(
        existingUserArb,
        fieldsToUpdateArb,
        validNameArb,
        validEmailArb,
        validRoleArb,
        async (existingUser, fieldsToUpdate, newName, newEmail, newRole) => {
          // Build the update payload with only selected fields
          const updatePayload: Record<string, unknown> = {};
          if (fieldsToUpdate.includes("name")) updatePayload.name = newName;
          if (fieldsToUpdate.includes("email")) updatePayload.email = newEmail;
          if (fieldsToUpdate.includes("role")) updatePayload.role = newRole;

          // Mock: no duplicate email conflict
          vi.mocked(userRepository.findByEmailCaseInsensitive).mockResolvedValue(null);

          // Simulate the DB update: apply only the changed fields
          const updatedRow = {
            ...existingUser,
            ...(fieldsToUpdate.includes("name") ? { name: newName } : {}),
            ...(fieldsToUpdate.includes("email") ? { email: newEmail } : {}),
            ...(fieldsToUpdate.includes("role") ? { role: newRole } : {}),
            updatedAt: new Date(), // updatedAt always changes
          };

          vi.mocked(userRepository.update).mockResolvedValue(updatedRow);

          const result = await userService.updateUser(
            existingUser.id,
            updatePayload as any
          );

          // Property: fields NOT in the update remain unchanged
          if (!fieldsToUpdate.includes("name")) {
            expect(result.name).toBe(existingUser.name);
          }
          if (!fieldsToUpdate.includes("email")) {
            expect(result.email).toBe(existingUser.email);
          }
          if (!fieldsToUpdate.includes("role")) {
            expect(result.role).toBe(existingUser.role);
          }

          // createdAt NEVER changes
          expect(result.createdAt).toBe(
            existingUser.createdAt instanceof Date
              ? existingUser.createdAt.toISOString()
              : String(existingUser.createdAt)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 21: User deletion blocked when references exist
// **Validates: Requirements 13.2**
// ============================================================================
describe("Property 21: User deletion blocked when references exist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("For any user referenced by existing tickets, attempting to delete SHALL throw ConflictError", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        async (userId, requestingUserId) => {
          // Ensure we don't hit self-deletion check
          fc.pre(userId !== requestingUserId);

          // Mock: repository throws ConflictError for ticket references
          vi.mocked(userRepository.deleteUser).mockRejectedValue(
            new ConflictError(
              "Cannot delete user. User is referenced by existing tickets."
            )
          );

          await expect(
            userService.deleteUser(userId, requestingUserId)
          ).rejects.toThrow(ConflictError);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("For any user referenced by existing comments, attempting to delete SHALL throw ConflictError", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        uuidArb,
        async (userId, requestingUserId) => {
          // Ensure we don't hit self-deletion check
          fc.pre(userId !== requestingUserId);

          // Mock: repository throws ConflictError for comment references
          vi.mocked(userRepository.deleteUser).mockRejectedValue(
            new ConflictError(
              "Cannot delete user. User is referenced by existing comments."
            )
          );

          await expect(
            userService.deleteUser(userId, requestingUserId)
          ).rejects.toThrow(ConflictError);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Self-deletion is always blocked with ForbiddenError regardless of references", async () => {
    await fc.assert(
      fc.asyncProperty(uuidArb, async (userId) => {
        // Self-deletion: requestingUserId === userId
        await expect(
          userService.deleteUser(userId, userId)
        ).rejects.toThrow(ForbiddenError);

        // Repository should never be called for self-deletion
        expect(userRepository.deleteUser).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 22: Passwords stored with bcrypt cost factor ≥ 10
// **Validates: Requirements 17.1**
// ============================================================================
describe("Property 22: Passwords stored with bcrypt cost factor ≥ 10", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("For any user created with a password, the passwordHash passed to repository SHALL be a valid bcrypt hash with cost factor >= 10", async () => {
    await fc.assert(
      fc.asyncProperty(
        validNameArb,
        validEmailArb,
        validPasswordArb,
        validRoleArb,
        uuidArb,
        async (name, email, password, role, id) => {
          // Mock: no duplicate email
          vi.mocked(userRepository.findByEmailCaseInsensitive).mockResolvedValue(null);

          // Capture what's passed to create
          let capturedHash = "";
          const now = new Date();
          vi.mocked(userRepository.create).mockImplementation(async (input) => {
            capturedHash = input.passwordHash;
            return {
              id,
              name: input.name,
              email: input.email,
              role: input.role,
              createdAt: now,
              updatedAt: now,
            };
          });

          await userService.createUser({ name, email, password, role });

          // Property 1: Must be a valid bcrypt hash (starts with $2a$ or $2b$)
          expect(capturedHash).toMatch(/^\$2[aby]\$/);

          // Property 2: Cost factor must be >= 10
          // Bcrypt hash format: $2a$XX$... where XX is the cost factor
          const costFactor = parseInt(capturedHash.split("$")[2], 10);
          expect(costFactor).toBeGreaterThanOrEqual(10);

          // Property 3: Hash has expected length (60 chars for bcrypt)
          expect(capturedHash.length).toBe(60);
        }
      ),
      { numRuns: 20 } // Fewer runs because bcrypt hashing is CPU-intensive
    );
  }, 30000);

  it("For any user updated with a password, the passwordHash passed to repository SHALL be a valid bcrypt hash with cost factor >= 10", async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        validPasswordArb,
        async (userId, password) => {
          // Mock: no duplicate email
          vi.mocked(userRepository.findByEmailCaseInsensitive).mockResolvedValue(null);

          // Capture what's passed to update
          let capturedHash = "";
          const now = new Date();
          vi.mocked(userRepository.update).mockImplementation(async (_id, input) => {
            capturedHash = input.passwordHash || "";
            return {
              id: userId,
              name: "Test User",
              email: "test@example.com",
              role: "agent" as const,
              createdAt: new Date("2024-01-01"),
              updatedAt: now,
            };
          });

          await userService.updateUser(userId, { password });

          // Property 1: Must be a valid bcrypt hash
          expect(capturedHash).toMatch(/^\$2[aby]\$/);

          // Property 2: Cost factor must be >= 10
          const costFactor = parseInt(capturedHash.split("$")[2], 10);
          expect(costFactor).toBeGreaterThanOrEqual(10);

          // Property 3: Hash has expected length (60 chars for bcrypt)
          expect(capturedHash.length).toBe(60);
        }
      ),
      { numRuns: 20 } // Fewer runs because bcrypt hashing is CPU-intensive
    );
  }, 30000);
});
