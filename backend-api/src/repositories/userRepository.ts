import pool from "../utils/db";
import { ConflictError, NotFoundError } from "../utils/errors";

/**
 * Database row shape for the users table (includes passwordHash).
 */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "agent" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Safe user row shape without passwordHash (used for API responses).
 */
export type SafeUserRow = Omit<UserRow, "passwordHash">;

/**
 * Input for creating a new user.
 */
export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role: "agent" | "admin";
}

/**
 * Input for updating an existing user. All fields optional.
 */
export interface UpdateUserInput {
  name?: string;
  email?: string;
  passwordHash?: string;
  role?: "agent" | "admin";
}

/**
 * Find a user by their email address using a parameterized query.
 * Returns the full user row (including passwordHash) or null if not found.
 * Note: This is used internally by the auth service for password verification.
 */
export async function findByEmail(email: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    'SELECT id, name, email, "passwordHash", role, "createdAt", "updatedAt" FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Find a user by email using case-insensitive comparison.
 * Returns the safe user row (without passwordHash) or null if not found.
 * Uses LOWER() for case-insensitive matching.
 */
export async function findByEmailCaseInsensitive(email: string): Promise<SafeUserRow | null> {
  const result = await pool.query<SafeUserRow>(
    'SELECT id, name, email, role, "createdAt", "updatedAt" FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Find a user by their ID using a parameterized query.
 * Returns the user row without passwordHash, or null if not found.
 */
export async function findById(id: string): Promise<SafeUserRow | null> {
  const result = await pool.query<SafeUserRow>(
    'SELECT id, name, email, role, "createdAt", "updatedAt" FROM users WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Retrieve all users ordered by createdAt descending.
 * Never includes passwordHash in results.
 */
export async function findAll(): Promise<SafeUserRow[]> {
  const result = await pool.query<SafeUserRow>(
    'SELECT id, name, email, role, "createdAt", "updatedAt" FROM users ORDER BY "createdAt" DESC'
  );

  return result.rows;
}

/**
 * Create a new user in the database.
 * Returns the created user without passwordHash.
 */
export async function create(input: CreateUserInput): Promise<SafeUserRow> {
  const { name, email, passwordHash, role } = input;

  const result = await pool.query<SafeUserRow>(
    `INSERT INTO users (name, email, "passwordHash", role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, "createdAt", "updatedAt"`,
    [name, email, passwordHash, role]
  );

  return result.rows[0];
}

/**
 * Update an existing user by ID.
 * Only updates the fields provided in the input.
 * Returns the updated user without passwordHash.
 * Throws NotFoundError if user does not exist.
 */
export async function update(id: string, input: UpdateUserInput): Promise<SafeUserRow> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }

  if (input.email !== undefined) {
    setClauses.push(`email = $${paramIndex++}`);
    values.push(input.email);
  }

  if (input.passwordHash !== undefined) {
    setClauses.push(`"passwordHash" = $${paramIndex++}`);
    values.push(input.passwordHash);
  }

  if (input.role !== undefined) {
    setClauses.push(`role = $${paramIndex++}`);
    values.push(input.role);
  }

  // Always update the updatedAt timestamp
  setClauses.push(`"updatedAt" = NOW()`);

  // Add the id as the last parameter
  values.push(id);

  const result = await pool.query<SafeUserRow>(
    `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${paramIndex}
     RETURNING id, name, email, role, "createdAt", "updatedAt"`,
    values
  );

  if (result.rows.length === 0) {
    throw new NotFoundError(`User with id ${id} not found.`);
  }

  return result.rows[0];
}

/**
 * Delete a user by ID.
 * Checks for existing references in tickets (createdBy, assignedTo) and comments (createdBy)
 * before allowing deletion. Throws ConflictError if references exist.
 * Throws NotFoundError if user does not exist.
 */
export async function deleteUser(id: string): Promise<void> {
  // First check if the user exists
  const userResult = await pool.query(
    "SELECT id FROM users WHERE id = $1",
    [id]
  );

  if (userResult.rows.length === 0) {
    throw new NotFoundError(`User with id ${id} not found.`);
  }

  // Check for ticket references (createdBy or assignedTo)
  const ticketRefs = await pool.query(
    'SELECT id FROM tickets WHERE "createdBy" = $1 OR "assignedTo" = $1 LIMIT 1',
    [id]
  );

  if (ticketRefs.rows.length > 0) {
    throw new ConflictError(
      "Cannot delete user. User is referenced by existing tickets."
    );
  }

  // Check for comment references (createdBy)
  const commentRefs = await pool.query(
    'SELECT id FROM comments WHERE "createdBy" = $1 LIMIT 1',
    [id]
  );

  if (commentRefs.rows.length > 0) {
    throw new ConflictError(
      "Cannot delete user. User is referenced by existing comments."
    );
  }

  // Safe to delete
  await pool.query("DELETE FROM users WHERE id = $1", [id]);
}
