import pool from "../utils/db";

/**
 * Database row shape for the comments table.
 */
export interface CommentRow {
  id: string;
  ticketId: string;
  createdBy: string;
  message: string;
  createdAt: Date;
}

/**
 * Input for creating a new comment.
 */
export interface CreateCommentInput {
  id: string;
  ticketId: string;
  createdBy: string;
  message: string;
}

/**
 * Create a new comment in the database.
 * Returns the created comment row.
 */
export async function create(input: CreateCommentInput): Promise<CommentRow> {
  const result = await pool.query<CommentRow>(
    `INSERT INTO comments (id, "ticketId", "createdBy", message)
     VALUES ($1, $2, $3, $4)
     RETURNING id, "ticketId", "createdBy", message, "createdAt"`,
    [input.id, input.ticketId, input.createdBy, input.message]
  );

  return result.rows[0];
}

/**
 * Find all comments for a given ticket, ordered by createdAt ascending.
 * Returns an array of comment rows (empty array if none exist).
 */
export async function findByTicketId(ticketId: string): Promise<CommentRow[]> {
  const result = await pool.query<CommentRow>(
    `SELECT id, "ticketId", "createdBy", message, "createdAt"
     FROM comments
     WHERE "ticketId" = $1
     ORDER BY "createdAt" ASC`,
    [ticketId]
  );

  return result.rows;
}
