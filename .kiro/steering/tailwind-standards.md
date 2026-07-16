---
inclusion: fileMatch
fileMatchPattern: '**/*.tsx,**/*.css,**/tailwind.config.*,**/postcss.config.*'
---

# Tailwind CSS 4 Standards & Conventions

These rules apply to all component files, CSS files, and Tailwind configuration. All styling must use Tailwind utility classes exclusively.

## Core Principles

### Utility-First — No Custom CSS
- **Never write custom CSS files or inline `style={{}}` attributes.**
- Use Tailwind utility classes for all styling needs.
- The only exceptions are global CSS resets already provided by Tailwind's base layer.

```tsx
// ✅ CORRECT — Tailwind utilities
<button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors">
  Create Ticket
</button>

// ❌ WRONG — inline styles
<button style={{ backgroundColor: 'blue', color: 'white', padding: '8px 16px' }}>
  Create Ticket
</button>

// ❌ WRONG — custom CSS class
<button className="btn-primary">Create Ticket</button>
```

### No @apply Abuse
- **Never use `@apply` to create component classes in CSS files.**
- Extract repeated patterns into React components instead.
- `@apply` defeats the purpose of utility-first and creates maintenance burden.

```tsx
// ✅ CORRECT — reusable component
function Button({ children, variant = 'primary', ...props }) {
  const styles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button className={`px-4 py-2 rounded-lg font-medium transition-colors focus:ring-2 focus:outline-none ${styles[variant]}`} {...props}>
      {children}
    </button>
  );
}

// ❌ WRONG — @apply in CSS
/* styles.css */
.btn-primary {
  @apply bg-blue-600 text-white px-4 py-2 rounded-lg;
}
```

## Layout & Responsive Design

### Mobile-First Approach
- Always design for mobile first, then add responsive prefixes for larger screens.
- Use `sm:`, `md:`, `lg:`, `xl:` breakpoints progressively.

```tsx
// ✅ CORRECT — mobile-first responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {tickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
</div>
```

### Flexbox & Grid Patterns
- Use `flex` for one-dimensional layouts (navbars, card rows, form layouts).
- Use `grid` for two-dimensional layouts (dashboards, ticket lists, form grids).
- Prefer `gap-*` over margin for spacing between flex/grid children.

```tsx
// ✅ CORRECT — gap for spacing
<div className="flex items-center gap-3">
  <Avatar /> <span>{user.name}</span>
</div>

// ❌ WRONG — margin for spacing in flex
<div className="flex items-center">
  <Avatar className="mr-3" /> <span>{user.name}</span>
</div>
```

### Container & Page Layout
- Use `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` for page content containers.
- Use `min-h-screen` on the root layout to prevent short pages.

## Color System & Design Tokens

### Consistent Color Usage
- Use semantic color assignments consistently across the application:

| Purpose | Color Classes |
|---------|--------------|
| Primary actions | `bg-blue-600 hover:bg-blue-700 text-white` |
| Success / Resolved | `bg-green-100 text-green-800` |
| Warning / In Progress | `bg-yellow-100 text-yellow-800` |
| Danger / Cancelled | `bg-red-100 text-red-800` |
| Neutral / Open | `bg-gray-100 text-gray-800` |
| Closed | `bg-purple-100 text-purple-800` |

### Status Badge Pattern
```tsx
const STATUS_STYLES: Record<TicketStatus, string> = {
  'Open': 'bg-gray-100 text-gray-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  'Resolved': 'bg-green-100 text-green-800',
  'Closed': 'bg-purple-100 text-purple-800',
  'Cancelled': 'bg-red-100 text-red-800',
} as const;

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}
```

### Priority Badge Pattern
```tsx
const PRIORITY_STYLES: Record<TicketPriority, string> = {
  'low': 'bg-blue-100 text-blue-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'high': 'bg-red-100 text-red-800',
} as const;
```

## Typography

### Heading Hierarchy
- `text-2xl font-bold` — Page titles (h1)
- `text-xl font-semibold` — Section titles (h2)
- `text-lg font-medium` — Card headers (h3)
- `text-sm text-gray-500` — Metadata and secondary text
- `text-base` — Body text (default)

### Text Truncation
- Use `truncate` for single-line overflow in lists.
- Use `line-clamp-2` or `line-clamp-3` for multi-line descriptions.

## Form Styling

### Input Pattern
```tsx
<label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
  Title
</label>
<input
  id="title"
  name="title"
  type="text"
  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
  placeholder="Enter ticket title"
/>
```

### Error State on Inputs
```tsx
<input
  className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none ${
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
  }`}
/>
{hasError && <p className="mt-1 text-sm text-red-600" role="alert">{errorMessage}</p>}
```

### Select/Dropdown Pattern
```tsx
<select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none">
  <option value="">Select priority</option>
  <option value="low">Low</option>
  <option value="medium">Medium</option>
  <option value="high">High</option>
</select>
```

## Interactive States

### Button States
- Always include hover, focus, and disabled states:
```tsx
className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium
  hover:bg-blue-700
  focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-colors"
```

### Loading States
- Use `animate-pulse` for skeleton loaders.
- Use `animate-spin` for spinner icons.
- Disable buttons and show spinner during async operations.

```tsx
{isPending && <svg className="animate-spin h-4 w-4 mr-2" />}
```

## Accessibility with Tailwind

### Focus Visibility
- Always use `focus:ring-2 focus:ring-blue-500 focus:outline-none` on interactive elements.
- Never remove focus indicators: `outline-none` must always be paired with `focus:ring-*`.

### Screen Reader Utilities
- Use `sr-only` class for visually hidden but screen-reader accessible text.
- Use `not-sr-only` to make text visible again at certain breakpoints.

```tsx
<button>
  <TrashIcon className="h-5 w-5" />
  <span className="sr-only">Delete ticket</span>
</button>
```

### Color Contrast
- Body text on white: minimum `text-gray-700` (4.5:1 ratio met).
- Small text: minimum `text-gray-600`.
- Never use `text-gray-400` or lighter for informational text on white backgrounds.

## Spacing & Sizing Conventions

### Consistent Spacing Scale
- Component internal padding: `p-4` or `p-6`
- Between sections: `space-y-6` or `gap-6`
- Between form fields: `space-y-4`
- Between inline elements: `gap-2` or `gap-3`
- Page padding: `px-4 sm:px-6 lg:px-8 py-6`

### Card Pattern
```tsx
<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
  {/* card content */}
</div>
```

## Dark Mode (Optional)

- If implementing dark mode, use the `dark:` variant consistently.
- Define dark mode in `tailwind.config` as `darkMode: 'class'`.
- Every light-mode utility must have a `dark:` counterpart where background or text color is used.

## Validation Checklist

Before accepting any styled code, verify:

1. ✅ No custom CSS files — Tailwind utilities only
2. ✅ No `@apply` directives — use React components for reuse
3. ✅ No inline `style={{}}` attributes
4. ✅ Mobile-first responsive design with `sm:`, `md:`, `lg:` prefixes
5. ✅ All interactive elements have hover, focus, and disabled states
6. ✅ Focus indicators present (focus:ring-*) on all buttons/inputs/links
7. ✅ Color contrast meets WCAG AA (no text lighter than gray-600 on white)
8. ✅ `sr-only` used for icon-only buttons
9. ✅ Consistent spacing scale (no arbitrary pixel values)
10. ✅ Status/priority badges use semantic color mapping
11. ✅ Forms have proper label styling and error state patterns
12. ✅ Loading states use animate-pulse or animate-spin
