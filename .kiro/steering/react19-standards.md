---
inclusion: fileMatch
fileMatchPattern: '**/*.tsx,**/*.ts,**/components/**'
---

# React 19 Frontend Standards

These rules apply strictly to all React component files, hooks, and frontend TypeScript modules.

## Data Fetching & State

### use(Promise) for Data Fetching
- **Never use `useEffect` for data fetching or manual promise resolution.**
- Use the React 19 `use(Promise)` API wrapped inside a `<Suspense>` boundary for clean, non-blocking asynchronous data streaming.
- Wrap cross-component themes and states in standard Contexts, but access them using `const value = use(Context)` instead of `useContext`.
- The `use()` hook can be called conditionally or inside loops — utilize this capability to avoid extra abstractions.

```tsx
// ✅ CORRECT — React 19 pattern
import { use, Suspense } from 'react';

function TicketList({ ticketsPromise }: { ticketsPromise: Promise<Ticket[]> }) {
  const tickets = use(ticketsPromise);
  return <ul>{tickets.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
}

// Wrap in Suspense at the parent level
<Suspense fallback={<TicketListSkeleton />}>
  <TicketList ticketsPromise={fetchTickets()} />
</Suspense>
```

```tsx
// ❌ WRONG — Legacy useEffect pattern
function TicketList() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchTickets().then(data => {
      setTickets(data);
      setLoading(false);
    });
  }, []);
}
```

### Context Access
- Use `use(MyContext)` instead of `useContext(MyContext)`.
- This allows conditional context access when needed.

## Form Handling & UI Updates

### Server Actions with Forms
- **Never write manual `isLoading`, `isPending`, or `error` state hooks for forms.**
- Handle submissions natively using the React 19 `<form action={asyncAction}>` attribute.
- Use `useActionState` to automatically receive form responses, error payloads, and pending states directly from server mutations.

```tsx
// ✅ CORRECT — React 19 form action pattern
import { useActionState } from 'react';

function CreateTicketForm() {
  const [state, formAction, isPending] = useActionState(createTicketAction, initialState);

  return (
    <form action={formAction}>
      <input name="title" required />
      {state.error && <p role="alert">{state.error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Ticket'}
      </button>
    </form>
  );
}
```

### useFormStatus for Nested Components
- Use `useFormStatus` inside sub-components to access form-wide transactional contexts (e.g., locking a nested submit button).

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? 'Submitting...' : label}</button>;
}
```

### Optimistic Updates
- For real-time interactions or immediate feedback, implement `useOptimistic` to update the UI before server-side resolution.

```tsx
import { useOptimistic } from 'react';

function CommentList({ comments, addCommentAction }) {
  const [optimisticComments, addOptimistic] = useOptimistic(
    comments,
    (state, newComment) => [...state, { ...newComment, pending: true }]
  );

  async function handleSubmit(formData) {
    const newComment = { message: formData.get('message'), createdAt: new Date() };
    addOptimistic(newComment);
    await addCommentAction(formData);
  }

  return (
    <div>
      {optimisticComments.map(c => (
        <div key={c.id} className={c.pending ? 'opacity-50' : ''}>{c.message}</div>
      ))}
    </div>
  );
}
```

## Component Patterns

### Error Boundaries
- Wrap route-level components in Error Boundaries for graceful failure handling.
- Use Suspense boundaries at logical data-loading points.

### Component Structure
- One component per file for non-trivial components.
- Co-locate component, types, and tests in the same directory.
- Use named exports for all components (no default exports).

## Validation Checklist

Before accepting any React code, verify:

1. ✅ No `useEffect` for data fetching — uses `use(Promise)` + `<Suspense>`
2. ✅ No manual loading/error state for forms — uses `useActionState`
3. ✅ Context accessed via `use(Context)` not `useContext`
4. ✅ Optimistic updates use `useOptimistic` where appropriate
5. ✅ Nested form buttons use `useFormStatus`
6. ✅ All async UI has Suspense fallback or loading indicator
7. ✅ Error boundaries wrap route-level components
