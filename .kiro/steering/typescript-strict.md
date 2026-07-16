---
inclusion: fileMatch
fileMatchPattern: '**/*.ts,**/*.tsx'
---

# TypeScript Strict Type Safety & Compiler Rules

These rules apply universally to ALL TypeScript files across the project workspace — frontend and backend.

## Strict Typing Rules

### No `any` — Ever
- **The use of `any` is strictly prohibited.**
- If a type is unknown or indeterminate, declare it as `unknown` and implement runtime type guards.
- Use Zod `schema.parse()` to validate and narrow unknown types safely.

```typescript
// ✅ CORRECT — unknown with runtime validation
function processApiResponse(data: unknown): Ticket {
  return ticketSchema.parse(data); // Zod validates and narrows
}

// ❌ WRONG — any bypasses all safety
function processApiResponse(data: any): Ticket {
  return data as Ticket; // Unsafe cast
}
```

### Explicit Return Types
- Enforce explicit, deterministic return types on all exported module functions, API handlers, and React components.
- Internal helper functions may use inference, but public APIs must declare return types.

```typescript
// ✅ CORRECT — explicit return type
export async function getTicketById(id: string): Promise<Ticket | null> {
  // ...
}

// ❌ WRONG — implicit return on exported function
export async function getTicketById(id: string) {
  // ...
}
```

### Readonly for Configuration
- Use `readonly` arrays and objects for configuration setups to protect data against unpredictable mutations.
- Use `as const` for literal value objects (status enums, transition maps, role lists).

```typescript
// ✅ CORRECT
export const VALID_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed', 'Cancelled'] as const;
export type TicketStatus = typeof VALID_STATUSES[number];

export const TRANSITIONS: Readonly<Record<TicketStatus, readonly TicketStatus[]>> = {
  'Open': ['In Progress', 'Cancelled'],
  'In Progress': ['Resolved', 'Cancelled'],
  'Resolved': ['Closed'],
  'Closed': [],
  'Cancelled': [],
} as const;
```

## Error Mitigation & Type Checking

### No Compiler Suppression
- **Never use `// @ts-ignore` or `// @ts-expect-error` to bypass compiler warnings.**
- Resolve the root type conflict explicitly.
- If a third-party library has incorrect types, create a proper declaration file (`.d.ts`).

### Discriminated Unions over Optionals
- Prefer type-safe discriminated unions over optional properties with null checks when modeling application states or API responses.

```typescript
// ✅ CORRECT — discriminated union
type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };

// ❌ WRONG — ambiguous optional state
type ApiResult<T> = {
  data?: T;
  error?: string;
  code?: string;
};
```

### Safe Type Narrowing
- When working with `unknown` or typing API responses, use Zod `schema.parse()` or `schema.safeParse()` instead of forced typecasting (`as MyType`).
- Type guards must use runtime checks, not just type assertions.

```typescript
// ✅ CORRECT — runtime validated narrowing
const result = ticketSchema.safeParse(apiResponse);
if (result.success) {
  // result.data is fully typed as Ticket
}

// ❌ WRONG — unsafe assertion
const ticket = apiResponse as Ticket; // No runtime validation
```

## TypeScript Compiler Configuration

### Required tsconfig.json Settings
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Shared Type Definitions
- Define shared types (Ticket, User, Comment, ApiError) in a `shared/types` or `common/types` directory.
- Both frontend and backend must import from the same type definitions to ensure alignment.
- Zod schemas should be the single source of truth — derive TypeScript types from them using `z.infer<typeof schema>`.

```typescript
import { z } from 'zod';

export const ticketSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed', 'Cancelled']),
  assignedTo: z.string().uuid().nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Ticket = z.infer<typeof ticketSchema>;
```

## Agent Self-Verification Protocol

Before presenting any code changes or completing a multi-file task:

1. ✅ Verify no raw credentials, passwords, or fallback local paths are hardcoded
2. ✅ Confirm every React component respects React 19 compiler patterns
3. ✅ Validate TypeScript definitions align across frontend schemas and backend database entities
4. ✅ No `any` types anywhere in the codebase
5. ✅ No `// @ts-ignore` or `// @ts-expect-error` suppression comments
6. ✅ All exported functions have explicit return types
7. ✅ Configuration objects use `readonly` / `as const`
8. ✅ API response types use discriminated unions, not optional fields
9. ✅ Zod schemas are the single source of truth for shared types
10. ✅ tsconfig.json has strict mode enabled with all recommended flags
