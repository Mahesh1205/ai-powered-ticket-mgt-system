/**
 * Shared TypeScript interfaces and types for the Support Ticket Management System.
 * These DTOs define the shape of data returned by the API.
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
