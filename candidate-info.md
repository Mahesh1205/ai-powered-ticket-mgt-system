# Candidate Information

**Name:** Mahesh Kafaltiya
**Role:** Tech Lead
**Primary Technology Stack:** Node.js 22 + Express 5 + TypeScript (Backend), React 19 + Vite 6 + Zustand 5 + Tailwind CSS 4 (Frontend), PostgreSQL (Database)

**Primary AI Tool Used:** Kiro (AI-powered development environment with spec-driven workflow)
**Project Option Selected:** AI-Powered Internal Support Ticket Management System

**Assessment Start Date:** July 2025
**Submission Date:** July 2025

## Project Summary

An internal support ticket management system that enables authenticated users to create, progress, and manage support tickets through a defined lifecycle. The system provides role-based access control (agent and admin roles), a strict state-machine-enforced ticket workflow, commenting capabilities, and full user management for administrators.

Key capabilities:
- JWT-based stateless authentication with 24h token expiry
- Deterministic ticket state machine (Open → In Progress → Resolved → Closed, with Cancelled as alternate terminal state)
- Full CRUD for tickets with search and status filtering
- Comment system for ticket collaboration
- Admin-only user management with deletion guards
- Property-based testing (fast-check) validating 25 correctness properties
- Integration tests covering state machine transitions and auth flows
- OpenAPI/Swagger documentation served at /api-docs
- Docker Compose setup for containerized deployment
- GitHub Actions CI pipeline

## Tools Used

| Tool | Purpose |
|------|---------|
| Kiro | Primary AI assistant — spec-driven development, code generation, testing, debugging |
| Node.js 22 | Backend runtime |
| Express 5 | HTTP framework |
| TypeScript 5.x | Type safety across frontend and backend |
| React 19 | Frontend UI framework |
| Vite 6 | Frontend build tool and dev server |
| Zustand 5 | Frontend state management |
| Tailwind CSS 4 | Utility-first styling |
| PostgreSQL | Relational database |
| Vitest | Test runner |
| fast-check | Property-based testing library |
| Supertest | HTTP assertion library for integration tests |
| Docker | Containerization |
| GitHub Actions | CI/CD pipeline |

## Setup Summary

```bash
# Clone and enter project
cd ai-powered-ticket-mgt-system

# Backend setup
cd backend-api
cp .env.example .env  # Configure DATABASE_URL, JWT_SECRET (≥32 chars), PORT
npm install
npm run db:setup      # Creates DB → runs migrations → seeds default users

# Frontend setup
cd ../ui
cp .env.example .env  # Set VITE_API_URL=http://localhost:3001/api
npm install

# Run
cd ../backend-api && npm run dev   # API on :3001
cd ../ui && npm run dev            # UI on :5173

# Or use Docker Compose (from repo root)
docker-compose up --build
```

Default credentials: admin@example.com / Admin123! (admin), agent@example.com / Agent123! (agent)
