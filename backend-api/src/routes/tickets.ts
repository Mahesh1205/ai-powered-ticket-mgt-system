import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  transitionStatus,
} from "../services/ticketService";
import {
  createTicketSchema,
  updateTicketSchema,
  transitionStatusSchema,
} from "../validation/schemas";

const router = Router();

// Apply authMiddleware to all ticket routes
router.use(authMiddleware);

/**
 * POST /api/tickets
 * Create a new support ticket.
 * Body: { title, description, priority }
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const parsed = createTicketSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const createdBy = req.user!.sub;
  const ticket = await createTicket(parsed.data, createdBy);
  res.status(201).json(ticket);
});

/**
 * GET /api/tickets
 * List tickets with optional search and status filters.
 * Query params: search (string), status (string)
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const { search, status } = req.query as { search?: string; status?: string };

  const tickets = await getTickets({ search, status });
  res.status(200).json(tickets);
});

/**
 * GET /api/tickets/:id
 * Get a single ticket with its comments.
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const ticket = await getTicketById(id);
  res.status(200).json(ticket);
});

/**
 * PATCH /api/tickets/:id
 * Update ticket fields (title, description, priority, assignedTo).
 * Status changes are not allowed via this endpoint.
 */
router.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  // Explicitly reject status field in update payload
  if ("status" in req.body) {
    res.status(400).json({
      error: "Status cannot be changed via this endpoint. Use PATCH /api/tickets/:id/status instead.",
      code: "VALIDATION_ERROR",
    });
    return;
  }

  const parsed = updateTicketSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const ticket = await updateTicket(id, parsed.data);
  res.status(200).json(ticket);
});

/**
 * PATCH /api/tickets/:id/status
 * Transition ticket status using the state machine.
 * Body: { status }
 */
router.patch("/:id/status", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const parsed = transitionStatusSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const ticket = await transitionStatus(id, parsed.data);
  res.status(200).json(ticket);
});

export default router;
