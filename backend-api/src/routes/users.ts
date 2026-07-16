import { Router, Request, Response } from "express";
import { authMiddleware, requireAdmin } from "../middleware/auth";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../services/userService";
import { createUserSchema, updateUserSchema } from "../validation/schemas";

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

/**
 * GET /api/users
 * List all users. Accessible to any authenticated user (admin or agent).
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const users = await listUsers();
  res.status(200).json(users);
});

/**
 * POST /api/users
 * Create a new user. Admin only.
 * Body: { name, email, password, role }
 */
router.post("/", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const parsed = createUserSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const user = await createUser(parsed.data);
  res.status(201).json(user);
});

/**
 * PATCH /api/users/:id
 * Update an existing user. Admin only.
 * Body: { name?, email?, password?, role? }
 */
router.patch("/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const parsed = updateUserSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const user = await updateUser(id, parsed.data);
  res.status(200).json(user);
});

/**
 * DELETE /api/users/:id
 * Delete a user. Admin only.
 * Blocks self-deletion and deletion of users with ticket/comment references.
 */
router.delete("/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const requestingUserId = req.user!.sub;
  await deleteUser(id, requestingUserId);
  res.status(204).send();
});

export default router;
