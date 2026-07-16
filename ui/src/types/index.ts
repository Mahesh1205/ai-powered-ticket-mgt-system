/**
 * Shared TypeScript interfaces and types for the Support Ticket Management System frontend.
 * These mirror the backend DTOs for type-safe API consumption.
 */

// --- Enums and Union Types ---

export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed" | "Cancelled";

export type TicketPriority = "low" | "medium" | "high";

export type UserRole = "agent" | "admin";

// --- DTOs (Data Transfer Objects) ---

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface UserListDTO extends UserDTO {
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface TicketDTO {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo: string | null;
  createdBy: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface CommentDTO {
  id: string;
  ticketId: string;
  createdBy: string;
  message: string;
  createdAt: string; // ISO 8601
}

export interface TicketDetailDTO extends TicketDTO {
  comments: CommentDTO[];
}

// --- Error Response ---

export interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, string>;
}

// --- Auth Response ---

export interface LoginResponse {
  token: string;
  user: UserDTO;
}

// --- Request Types (for frontend form handling) ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  priority: TicketPriority;
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  assignedTo?: string | null;
}

export interface TransitionStatusRequest {
  status: TicketStatus;
}

export interface CreateCommentRequest {
  message: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  password?: string;
}
