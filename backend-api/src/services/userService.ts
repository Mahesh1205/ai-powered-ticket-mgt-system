import bcrypt from "bcryptjs";
import * as userRepository from "../repositories/userRepository";
import { ValidationError, ForbiddenError } from "../utils/errors";
import type { UserListDTO, UserRole } from "../types";
import type { CreateUserRequest, UpdateUserRequest } from "../types/requests";

const VALID_ROLES: UserRole[] = ["admin", "agent"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Convert a safe user row from the repository to a UserListDTO.
 */
function toUserListDTO(row: userRepository.SafeUserRow): UserListDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

/**
 * List all users.
 * Returns users ordered by createdAt descending (handled by repository).
 */
export async function listUsers(): Promise<UserListDTO[]> {
  const rows = await userRepository.findAll();
  return rows.map(toUserListDTO);
}

/**
 * Create a new user.
 * Validates: name required (max 100), email format, password min 6, role in enum.
 * Checks for duplicate email (case-insensitive).
 * Hashes password with bcrypt cost factor 10.
 */
export async function createUser(data: CreateUserRequest): Promise<UserListDTO> {
  const errors: Record<string, string> = {};

  // Validate name
  if (!data.name || data.name.trim() === "") {
    errors.name = "Name is required";
  } else if (data.name.length > 100) {
    errors.name = "Name must not exceed 100 characters";
  }

  // Validate email
  if (!data.email || data.email.trim() === "") {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.email = "Invalid email format";
  }

  // Validate password
  if (!data.password || data.password === "") {
    errors.password = "Password is required";
  } else if (data.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  // Validate role
  if (!data.role || data.role.trim() === "") {
    errors.role = "Role is required";
  } else if (!VALID_ROLES.includes(data.role as UserRole)) {
    errors.role = "Role must be one of: admin, agent";
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError("Validation failed", errors);
  }

  // Check for duplicate email (case-insensitive)
  const existingUser = await userRepository.findByEmailCaseInsensitive(data.email);
  if (existingUser) {
    throw new ValidationError("Validation failed", {
      email: "A user with this email already exists",
    });
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);

  // Create the user
  const row = await userRepository.create({
    name: data.name,
    email: data.email,
    passwordHash,
    role: data.role,
  });

  return toUserListDTO(row);
}

/**
 * Update an existing user.
 * Validates provided fields: name max 200, email format, password min 6, role in enum.
 * If email is changed, checks for duplicate (case-insensitive, excluding current user).
 * Hashes password if provided.
 * Throws NotFoundError (from repository) if user does not exist.
 */
export async function updateUser(id: string, data: UpdateUserRequest): Promise<UserListDTO> {
  const errors: Record<string, string> = {};

  // Validate name if provided
  if (data.name !== undefined) {
    if (data.name.trim() === "") {
      errors.name = "Name cannot be empty";
    } else if (data.name.length > 200) {
      errors.name = "Name must not exceed 200 characters";
    }
  }

  // Validate email if provided
  if (data.email !== undefined) {
    if (data.email.trim() === "") {
      errors.email = "Email cannot be empty";
    } else if (!EMAIL_REGEX.test(data.email)) {
      errors.email = "Invalid email format";
    }
  }

  // Validate password if provided
  if (data.password !== undefined) {
    if (data.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
  }

  // Validate role if provided
  if (data.role !== undefined) {
    if (!VALID_ROLES.includes(data.role as UserRole)) {
      errors.role = "Role must be one of: admin, agent";
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError("Validation failed", errors);
  }

  // If email is being changed, check for duplicate (case-insensitive, excluding current user)
  if (data.email !== undefined) {
    const existingUser = await userRepository.findByEmailCaseInsensitive(data.email);
    if (existingUser && existingUser.id !== id) {
      throw new ValidationError("Validation failed", {
        email: "A user with this email already exists",
      });
    }
  }

  // Build the update input
  const updateInput: userRepository.UpdateUserInput = {};
  if (data.name !== undefined) updateInput.name = data.name;
  if (data.email !== undefined) updateInput.email = data.email;
  if (data.role !== undefined) updateInput.role = data.role;

  // Hash password if provided
  if (data.password !== undefined) {
    updateInput.passwordHash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);
  }

  // Repository throws NotFoundError if user does not exist
  const row = await userRepository.update(id, updateInput);

  return toUserListDTO(row);
}

/**
 * Delete a user by ID.
 * Blocks self-deletion (requestingUserId === id).
 * Repository handles NotFoundError and ConflictError (reference checks).
 */
export async function deleteUser(id: string, requestingUserId: string): Promise<void> {
  // Block self-deletion
  if (id === requestingUserId) {
    throw new ForbiddenError("Cannot delete your own account.");
  }

  // Repository handles: NotFoundError if user doesn't exist, ConflictError if references exist
  await userRepository.deleteUser(id);
}
