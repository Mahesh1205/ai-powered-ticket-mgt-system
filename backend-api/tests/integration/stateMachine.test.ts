import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/index";
import pool from "../../src/utils/db";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

/**
 * Integration Tests: Ticket State Machine Transitions
 *
 * Tests all valid and invalid status transitions via the HTTP API.
 * Uses supertest against the Express app with the test database.
 *
 * Validates: Requirements 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10
 */

describe("State Machine Integration Tests", () => {
  let testUserId: string;
  let authToken: string;
  const testEmail = `test-sm-${Date.now()}@example.com`;
  const testPassword = "TestPass123!";

  beforeAll(async () => {
    // Create a test user directly in the database
    const passwordHash = await bcrypt.hash(testPassword, 10);
    testUserId = uuidv4();

    await pool.query(
      `INSERT INTO users (id, name, email, "passwordHash", role)
       VALUES ($1, $2, $3, $4, $5)`,
      [testUserId, "State Machine Test User", testEmail, passwordHash, "admin"]
    );

    // Login to get JWT token
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testEmail, password: testPassword });

    expect(loginRes.status).toBe(200);
    authToken = loginRes.body.token;
  });

  afterAll(async () => {
    // Clean up: delete test tickets and the test user
    await pool.query('DELETE FROM tickets WHERE "createdBy" = $1', [testUserId]);
    await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
    await pool.end();
  });

  /**
   * Helper: creates a ticket and returns its ID.
   * Ticket starts with status "Open".
   */
  async function createTestTicket(): Promise<string> {
    const res = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: "Test ticket for state machine",
        description: "Integration test ticket",
        priority: "medium",
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("Open");
    return res.body.id;
  }

  /**
   * Helper: transitions a ticket to a target status.
   */
  async function transitionTicket(
    ticketId: string,
    targetStatus: string
  ): Promise<request.Response> {
    return request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ status: targetStatus });
  }

  // ─── Valid Transitions (expect HTTP 200) ────────────────────────────────

  describe("Valid transitions (HTTP 200)", () => {
    /**
     * Requirement 19.1: Open → In Progress returns HTTP 200
     */
    it("Open → In Progress returns 200", async () => {
      const ticketId = await createTestTicket();

      const res = await transitionTicket(ticketId, "In Progress");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("In Progress");
      expect(res.body.id).toBe(ticketId);
    });

    /**
     * Requirement 19.4: Open → Cancelled returns HTTP 200
     */
    it("Open → Cancelled returns 200", async () => {
      const ticketId = await createTestTicket();

      const res = await transitionTicket(ticketId, "Cancelled");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Cancelled");
      expect(res.body.id).toBe(ticketId);
    });

    /**
     * Requirement 19.2: In Progress → Resolved returns HTTP 200
     */
    it("In Progress → Resolved returns 200", async () => {
      const ticketId = await createTestTicket();

      // First transition to In Progress
      const step1 = await transitionTicket(ticketId, "In Progress");
      expect(step1.status).toBe(200);

      // Then transition to Resolved
      const res = await transitionTicket(ticketId, "Resolved");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Resolved");
      expect(res.body.id).toBe(ticketId);
    });

    /**
     * Requirement 19.5: In Progress → Cancelled returns HTTP 200
     */
    it("In Progress → Cancelled returns 200", async () => {
      const ticketId = await createTestTicket();

      // First transition to In Progress
      const step1 = await transitionTicket(ticketId, "In Progress");
      expect(step1.status).toBe(200);

      // Then transition to Cancelled
      const res = await transitionTicket(ticketId, "Cancelled");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Cancelled");
      expect(res.body.id).toBe(ticketId);
    });

    /**
     * Requirement 19.3: Resolved → Closed returns HTTP 200
     */
    it("Resolved → Closed returns 200", async () => {
      const ticketId = await createTestTicket();

      // Transition Open → In Progress → Resolved
      await transitionTicket(ticketId, "In Progress");
      await transitionTicket(ticketId, "Resolved");

      // Then transition to Closed
      const res = await transitionTicket(ticketId, "Closed");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("Closed");
      expect(res.body.id).toBe(ticketId);
    });
  });

  // ─── Invalid Transitions (expect HTTP 409) ─────────────────────────────

  describe("Invalid transitions (HTTP 409)", () => {
    /**
     * Requirement 19.6: Open → Resolved returns HTTP 409
     */
    it("Open → Resolved returns 409", async () => {
      const ticketId = await createTestTicket();

      const res = await transitionTicket(ticketId, "Resolved");

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });

    /**
     * Requirement 19.7: Open → Closed returns HTTP 409
     */
    it("Open → Closed returns 409", async () => {
      const ticketId = await createTestTicket();

      const res = await transitionTicket(ticketId, "Closed");

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });

    /**
     * Requirement 19.8: In Progress → Open returns HTTP 409
     */
    it("In Progress → Open returns 409", async () => {
      const ticketId = await createTestTicket();

      // Transition to In Progress first
      await transitionTicket(ticketId, "In Progress");

      // Try invalid transition back to Open
      const res = await transitionTicket(ticketId, "Open");

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });

    /**
     * Requirement 19.9: Closed → any returns HTTP 409
     * Tests Closed → Open, Closed → In Progress, Closed → Resolved, Closed → Cancelled
     */
    it("Closed → Open returns 409", async () => {
      const ticketId = await createTestTicket();

      // Transition Open → In Progress → Resolved → Closed
      await transitionTicket(ticketId, "In Progress");
      await transitionTicket(ticketId, "Resolved");
      await transitionTicket(ticketId, "Closed");

      const res = await transitionTicket(ticketId, "Open");
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });

    it("Closed → In Progress returns 409", async () => {
      const ticketId = await createTestTicket();

      await transitionTicket(ticketId, "In Progress");
      await transitionTicket(ticketId, "Resolved");
      await transitionTicket(ticketId, "Closed");

      const res = await transitionTicket(ticketId, "In Progress");
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });

    it("Closed → Resolved returns 409", async () => {
      const ticketId = await createTestTicket();

      await transitionTicket(ticketId, "In Progress");
      await transitionTicket(ticketId, "Resolved");
      await transitionTicket(ticketId, "Closed");

      const res = await transitionTicket(ticketId, "Resolved");
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });

    it("Closed → Cancelled returns 409", async () => {
      const ticketId = await createTestTicket();

      await transitionTicket(ticketId, "In Progress");
      await transitionTicket(ticketId, "Resolved");
      await transitionTicket(ticketId, "Closed");

      const res = await transitionTicket(ticketId, "Cancelled");
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });

    /**
     * Requirement 19.10: Cancelled → any returns HTTP 409
     * Tests Cancelled → Open, Cancelled → In Progress, Cancelled → Resolved, Cancelled → Closed
     */
    it("Cancelled → Open returns 409", async () => {
      const ticketId = await createTestTicket();

      // Transition to Cancelled
      await transitionTicket(ticketId, "Cancelled");

      const res = await transitionTicket(ticketId, "Open");
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });

    it("Cancelled → In Progress returns 409", async () => {
      const ticketId = await createTestTicket();

      await transitionTicket(ticketId, "Cancelled");

      const res = await transitionTicket(ticketId, "In Progress");
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });

    it("Cancelled → Resolved returns 409", async () => {
      const ticketId = await createTestTicket();

      await transitionTicket(ticketId, "Cancelled");

      const res = await transitionTicket(ticketId, "Resolved");
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });

    it("Cancelled → Closed returns 409", async () => {
      const ticketId = await createTestTicket();

      await transitionTicket(ticketId, "Cancelled");

      const res = await transitionTicket(ticketId, "Closed");
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });
  });
});
