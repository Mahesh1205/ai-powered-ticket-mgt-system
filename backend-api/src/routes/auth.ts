import { Router, Request, Response } from "express";
import { login } from "../services/authService";
import { findById } from "../repositories/userRepository";
import { authMiddleware } from "../middleware/auth";
import type { LoginRequest } from "../types/requests";
import type { UserDTO } from "../types/index";

const router = Router();

/**
 * POST /api/auth/login
 * Authenticates a user with email and password.
 * Returns a JWT token and user object on success.
 */
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as Partial<LoginRequest>;

  // Validate request body: return 400 if email or password missing
  if (!email || !password) {
    const details: Record<string, string> = {};
    if (!email) details.email = "Email is required";
    if (!password) details.password = "Password is required";

    res.status(400).json({
      error: "Validation failed. Email and password are required.",
      code: "VALIDATION_ERROR",
      details,
    });
    return;
  }

  const result = await login(email, password);

  if (!result) {
    // Generic message for both wrong email and wrong password (no user enumeration)
    res.status(401).json({
      error: "Invalid credentials",
      code: "UNAUTHORIZED",
    });
    return;
  }

  res.status(200).json(result);
});

/**
 * GET /api/auth/me
 * Returns the current authenticated user's info (without passwordHash).
 * Requires a valid Bearer token.
 */
router.get("/me", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  const user = await findById(userId);

  if (!user) {
    res.status(404).json({
      error: "User not found",
      code: "NOT_FOUND",
    });
    return;
  }

  const userDTO: UserDTO = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  res.status(200).json(userDTO);
});

export default router;
