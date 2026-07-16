import { v4 as uuidv4 } from "uuid";
import * as commentRepository from "../repositories/commentRepository";
import * as ticketRepository from "../repositories/ticketRepository";
import { ValidationError, NotFoundError } from "../utils/errors";
import type { CommentDTO } from "../types";

/**
 * Convert a database comment row to a CommentDTO.
 */
function toCommentDTO(row: commentRepository.CommentRow): CommentDTO {
  return {
    id: row.id,
    ticketId: row.ticketId,
    createdBy: row.createdBy,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Create a new comment on a ticket.
 * Validates:
 * - message is not empty or whitespace-only
 * - message does not exceed 2000 characters
 * - ticket exists
 *
 * Returns the created CommentDTO.
 * Throws ValidationError for invalid input.
 * Throws NotFoundError if ticket does not exist.
 */
export async function createComment(
  ticketId: string,
  message: string,
  createdBy: string
): Promise<CommentDTO> {
  // Validate message is present and not whitespace-only
  if (!message || message.trim() === "") {
    throw new ValidationError("Validation failed", {
      message: "Message is required and cannot be empty or whitespace-only",
    });
  }

  // Validate message length
  if (message.length > 2000) {
    throw new ValidationError("Validation failed", {
      message: "Message must not exceed 2000 characters",
    });
  }

  // Validate ticket exists
  const ticket = await ticketRepository.findById(ticketId);
  if (!ticket) {
    throw new NotFoundError("Ticket not found");
  }

  // Create the comment
  const id = uuidv4();
  const row = await commentRepository.create({
    id,
    ticketId,
    createdBy,
    message,
  });

  return toCommentDTO(row);
}

/**
 * Get all comments for a ticket, ordered by createdAt ascending.
 * Throws NotFoundError if ticket does not exist.
 */
export async function getCommentsByTicketId(ticketId: string): Promise<CommentDTO[]> {
  // Validate ticket exists
  const ticket = await ticketRepository.findById(ticketId);
  if (!ticket) {
    throw new NotFoundError("Ticket not found");
  }

  const rows = await commentRepository.findByTicketId(ticketId);
  return rows.map(toCommentDTO);
}
