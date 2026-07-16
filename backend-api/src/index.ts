import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

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

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
