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
 * @openapi
 * /users:
 *   get:
 *     summary: List all users
 *     description: Returns a list of all users. Accessible to any authenticated user (admin or agent).
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserDTO'
 *       '401':
 *         description: Unauthorized — missing or invalid Bearer token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const users = await listUsers();
  res.status(200).json(users);
});

/**
 * @openapi
 * /users:
 *   post:
 *     summary: Create a new user
 *     description: Creates a new user account. Admin only.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       '201':
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserDTO'
 *       '400':
 *         description: Validation failed — missing or invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Forbidden — only admins can create users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '409':
 *         description: Conflict — a user with this email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @openapi
 * /users/{id}:
 *   patch:
 *     summary: Update an existing user
 *     description: Updates user fields (name, email, password, role). Admin only.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the user to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       '200':
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserDTO'
 *       '400':
 *         description: Validation failed — invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '403':
 *         description: Forbidden — only admins can update users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '409':
 *         description: Conflict — email already in use by another user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     description: Deletes a user account. Admin only. Blocks self-deletion and deletion of users with ticket/comment references.
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the user to delete
 *     responses:
 *       '204':
 *         description: User deleted successfully (no content)
 *       '403':
 *         description: Forbidden — only admins can delete users, or attempted self-deletion
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '409':
 *         description: Conflict — user has associated tickets or comments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const requestingUserId = req.user!.sub;
  await deleteUser(id, requestingUserId);
  res.status(204).send();
});

export default router;
