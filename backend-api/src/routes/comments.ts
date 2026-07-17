import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { createComment } from "../services/commentService";
import { createCommentSchema } from "../validation/schemas";

const router = Router();

// Apply authMiddleware to all comment routes
router.use(authMiddleware);

/**
 * @openapi
 * /tickets/{id}/comments:
 *   post:
 *     summary: Add a comment to a ticket
 *     description: Creates a new comment on the specified ticket. The comment is linked to the authenticated user.
 *     tags:
 *       - Comments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The UUID of the ticket to comment on
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCommentRequest'
 *     responses:
 *       '201':
 *         description: Comment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentDTO'
 *       '400':
 *         description: Validation failed — message is missing, whitespace-only, or exceeds 2000 characters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '401':
 *         description: Unauthorized — missing or invalid Bearer token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '404':
 *         description: Ticket not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/:id/comments", async (req: Request, res: Response): Promise<void> => {
  const ticketId = req.params.id as string;

  const parsed = createCommentSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const createdBy = req.user!.sub;
  const comment = await createComment(ticketId, parsed.data.message, createdBy);
  res.status(201).json(comment);
});

export default router;
