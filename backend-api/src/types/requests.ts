/**
 * Request interfaces for the Support Ticket Management System API.
 * These define the expected shape of incoming request bodies.
 */

import type { TicketPriority, TicketStatus, UserRole } from "./index";

// --- Auth Requests ---

export interface LoginRequest {
  email: string;
  password: string;
}

// --- Ticket Requests ---

export interface CreateTicketRequest {
  title: string;        // max 200 chars
  description: string;  // max 5000 chars
  priority: TicketPriority;
}

export interface UpdateTicketRequest {
  title?: string;        // max 200 chars
  description?: string;  // max 5000 chars
  priority?: TicketPriority;
  assignedTo?: string | null; // User UUID or null to unassign
}

export interface TransitionStatusRequest {
  status: TicketStatus;
}

// --- Comment Requests ---

export interface CreateCommentRequest {
  message: string; // max 2000 chars
}

// --- User Requests ---

export interface CreateUserRequest {
  name: string;      // max 100 chars
  email: string;     // valid email format
  password: string;  // min 6 chars
  role: UserRole;
}

export interface UpdateUserRequest {
  name?: string;     // max 200 chars
  email?: string;    // valid email format
  role?: UserRole;
  password?: string; // min 6 chars, optional
}
