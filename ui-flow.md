# UI Flow

## Route Structure

| Route | Component | Access | Description |
|-------|-----------|--------|-------------|
| `/login` | LoginPage | Public | Email/password form |
| `/tickets` | TicketListPage | Authenticated | Ticket table with search/filter |
| `/tickets/new` | CreateTicketPage | Authenticated | Ticket creation form |
| `/tickets/:id` | TicketDetailPage | Authenticated | Full detail, transitions, comments |
| `/users` | UserListPage | Admin only | User management table |
| `/users/new` | CreateUserPage | Admin only | User creation form |
| `/users/:id/edit` | EditUserPage | Admin only | User edit form |

## User Flows

### Login Flow

```
┌────────────┐     ┌──────────────┐     ┌─────────────┐
│  /login    │────►│ POST /login  │────►│  /tickets   │
│  Form      │     │  API call    │     │  (redirect) │
└────────────┘     └──────────────┘     └─────────────┘
      │                    │
      │  Invalid creds     │  Token stored
      │◄───────────────────│  in sessionStorage
      │  Show error inline │
```

### Session Restoration (App Load)

```
┌─────────────┐     ┌────────────────┐     ┌──────────────┐
│  App Mount  │────►│ Token in       │────►│ GET /auth/me │
│             │     │ sessionStorage?│     │              │
└─────────────┘     └────────────────┘     └──────────────┘
                          │ No                     │
                          ▼                        │ 200: Set user
                    ┌──────────┐                   │ 401: Clear + /login
                    │  /login  │                   │
                    └──────────┘                   ▼
                                            ┌──────────────┐
                                            │ Render app   │
                                            └──────────────┘
```

### Ticket Lifecycle Flow

```
┌──────────────┐     ┌───────────────┐     ┌─────────────────┐
│ /tickets     │────►│ /tickets/new  │────►│ POST /tickets   │
│ List view    │     │ Create form   │     │ → redirect list │
└──────┬───────┘     └───────────────┘     └─────────────────┘
       │
       │ Click row
       ▼
┌──────────────────────────────────────────────────────────────┐
│ /tickets/:id — Ticket Detail                                  │
├──────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐  ┌─────────────────────────────┐ │
│ │ Ticket Info + Edit Form │  │ Status Transition Buttons    │ │
│ │ (title, desc, priority, │  │ (only valid next states)     │ │
│ │  assignedTo)            │  │ Terminal? → no buttons shown │ │
│ └─────────────────────────┘  └─────────────────────────────┘ │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ Comments List (ordered by createdAt ASC)                   │ │
│ │ + Add Comment Form (max 2000 chars)                       │ │
│ └───────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### User Management Flow (Admin Only)

```
┌──────────────┐     ┌───────────────┐     ┌─────────────────┐
│ /users       │────►│ /users/new    │────►│ POST /users     │
│ User table   │     │ Create form   │     │ → redirect list │
└──────┬───────┘     └───────────────┘     └─────────────────┘
       │
       │ Edit click        Delete click
       ▼                   ▼
┌────────────────┐   ┌─────────────────┐
│ /users/:id/edit│   │ Confirm dialog  │
│ Edit form      │   │ → DELETE /users │
│ (optional pwd) │   │ 409? Show error │
└────────────────┘   └─────────────────┘
```

## Navigation Bar

```
┌────────────────────────────────────────────────────────────────┐
│ [App Name]     Tickets     Users (admin only)     [Name] Logout│
└────────────────────────────────────────────────────────────────┘
```

- Shows user name and role
- "Users" link visible only for admin role
- Logout clears sessionStorage and redirects to /login

## State Management (Zustand Stores)

| Store | Responsibility |
|-------|---------------|
| authStore | Token, user object, login/logout/restoreSession |
| ticketStore | Tickets list, current ticket, CRUD, search/filter, transitions, comments |
| userStore | Users list, create/update/delete (admin operations) |

## Protected Route Behavior

1. If no token in sessionStorage → redirect to `/login`
2. If token exists but role check fails (agent accessing /users) → redirect to `/tickets`
3. While validating session (GET /auth/me in progress) → show loading spinner
4. 401 response from any API call → clear session, redirect to `/login`

## Error Display Patterns

- **Form validation errors**: Inline messages below each invalid field
- **API errors (400, 409)**: Alert/toast near the triggering form/button
- **State transition 409**: Toast message "Transition not allowed" without page reload
- **Network failure**: Full-width banner "Service unavailable, please retry"
