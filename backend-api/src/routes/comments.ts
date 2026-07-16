import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { createComment } from "../services/commentService";
import type { CreateCommentRequest } from "../types/requests";

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
  const body = req.body as CreateCommentRequest;
  const createdBy = req.user!.sub;

  const comment = await createComment(ticketId, body.message, createdBy);
  res.status(201).json(comment);
});

export default router;
