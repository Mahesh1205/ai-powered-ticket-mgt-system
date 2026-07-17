import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth";
import ticketRoutes from "./routes/tickets";
import commentRoutes from "./routes/comments";
import userRoutes from "./routes/users";
import { authMiddleware } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";
import { swaggerSpec, swaggerUi } from "./config/swagger";

// Startup guard: JWT_SECRET must be at least 32 characters
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  console.error(
    "FATAL: JWT_SECRET environment variable must be at least 32 characters long."
  );
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet());

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" },
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint (public)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Swagger API docs (public, no auth required)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Auth routes (login is public, /me is protected internally)
app.use("/api/auth", authLimiter, authRoutes);

// Global auth middleware — applies to all routes below this point
// POST /api/auth/login and /api/health are already mounted above, so they are excluded
app.use(authMiddleware);

// Protected routes
app.use("/api/tickets", ticketRoutes);
app.use("/api/tickets", commentRoutes);
app.use("/api/users", userRoutes);

// Global error handler (must be last middleware)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
