import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { createComment } from "../services/commentService";
import { createCommentSchema } from "../validation/schemas";

const router = Router();

// Apply authMiddleware to all comment routes
router.use(authMiddleware);

/**
 * POST /api/tickets/:id/comments
 * Add a comment to a ticket.
 * Body: { message }
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
