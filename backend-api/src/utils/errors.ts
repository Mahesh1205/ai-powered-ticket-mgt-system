/**
 * Custom error classes for the Support Ticket Management System.
 * These extend the native Error class and carry metadata used by
 * the global error handler to produce consistent API responses.
 */

/**
 * Base class for application errors that map to specific HTTP status codes.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, string>;

  constructor(message: string, statusCode: number, code: string, details?: Record<string, string>) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    // Maintain proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 — Validation failure.
 * Used when request input fails validation rules (missing fields, invalid values, length constraints).
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string>) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

/**
 * 404 — Resource not found.
 * Used when a requested entity does not exist.
 */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, "NOT_FOUND");
  }
}

/**
 * 409 — Conflict.
 * Used for invalid state transitions, duplicate entries, or referential integrity violations.
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

/**
 * 401 — Unauthorized.
 * Used when authentication is missing or invalid.
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

/**
 * 403 — Forbidden.
 * Used when an authenticated user lacks the required permissions.
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied. Insufficient permissions.") {
    super(message, 403, "FORBIDDEN");
  }
}
