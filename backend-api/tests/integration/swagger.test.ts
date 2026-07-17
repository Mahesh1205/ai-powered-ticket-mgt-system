import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import fc from "fast-check";
import app from "../../src/index";
import pool from "../../src/utils/db";

/**
 * Integration / Property tests for Swagger API Documentation endpoint.
 *
 * Feature: support-ticket-management
 * **Property 25: OpenAPI documentation is accessible without authentication**
 * **Validates: Requirements 23.2, 23.3**
 */

afterAll(async () => {
  await pool.end();
});

describe("Swagger API Documentation - Integration Tests", () => {
  describe("Requirement 23.2: Swagger UI served at GET /api-docs", () => {
    it("should return HTTP 200 without any Authorization header", async () => {
      const res = await request(app).get("/api-docs/").redirects(5);

      expect(res.status).toBe(200);
    });

    it("should return content-type including text/html", async () => {
      const res = await request(app).get("/api-docs/").redirects(5);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/text\/html/);
    });
  });

  describe("Requirement 23.3: /api-docs accessible without authentication", () => {
    it("Property 25: OpenAPI documentation is accessible without authentication", async () => {
      /**
       * **Validates: Requirements 23.2, 23.3**
       *
       * For any HTTP GET request to /api-docs (with or without a Bearer token),
       * the API SHALL return a successful HTTP response (2xx) rendering the Swagger UI page.
       */
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // No token at all
            fc.constant(undefined),
            // Random string as token
            fc.string({ minLength: 1, maxLength: 200 }),
            // Bearer prefix with random value
            fc.string({ minLength: 1, maxLength: 100 }).map(
              (s) => `Bearer ${s}`
            ),
            // Empty string
            fc.constant("")
          ),
          async (authHeader) => {
            const req = request(app).get("/api-docs/").redirects(5);

            if (authHeader !== undefined && authHeader !== "") {
              req.set("Authorization", authHeader);
            }

            const res = await req;

            // Should always return 2xx regardless of auth header
            expect(res.status).toBeGreaterThanOrEqual(200);
            expect(res.status).toBeLessThan(300);

            // Should serve HTML (Swagger UI page)
            expect(res.headers["content-type"]).toMatch(/text\/html/);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
