import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "../types/index";

/**
 * Decoded JWT payload attached to req.user after successful authentication.
 */
export interface AuthUser {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Extend Express Request to include the authenticated user.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Auth middleware that extracts a Bearer token from the Authorization header,
 * verifies the JWT signature and expiry, and attaches the decoded user to req.user.
 *
 * Returns 401 for missing, malformed, invalid-signature, or expired tokens.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Authentication required. Please provide a valid Bearer token.",
      code: "UNAUTHORIZED",
    });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  if (!token) {
    res.status(401).json({
      error: "Authentication required. Please provide a valid Bearer token.",
      code: "UNAUTHORIZED",
    });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: "Token has expired. Please log in again.",
        code: "UNAUTHORIZED",
      });
      return;
    }

    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: "Invalid token. Please provide a valid Bearer token.",
        code: "UNAUTHORIZED",
      });
      return;
    }

    res.status(401).json({
      error: "Authentication failed.",
      code: "UNAUTHORIZED",
    });
  }
}

/**
 * Role enforcement middleware that checks if the authenticated user has the "admin" role.
 * Must be used after authMiddleware in the middleware chain.
 *
 * Returns 403 if the user does not have admin privileges.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: "Authentication required.",
      code: "UNAUTHORIZED",
    });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({
      error: "Access denied. Admin privileges required.",
      code: "FORBIDDEN",
    });
    return;
  }

  next();
}
