import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  transitionStatus,
} from "../services/ticketService";
import type {
  CreateTicketRequest,
  UpdateTicketRequest,
  TransitionStatusRequest,
} from "../types/requests";

const router = Router();

// Apply authMiddleware to all ticket routes
router.use(authMiddleware);

/**
 * POST /api/tickets
 * Create a new support ticket.
 * Body: { title, description, priority }
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const body = req.body as CreateTicketRequest;
  const createdBy = req.user!.sub;

  const ticket = await createTicket(body, createdBy);
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
  const body = req.body as UpdateTicketRequest;

  const ticket = await updateTicket(id, body);
  res.status(200).json(ticket);
});

/**
 * PATCH /api/tickets/:id/status
 * Transition ticket status using the state machine.
 * Body: { status }
 */
router.patch("/:id/status", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const body = req.body as TransitionStatusRequest;

  const ticket = await transitionStatus(id, body);
  res.status(200).json(ticket);
});

export default router;
