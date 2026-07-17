# API Contract

## Endpoint: Login
**Method:** POST  
**Path:** /api/auth/login  
**Purpose:** Authenticate user and issue JWT token

### Request
```json
{
  "email": "string (required, valid email format)",
  "password": "string (required)"
}
```

### Response (200)
```json
{
  "token": "string (JWT)",
  "user": {
    "id": "string (UUID)",
    "name": "string",
    "email": "string",
    "role": "agent | admin"
  }
}
```

### Validation Rules
- email: required, must be valid email format
- password: required, non-empty

### Error Responses
- 400: Missing email or password field
- 401: Invalid credentials (generic message, no user enumeration)

---

## Endpoint: Get Current User
**Method:** GET  
**Path:** /api/auth/me  
**Purpose:** Retrieve authenticated user's profile

### Request
Headers: `Authorization: Bearer <token>`

### Response (200)
```json
{
  "id": "string (UUID)",
  "name": "string",
  "email": "string",
  "role": "agent | admin"
}
```

### Error Responses
- 401: Missing, malformed, or expired token

---

## Endpoint: Create Ticket
**Method:** POST  
**Path:** /api/tickets  
**Purpose:** Create a new support ticket

### Request
```json
{
  "title": "string (required, max 200 chars)",
  "description": "string (required, max 5000 chars)",
  "priority": "low | medium | high (required)"
}
```

### Response (201)
```json
{
  "id": "string (UUID)",
  "title": "string",
  "description": "string",
  "priority": "low | medium | high",
  "status": "Open",
  "assignedTo": null,
  "createdBy": "string (UUID of authenticated user)",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)"
}
```

### Validation Rules
- title: required, non-empty, max 200 characters
- description: required, non-empty, max 5000 characters
- priority: required, must be "low", "medium", or "high"

### Error Responses
- 400: Validation failure (missing fields, invalid priority, length exceeded)
- 401: Not authenticated

---

## Endpoint: List Tickets
**Method:** GET  
**Path:** /api/tickets  
**Purpose:** List, search, and filter tickets

### Request
Query Parameters:
- `search` (optional): keyword for ILIKE search on title + description
- `status` (optional): filter by ticket status

### Response (200)
```json
[
  {
    "id": "string (UUID)",
    "title": "string",
    "description": "string",
    "priority": "low | medium | high",
    "status": "Open | In Progress | Resolved | Closed | Cancelled",
    "assignedTo": "string (UUID) | null",
    "createdBy": "string (UUID)",
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)"
  }
]
```
Ordered by createdAt descending. Returns empty array if no matches.

### Error Responses
- 401: Not authenticated

---

## Endpoint: Get Ticket Detail
**Method:** GET  
**Path:** /api/tickets/:id  
**Purpose:** Get full ticket details with comments

### Request
Path Parameter: `id` (UUID)

### Response (200)
```json
{
  "id": "string (UUID)",
  "title": "string",
  "description": "string",
  "priority": "low | medium | high",
  "status": "Open | In Progress | Resolved | Closed | Cancelled",
  "assignedTo": "string (UUID) | null",
  "createdBy": "string (UUID)",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)",
  "comments": [
    {
      "id": "string (UUID)",
      "ticketId": "string (UUID)",
      "createdBy": "string (UUID)",
      "message": "string",
      "createdAt": "string (ISO 8601)"
    }
  ]
}
```
Comments ordered by createdAt ascending.

### Error Responses
- 401: Not authenticated
- 404: Ticket not found

---

## Endpoint: Update Ticket
**Method:** PATCH  
**Path:** /api/tickets/:id  
**Purpose:** Update editable ticket fields (NOT status)

### Request
```json
{
  "title": "string (optional, max 200 chars)",
  "description": "string (optional, max 5000 chars)",
  "priority": "low | medium | high (optional)",
  "assignedTo": "string (UUID) | null (optional)"
}
```

### Response (200)
Full updated ticket object (same as create response).

### Validation Rules
- At least one field must be provided
- title: max 200 characters
- priority: must be "low", "medium", or "high"
- assignedTo: must reference existing user UUID
- status field: REJECTED with 400 (must use /status endpoint)

### Error Responses
- 400: Validation failure or status field included
- 401: Not authenticated
- 404: Ticket not found

---

## Endpoint: Transition Ticket Status
**Method:** PATCH  
**Path:** /api/tickets/:id/status  
**Purpose:** Change ticket status through the state machine

### Request
```json
{
  "status": "Open | In Progress | Resolved | Closed | Cancelled"
}
```

### Response (200)
Full updated ticket object with new status.

### Validation Rules
- status: must be a valid TicketStatus value
- Transition must be valid per state machine:
  - Open → In Progress, Cancelled
  - In Progress → Resolved, Cancelled
  - Resolved → Closed
  - Closed → (no transitions)
  - Cancelled → (no transitions)

### Error Responses
- 400: Invalid status value
- 401: Not authenticated
- 404: Ticket not found
- 409: Invalid state transition (current → target not permitted)

---

## Endpoint: Add Comment
**Method:** POST  
**Path:** /api/tickets/:id/comments  
**Purpose:** Add a comment to a ticket

### Request
```json
{
  "message": "string (required, max 2000 chars, not whitespace-only)"
}
```

### Response (201)
```json
{
  "id": "string (UUID)",
  "ticketId": "string (UUID)",
  "createdBy": "string (UUID)",
  "message": "string",
  "createdAt": "string (ISO 8601)"
}
```

### Validation Rules
- message: required, not empty, not whitespace-only, max 2000 characters

### Error Responses
- 400: Missing/empty/whitespace-only message or exceeds 2000 chars
- 401: Not authenticated
- 404: Ticket not found

---

## Endpoint: List Users
**Method:** GET  
**Path:** /api/users  
**Purpose:** List all system users (for assignment dropdowns)

### Request
Headers: `Authorization: Bearer <token>` (any authenticated role)

### Response (200)
```json
[
  {
    "id": "string (UUID)",
    "name": "string",
    "email": "string",
    "role": "agent | admin",
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)"
  }
]
```
Never includes passwordHash.

### Error Responses
- 401: Not authenticated

---

## Endpoint: Create User
**Method:** POST  
**Path:** /api/users  
**Purpose:** Create a new user account (admin only)

### Request
```json
{
  "name": "string (required, max 100 chars)",
  "email": "string (required, valid email format)",
  "password": "string (required, min 6 chars)",
  "role": "agent | admin (required)"
}
```

### Response (201)
```json
{
  "id": "string (UUID)",
  "name": "string",
  "email": "string",
  "role": "agent | admin",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)"
}
```
Never includes passwordHash.

### Validation Rules
- name: required, max 100 characters
- email: required, valid format, unique (case-insensitive)
- password: required, min 6 characters (stored as bcrypt hash, cost ≥ 10)
- role: required, must be "agent" or "admin"

### Error Responses
- 400: Validation failure
- 401: Not authenticated
- 403: Non-admin user
- 409: Email already exists

---

## Endpoint: Update User
**Method:** PATCH  
**Path:** /api/users/:id  
**Purpose:** Update user account (admin only)

### Request
```json
{
  "name": "string (optional, max 200 chars)",
  "email": "string (optional, valid format)",
  "role": "agent | admin (optional)",
  "password": "string (optional, min 6 chars)"
}
```

### Response (200)
Updated user object (same as create response).

### Validation Rules
- At least one updatable field required
- name: max 200 characters
- email: valid format, unique (case-insensitive) among other users
- role: "agent" or "admin"
- password: min 6 characters (re-hashed with bcrypt)

### Error Responses
- 400: Validation failure or no updatable fields
- 401: Not authenticated
- 403: Non-admin user
- 404: User not found
- 409: Email already belongs to another user

---

## Endpoint: Delete User
**Method:** DELETE  
**Path:** /api/users/:id  
**Purpose:** Remove a user account (admin only)

### Request
Path Parameter: `id` (UUID)

### Response (200)
```json
{ "message": "User deleted successfully" }
```

### Validation Rules
- Target user must have no ticket or comment references
- Admin cannot delete themselves

### Error Responses
- 401: Not authenticated
- 403: Non-admin user
- 404: User not found
- 409: User has references (tickets/comments) or self-deletion attempted
