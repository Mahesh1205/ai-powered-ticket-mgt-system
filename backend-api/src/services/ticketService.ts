import { v4 as uuidv4 } from "uuid";
import * as ticketRepository from "../repositories/ticketRepository";
import * as userRepository from "../repositories/userRepository";
import { isValidTransition } from "./ticketStateMachine";
import { ValidationError, NotFoundError, ConflictError } from "../utils/errors";
import pool from "../utils/db";
import type { TicketDTO, TicketDetailDTO, TicketStatus, TicketPriority, CommentDTO } from "../types";
import type { CreateTicketRequest, UpdateTicketRequest, TransitionStatusRequest } from "../types/requests";

const VALID_PRIORITIES: TicketPriority[] = ["low", "medium", "high"];
const VALID_STATUSES: TicketStatus[] = ["Open", "In Progress", "Resolved", "Closed", "Cancelled"];

/**
 * Convert a database ticket row to a TicketDTO.
 */
function toTicketDTO(row: ticketRepository.TicketRow): TicketDTO {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    assignedTo: row.assignedTo,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Create a new ticket.
 * Validates input: title required (max 200), description required (max 5000), priority in enum.
 * Sets status to "Open", generates UUID, assigns createdBy from authenticated user.
 */
export async function createTicket(data: CreateTicketRequest, createdBy: string): Promise<TicketDTO> {
  const errors: Record<string, string> = {};

  // Validate title
  if (!data.title || data.title.trim() === "") {
    errors.title = "Title is required";
  } else if (data.title.length > 200) {
    errors.title = "Title must not exceed 200 characters";
  }

  // Validate description
  if (!data.description || data.description.trim() === "") {
    errors.description = "Description is required";
  } else if (data.description.length > 5000) {
    errors.description = "Description must not exceed 5000 characters";
  }

  // Validate priority
  if (!data.priority || data.priority.trim() === "") {
    errors.priority = "Priority is required";
  } else if (!VALID_PRIORITIES.includes(data.priority as TicketPriority)) {
    errors.priority = "Priority must be one of: low, medium, high";
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError("Validation failed", errors);
  }

  const id = uuidv4();
  const row = await ticketRepository.create({
    id,
    title: data.title,
    description: data.description,
    priority: data.priority,
    createdBy,
  });

  return toTicketDTO(row);
}

/**
 * Get all tickets with optional search and status filters.
 * Returns tickets ordered by createdAt descending.
 */
export async function getTickets(filters?: { search?: string; status?: string }): Promise<TicketDTO[]> {
  const repoFilters: ticketRepository.FindAllFilters = {};

  if (filters?.search) {
    repoFilters.search = filters.search;
  }

  if (filters?.status) {
    // Validate status filter value
    if (!VALID_STATUSES.includes(filters.status as TicketStatus)) {
      throw new ValidationError("Invalid status filter value", {
        status: `Status must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }
    repoFilters.status = filters.status as TicketStatus;
  }

  const rows = await ticketRepository.findAll(repoFilters);
  return rows.map(toTicketDTO);
}

/**
 * Get a single ticket by ID, including its comments.
 * Returns a TicketDetailDTO with comments ordered by createdAt ascending.
 * Throws NotFoundError if ticket does not exist.
 */
export async function getTicketById(id: string): Promise<TicketDetailDTO> {
  const row = await ticketRepository.findById(id);

  if (!row) {
    throw new NotFoundError("Ticket not found");
  }

  // Fetch comments for this ticket ordered by createdAt ascending
  const commentsResult = await pool.query(
    `SELECT id, "ticketId", "createdBy", message, "createdAt"
     FROM comments
     WHERE "ticketId" = $1
     ORDER BY "createdAt" ASC`,
    [id]
  );

  const comments: CommentDTO[] = commentsResult.rows.map((row: { id: string; ticketId: string; createdBy: string; message: string; createdAt: Date }) => ({
    id: row.id,
    ticketId: row.ticketId,
    createdBy: row.createdBy,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  }));

  return {
    ...toTicketDTO(row),
    comments,
  };
}

/**
 * Update ticket fields (partial update).
 * Rejects if the request body includes a "status" field (return 400).
 * Validates: title max 200, description max 5000, priority in enum, assignedTo references existing user.
 * Throws NotFoundError if ticket does not exist.
 */
export async function updateTicket(
  id: string,
  data: UpdateTicketRequest & { status?: unknown }
): Promise<TicketDTO> {
  // Reject status field in update request
  if ("status" in data && data.status !== undefined) {
    throw new ValidationError(
      "Status cannot be modified via this endpoint. Use the status transition endpoint.",
      { status: "Status changes must use PATCH /api/tickets/:id/status" }
    );
  }

  const errors: Record<string, string> = {};

  // Validate title if provided
  if (data.title !== undefined) {
    if (data.title.trim() === "") {
      errors.title = "Title cannot be empty";
    } else if (data.title.length > 200) {
      errors.title = "Title must not exceed 200 characters";
    }
  }

  // Validate description if provided
  if (data.description !== undefined) {
    if (data.description.trim() === "") {
      errors.description = "Description cannot be empty";
    } else if (data.description.length > 5000) {
      errors.description = "Description must not exceed 5000 characters";
    }
  }

  // Validate priority if provided
  if (data.priority !== undefined) {
    if (!VALID_PRIORITIES.includes(data.priority as TicketPriority)) {
      errors.priority = "Priority must be one of: low, medium, high";
    }
  }

  // Validate assignedTo references an existing user
  if (data.assignedTo !== undefined && data.assignedTo !== null) {
    const user = await userRepository.findById(data.assignedTo);
    if (!user) {
      errors.assignedTo = "Assigned user does not exist";
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError("Validation failed", errors);
  }

  const updateInput: ticketRepository.UpdateTicketInput = {};
  if (data.title !== undefined) updateInput.title = data.title;
  if (data.description !== undefined) updateInput.description = data.description;
  if (data.priority !== undefined) updateInput.priority = data.priority;
  if (data.assignedTo !== undefined) updateInput.assignedTo = data.assignedTo;

  const row = await ticketRepository.update(id, updateInput);

  if (!row) {
    throw new NotFoundError("Ticket not found");
  }

  return toTicketDTO(row);
}

/**
 * Transition a ticket's status using the state machine.
 * Validates the target status value and checks the transition is valid.
 * Returns 409 ConflictError on invalid transitions.
 * Returns 404 NotFoundError if ticket does not exist.
 * Returns 400 ValidationError if target status is not a valid status value.
 */
export async function transitionStatus(
  id: string,
  data: TransitionStatusRequest
): Promise<TicketDTO> {
  // Validate that the target status is a recognized status value
  if (!data.status || !VALID_STATUSES.includes(data.status as TicketStatus)) {
    throw new ValidationError("Invalid status value", {
      status: `Status must be one of: ${VALID_STATUSES.join(", ")}`,
    });
  }

  // Find the ticket first to get current status
  const ticket = await ticketRepository.findById(id);

  if (!ticket) {
    throw new NotFoundError("Ticket not found");
  }

  // Validate the transition using the state machine
  if (!isValidTransition(ticket.status, data.status)) {
    throw new ConflictError(
      `Invalid status transition from "${ticket.status}" to "${data.status}". ` +
      `Transition is not permitted.`
    );
  }

  // Perform the status update
  const updatedRow = await ticketRepository.updateStatus(id, data.status);

  if (!updatedRow) {
    throw new NotFoundError("Ticket not found");
  }

  return toTicketDTO(updatedRow);
}
