import pool from "../utils/db";
import { TicketStatus, TicketPriority } from "../types";

/**
 * Database row shape for the tickets table.
 */
export interface TicketRow {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a new ticket.
 */
export interface CreateTicketInput {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  createdBy: string;
}

/**
 * Input for updating ticket fields (partial update).
 */
export interface UpdateTicketInput {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  assignedTo?: string | null;
}

/**
 * Filters for listing tickets.
 */
export interface FindAllFilters {
  search?: string;
  status?: TicketStatus;
}

/**
 * Create a new ticket in the database.
 * Returns the created ticket row.
 */
export async function create(input: CreateTicketInput): Promise<TicketRow> {
  const result = await pool.query<TicketRow>(
    `INSERT INTO tickets (id, title, description, priority, "createdBy")
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, description, priority, status, "assignedTo", "createdBy", "createdAt", "updatedAt"`,
    [input.id, input.title, input.description, input.priority, input.createdBy]
  );

  return result.rows[0];
}

/**
 * Find all tickets with optional search and status filters.
 * Search uses PostgreSQL ILIKE on title and description for case-insensitive matching.
 * Results are ordered by createdAt DESC.
 */
export async function findAll(filters: FindAllFilters = {}): Promise<TicketRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.search) {
    conditions.push(
      `(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
    );
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  if (filters.status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await pool.query<TicketRow>(
    `SELECT id, title, description, priority, status, "assignedTo", "createdBy", "createdAt", "updatedAt"
     FROM tickets
     ${whereClause}
     ORDER BY "createdAt" DESC`,
    params
  );

  return result.rows;
}

/**
 * Find a single ticket by its UUID.
 * Returns the ticket row or null if not found.
 */
export async function findById(id: string): Promise<TicketRow | null> {
  const result = await pool.query<TicketRow>(
    `SELECT id, title, description, priority, status, "assignedTo", "createdBy", "createdAt", "updatedAt"
     FROM tickets
     WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Update ticket fields (partial update).
 * Only updates the fields provided in the input.
 * Returns the updated ticket row or null if ticket not found.
 */
export async function update(id: string, input: UpdateTicketInput): Promise<TicketRow | null> {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    setClauses.push(`title = $${paramIndex}`);
    params.push(input.title);
    paramIndex++;
  }

  if (input.description !== undefined) {
    setClauses.push(`description = $${paramIndex}`);
    params.push(input.description);
    paramIndex++;
  }

  if (input.priority !== undefined) {
    setClauses.push(`priority = $${paramIndex}`);
    params.push(input.priority);
    paramIndex++;
  }

  if (input.assignedTo !== undefined) {
    setClauses.push(`"assignedTo" = $${paramIndex}`);
    params.push(input.assignedTo);
    paramIndex++;
  }

  if (setClauses.length === 0) {
    return findById(id);
  }

  // Always update the updatedAt timestamp
  setClauses.push(`"updatedAt" = NOW()`);

  params.push(id);

  const result = await pool.query<TicketRow>(
    `UPDATE tickets
     SET ${setClauses.join(", ")}
     WHERE id = $${paramIndex}
     RETURNING id, title, description, priority, status, "assignedTo", "createdBy", "createdAt", "updatedAt"`,
    params
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Update only the status of a ticket.
 * Returns the updated ticket row or null if ticket not found.
 */
export async function updateStatus(id: string, status: TicketStatus): Promise<TicketRow | null> {
  const result = await pool.query<TicketRow>(
    `UPDATE tickets
     SET status = $1, "updatedAt" = NOW()
     WHERE id = $2
     RETURNING id, title, description, priority, status, "assignedTo", "createdBy", "createdAt", "updatedAt"`,
    [status, id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}
