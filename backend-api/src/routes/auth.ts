import { Router, Request, Response } from "express";
import { login } from "../services/authService";
import { findById } from "../repositories/userRepository";
import { authMiddleware } from "../middleware/auth";
import { loginSchema } from "../validation/schemas";
import type { UserDTO } from "../types/index";

const router = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Authenticate user
 *     description: Authenticates a user with email and password. Returns a JWT token and user object on success.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful — returns JWT token and user object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Validation failed — missing or malformed email/password fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials — email or password is incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const { email, password } = parsed.data;

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
 * @openapi
 * /auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current user
 *     description: Returns the currently authenticated user's information (id, name, email, role). Requires a valid Bearer token.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current authenticated user object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserDTO'
 *       401:
 *         description: Missing, invalid, or expired Bearer token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
