import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createTicketSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().min(1, "Description is required").max(5000, "Description must be 5000 characters or less"),
  priority: z.enum(["low", "medium", "high"], { message: "Priority must be low, medium, or high" }),
  assignedTo: z.string().uuid("assignedTo must be a valid UUID").optional(),
});

export const updateTicketSchema = z.object({
  title: z.string().max(200, "Title must be 200 characters or less").optional(),
  description: z.string().max(5000, "Description must be 5000 characters or less").optional(),
  priority: z.enum(["low", "medium", "high"], { message: "Priority must be low, medium, or high" }).optional(),
  assignedTo: z.string().uuid("assignedTo must be a valid UUID").nullable().optional(),
}).strict();

export const transitionStatusSchema = z.object({
  status: z.enum(["Open", "In Progress", "Resolved", "Closed", "Cancelled"], {
    message: "Status must be one of: Open, In Progress, Resolved, Closed, Cancelled",
  }),
});

export const createCommentSchema = z.object({
  message: z
    .string()
    .max(2000, "Message must be 2000 characters or less")
    .refine((val) => val.trim().length > 0, { message: "Message cannot be empty" }),
});

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  email: z.string().email("Must be a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "agent"], { message: "Role must be admin or agent" }),
});

export const updateUserSchema = z.object({
  name: z.string().max(200, "Name must be 200 characters or less").optional(),
  email: z.string().email("Must be a valid email address").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["admin", "agent"], { message: "Role must be admin or agent" }).optional(),
});
