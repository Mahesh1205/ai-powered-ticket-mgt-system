# Frontend — Support Ticket Management UI

A responsive SPA for creating, tracking, and resolving support tickets through a role-based interface with real-time state machine feedback — built with React 19, Vite 6, Zustand 5, and Tailwind CSS 4.

## Tech Stack

| Library | Version | Purpose |
|---------|---------|---------|
| React | 19 | UI framework |
| Vite | 6 | Build tool and dev server |
| TypeScript | 5.x | Type safety |
| Zustand | 5 | State management |
| Tailwind CSS | 4 | Utility-first styling |
| Axios | latest | HTTP client |
| react-router-dom | 7 | Client-side routing |

## Prerequisites

- Node.js >= 22.0.0
- npm (comes with Node.js)
- Backend API running (default: http://localhost:3001/api)

## Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3001/api` |

## Running Locally

```bash
# Development server with hot reload (HMR)
npm run dev
```

The app starts at **http://localhost:5173** by default.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests (Vitest) |

## Project Structure

```
ui/
├── src/
│   ├── api/           # Axios HTTP client with 401 interceptor
│   ├── components/    # Shared components (NavBar, ProtectedRoute)
│   ├── pages/         # Route page components
│   │   ├── LoginPage.tsx
│   │   ├── TicketListPage.tsx
│   │   ├── CreateTicketPage.tsx
│   │   ├── TicketDetailPage.tsx
│   │   ├── UserListPage.tsx
│   │   ├── CreateUserPage.tsx
│   │   └── EditUserPage.tsx
│   ├── stores/        # Zustand state stores
│   │   ├── authStore.ts
│   │   ├── ticketStore.ts
│   │   └── userStore.ts
│   ├── test/          # Frontend tests
│   ├── types/         # TypeScript interfaces
│   ├── App.tsx        # Root component with routing
│   └── main.tsx       # Entry point
├── public/            # Static assets
├── index.html         # HTML entry point
├── vite.config.ts     # Vite configuration
├── tsconfig.json      # TypeScript configuration
├── tailwind.config.js # Tailwind configuration (if applicable)
└── package.json
```

## Routes

| Path | Component | Access |
|------|-----------|--------|
| `/login` | LoginPage | Public |
| `/tickets` | TicketListPage | Authenticated |
| `/tickets/new` | CreateTicketPage | Authenticated |
| `/tickets/:id` | TicketDetailPage | Authenticated |
| `/users` | UserListPage | Admin only |
| `/users/new` | CreateUserPage | Admin only |
| `/users/:id/edit` | EditUserPage | Admin only |

## Authentication

- JWT token stored in **sessionStorage** (cleared on tab close)
- Session restored on app load via `GET /api/auth/me`
- 401 responses trigger automatic logout (Axios interceptor)
- ProtectedRoute redirects unauthenticated users to `/login`
- Agent role redirected from `/users` routes to `/tickets`

## Default Login Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | Admin123! | admin |
| agent@example.com | Agent123! | agent |

## Docker

```bash
# Build and run via Docker
docker build -t ticket-ui .
docker run -p 5173:80 ticket-ui
```

The Dockerfile uses multi-stage build: Node.js builds the app → nginx:alpine serves the static files with SPA fallback routing.
