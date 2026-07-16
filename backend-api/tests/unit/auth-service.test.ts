import { describe, it, expect, beforeEach, vi } from "vitest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const TEST_SECRET = "test-secret-key-that-is-at-least-32-characters-long";

// Mock the database pool
vi.mock("../../src/utils/db", () => ({
  default: {
    query: vi.fn(),
  },
}));

import pool from "../../src/utils/db";
import { login } from "../../src/services/authService";

describe("authService.login", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", TEST_SECRET);
    vi.clearAllMocks();
  });

  it("should return null when user is not found by email", async () => {
    (pool.query as any).mockResolvedValue({ rows: [] });

    const result = await login("nonexistent@example.com", "password123");

    expect(result).toBeNull();
  });

  it("should return null when password does not match", async () => {
    const hashedPassword = await bcrypt.hash("correctpassword", 10);
    (pool.query as any).mockResolvedValue({
      rows: [
        {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          passwordHash: hashedPassword,
          role: "agent",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    const result = await login("test@example.com", "wrongpassword");

    expect(result).toBeNull();
  });

  it("should return a valid LoginResponse when credentials are correct", async () => {
    const hashedPassword = await bcrypt.hash("correctpassword", 10);
    (pool.query as any).mockResolvedValue({
      rows: [
        {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          passwordHash: hashedPassword,
          role: "agent",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    const result = await login("test@example.com", "correctpassword");

    expect(result).not.toBeNull();
    expect(result!.token).toBeDefined();
    expect(result!.user).toEqual({
      id: "user-123",
      name: "Test User",
      email: "test@example.com",
      role: "agent",
    });
  });

  it("should issue a JWT with correct claims (sub, email, role, iat, exp)", async () => {
    const hashedPassword = await bcrypt.hash("mypassword", 10);
    (pool.query as any).mockResolvedValue({
      rows: [
        {
          id: "user-456",
          name: "Admin User",
          email: "admin@example.com",
          passwordHash: hashedPassword,
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    const result = await login("admin@example.com", "mypassword");

    expect(result).not.toBeNull();
    const decoded = jwt.verify(result!.token, TEST_SECRET) as any;
    expect(decoded.sub).toBe("user-456");
    expect(decoded.email).toBe("admin@example.com");
    expect(decoded.role).toBe("admin");
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();
    expect(decoded.exp - decoded.iat).toBe(86400); // 24 hours
  });

  it("should never include passwordHash in the user object", async () => {
    const hashedPassword = await bcrypt.hash("password", 10);
    (pool.query as any).mockResolvedValue({
      rows: [
        {
          id: "user-789",
          name: "Some User",
          email: "some@example.com",
          passwordHash: hashedPassword,
          role: "agent",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    const result = await login("some@example.com", "password");

    expect(result).not.toBeNull();
    expect((result!.user as any).passwordHash).toBeUndefined();
    expect(Object.keys(result!.user)).toEqual(["id", "name", "email", "role"]);
  });
});
