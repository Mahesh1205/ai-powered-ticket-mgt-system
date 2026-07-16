import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import app from "../../src/index";
import pool from "../../src/utils/db";
import { v4 as uuidv4 } from "uuid";

/**
 * Integration tests for Authentication and Authorization.
 *
 * Feature: support-ticket-management
 * Validates: Requirements 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8
 */

const TEST_ADMIN_ID = uuidv4();
const TEST_AGENT_ID = uuidv4();
const TEST_ADMIN_EMAIL = `test-admin-${Date.now()}@integration.test`;
const TEST_AGENT_EMAIL = `test-agent-${Date.now()}@integration.test`;
const TEST_PASSWORD = "TestPassword123!";

let adminToken: string;
let agentToken: string;

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  // Create test admin user
  await pool.query(
    `INSERT INTO users (id, name, email, "passwordHash", role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    [TEST_ADMIN_ID, "Test Admin", TEST_ADMIN_EMAIL, passwordHash, "admin"]
  );

  // Create test agent user
  await pool.query(
    `INSERT INTO users (id, name, email, "passwordHash", role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    [TEST_AGENT_ID, "Test Agent", TEST_AGENT_EMAIL, passwordHash, "agent"]
  );

  // Get tokens by logging in
  const adminLoginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: TEST_ADMIN_EMAIL, password: TEST_PASSWORD });
  adminToken = adminLoginRes.body.token;

  const agentLoginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: TEST_AGENT_EMAIL, password: TEST_PASSWORD });
  agentToken = agentLoginRes.body.token;
});

afterAll(async () => {
  // Clean up test users
  await pool.query("DELETE FROM users WHERE id = $1", [TEST_ADMIN_ID]);
  await pool.query("DELETE FROM users WHERE id = $1", [TEST_AGENT_ID]);
  await pool.end();
});

describe("Authentication and Authorization - Integration Tests", () => {
  describe("Requirement 20.1: Valid login returns 200 with token and user object", () => {
    it("should return 200 with token and user object for valid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: TEST_ADMIN_EMAIL, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(typeof res.body.token).toBe("string");
      expect(res.body.token.length).toBeGreaterThan(0);

      expect(res.body).toHaveProperty("user");
      expect(res.body.user).toHaveProperty("id");
      expect(res.body.user).toHaveProperty("name");
      expect(res.body.user).toHaveProperty("email");
      expect(res.body.user).toHaveProperty("role");
      expect(res.body.user.email).toBe(TEST_ADMIN_EMAIL);
      expect(res.body.user.role).toBe("admin");

      // passwordHash must never be present
      expect(res.body.user).not.toHaveProperty("passwordHash");
    });
  });

  describe("Requirement 20.2: Wrong password returns 401 without token", () => {
    it("should return 401 with error response and no token for wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: TEST_ADMIN_EMAIL, password: "WrongPassword999!" });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body).not.toHaveProperty("token");
    });
  });

  describe("Requirement 20.3: Non-existent email returns 401 without token", () => {
    it("should return 401 with error response and no token for non-existent email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nonexistent-user-xyz@nowhere.invalid", password: "SomePassword123!" });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body).not.toHaveProperty("token");
    });
  });

  describe("Requirement 20.4: Missing Bearer token returns 401", () => {
    it("should return 401 when no Authorization header is provided", async () => {
      const res = await request(app).get("/api/tickets");

      expect(res.status).toBe(401);
    });

    it("should return 401 when Authorization header has no Bearer prefix", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("Authorization", "InvalidFormat token123");

      expect(res.status).toBe(401);
    });
  });

  describe("Requirement 20.5: Expired JWT returns 401", () => {
    it("should return 401 when token is expired", async () => {
      const jwtSecret = process.env.JWT_SECRET!;

      // Create a token that expired 1 hour ago
      const expiredPayload = {
        sub: TEST_ADMIN_ID,
        email: TEST_ADMIN_EMAIL,
        role: "admin",
        iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
      };

      const expiredToken = jwt.sign(expiredPayload, jwtSecret, { noTimestamp: true });

      const res = await request(app)
        .get("/api/tickets")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });
  });

  describe("Requirement 20.6: Agent calling DELETE /api/users/:id returns 403", () => {
    it("should return 403 when agent attempts to delete a user", async () => {
      const res = await request(app)
        .delete(`/api/users/${TEST_ADMIN_ID}`)
        .set("Authorization", `Bearer ${agentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe("Requirement 20.7: Admin creating user returns 201 without passwordHash", () => {
    const newUserEmail = `new-user-${Date.now()}@integration.test`;
    let createdUserId: string;

    it("should return 201 with user object excluding passwordHash", async () => {
      const res = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "New Integration Test User",
          email: newUserEmail,
          password: "NewUser123!",
          role: "agent",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("name", "New Integration Test User");
      expect(res.body).toHaveProperty("email", newUserEmail);
      expect(res.body).toHaveProperty("role", "agent");
      expect(res.body).not.toHaveProperty("passwordHash");

      createdUserId = res.body.id;
    });

    // Clean up the created user after the test
    afterAll(async () => {
      if (createdUserId) {
        await pool.query("DELETE FROM users WHERE id = $1", [createdUserId]);
      }
    });
  });

  describe("Requirement 20.8: GET /api/auth/me with valid token returns user without passwordHash", () => {
    it("should return 200 with user object containing id, name, email, role and no passwordHash", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("name");
      expect(res.body).toHaveProperty("email");
      expect(res.body).toHaveProperty("role");
      expect(res.body).not.toHaveProperty("passwordHash");
    });
  });
});
