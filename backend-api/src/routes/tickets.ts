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
 * @openapi
 * /tickets:
 *   post:
 *     summary: Create a new support ticket
 *     description: Creates a new support ticket with the authenticated user as the creator. The ticket is initialized with status "Open".
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTicketRequest'
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TicketDTO'
 *       400:
 *         description: Validation failed — missing or invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized — missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @openapi
 * /tickets:
 *   get:
 *     summary: List tickets with optional filters
 *     description: Returns a list of all tickets ordered by createdAt descending. Supports optional search and status query parameters for filtering.
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         required: false
 *         description: Case-insensitive keyword search across ticket title and description
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Open, In Progress, Resolved, Closed, Cancelled]
 *         required: false
 *         description: Filter tickets by status
 *     responses:
 *       200:
 *         description: List of tickets matching the filters
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TicketDTO'
 *       401:
 *         description: Unauthorized — missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const { search, status } = req.query as { search?: string; status?: string };

  const tickets = await getTickets({ search, status });
  res.status(200).json(tickets);
});

/**
 * @openapi
 * /tickets/{id}:
 *   get:
 *     summary: Get ticket details
 *     description: Returns a single ticket with its full details including associated comments ordered by createdAt ascending.
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Ticket UUID
 *     responses:
 *       200:
 *         description: Ticket details with comments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TicketDetailDTO'
 *       404:
 *         description: Ticket not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized — missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const ticket = await getTicketById(id);
  res.status(200).json(ticket);
});

/**
 * @openapi
 * /tickets/{id}:
 *   patch:
 *     summary: Update ticket fields
 *     description: Updates one or more editable ticket fields (title, description, priority, assignedTo). Status changes are not allowed via this endpoint.
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Ticket UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTicketRequest'
 *     responses:
 *       200:
 *         description: Ticket updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TicketDTO'
 *       400:
 *         description: Validation failed or status field included
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Ticket not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized — missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @openapi
 * /tickets/{id}/status:
 *   patch:
 *     summary: Transition ticket status
 *     description: Transitions a ticket's status using the state machine. Only valid transitions are permitted (e.g., Open → In Progress, In Progress → Resolved).
 *     tags:
 *       - Tickets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Ticket UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransitionStatusRequest'
 *     responses:
 *       200:
 *         description: Status transitioned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TicketDTO'
 *       400:
 *         description: Validation failed — invalid status value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Invalid transition — state machine violation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Ticket not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized — missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
