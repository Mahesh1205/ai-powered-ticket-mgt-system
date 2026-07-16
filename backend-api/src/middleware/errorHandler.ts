import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import type { ErrorResponse } from "../types/index";

/**
 * Global error handling middleware for the Express application.
 *
 * Catches all unhandled errors in the Express pipeline and returns
 * consistent JSON error responses in the format:
 *   { error: string, code: string, details?: Record<string, string> }
 *
 * Security: 500 responses never expose stack traces, file paths, SQL, or env vars.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle known application errors
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      error: err.message,
      code: err.code,
    };

    if (err.details && Object.keys(err.details).length > 0) {
      response.details = err.details;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle JSON parse errors from Express body parser
  if ((err as any).type === "entity.parse.failed" || (err as any).status === 400) {
    const response: ErrorResponse = {
      error: "Invalid request body.",
      code: "VALIDATION_ERROR",
    };
    res.status(400).json(response);
    return;
  }

  // Log the full error internally for debugging (never sent to client)
  console.error("[Unhandled Error]", err);

  // Return a sanitized 500 response — no stack traces, file paths, SQL, or env vars
  const response: ErrorResponse = {
    error: "Internal server error",
    code: "INTERNAL_ERROR",
  };
  res.status(500).json(response);
}
