/**
 * Property 23: Frontend displays only valid transition buttons
 *
 * For any ticket rendered in the detail view, the set of status transition buttons
 * displayed SHALL exactly equal the set of valid target statuses from the ticket's
 * current status per the state machine. Terminal states (Closed, Cancelled) SHALL
 * have zero transition buttons.
 *
 * **Validates: Requirements 22.1, 22.2, 22.4**
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as fc from 'fast-check';
import type { TicketStatus, TicketDetailDTO } from '../types';

// Mock the stores
vi.mock('../stores/ticketStore', () => ({
  useTicketStore: vi.fn(),
}));

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    token: 'mock-token',
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com', role: 'admin' },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    restoreSession: vi.fn(),
  })),
}));

import TicketDetailPage from './TicketDetailPage';
import { useTicketStore } from '../stores/ticketStore';

// The expected state machine transitions (mirrors the component's VALID_TRANSITIONS)
const EXPECTED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  'Open': ['In Progress', 'Cancelled'],
  'In Progress': ['Resolved', 'Cancelled'],
  'Resolved': ['Closed'],
  'Closed': [],
  'Cancelled': [],
};

const ALL_STATUSES: TicketStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed', 'Cancelled'];

function createMockTicket(status: TicketStatus): TicketDetailDTO {
  return {
    id: 'ticket-123',
    title: 'Test Ticket',
    description: 'A test ticket description',
    priority: 'medium',
    status,
    assignedTo: null,
    createdBy: 'user-1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    comments: [],
  };
}

function renderTicketDetail(status: TicketStatus) {
  const mockTicket = createMockTicket(status);

  const mockStore = {
    currentTicket: mockTicket,
    isLoading: false,
    error: null,
    fetchTicket: vi.fn(),
    updateTicket: vi.fn(),
    transitionStatus: vi.fn(),
    addComment: vi.fn(),
    tickets: [],
    fetchTickets: vi.fn(),
    createTicket: vi.fn(),
  };

  vi.mocked(useTicketStore).mockReturnValue(mockStore as ReturnType<typeof useTicketStore>);

  return render(
    <MemoryRouter initialEntries={['/tickets/ticket-123']}>
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Property 23: Frontend displays only valid transition buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // fast-check arbitrary for TicketStatus
  const ticketStatusArb = fc.constantFrom(...ALL_STATUSES);

  it('should display exactly the valid transition buttons for any ticket status', () => {
    fc.assert(
      fc.property(ticketStatusArb, (status: TicketStatus) => {
        const { unmount } = renderTicketDetail(status);

        const expectedTransitions = EXPECTED_TRANSITIONS[status];

        // Find all buttons with "Move to" text (transition buttons)
        const allButtons = screen.queryAllByRole('button');
        const transitionButtons = allButtons.filter((btn) =>
          btn.textContent?.startsWith('Move to ')
        );

        // Verify count matches
        expect(transitionButtons.length).toBe(expectedTransitions.length);

        // Verify each expected transition has a corresponding button
        for (const expectedTarget of expectedTransitions) {
          const button = screen.queryByRole('button', { name: `Move to ${expectedTarget}` });
          expect(button).toBeInTheDocument();
        }

        // Verify no unexpected transition buttons exist
        const renderedTransitionNames = transitionButtons.map((btn) =>
          btn.textContent!.replace('Move to ', '')
        );
        for (const name of renderedTransitionNames) {
          expect(expectedTransitions).toContain(name);
        }

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('should render zero transition buttons for terminal states (Closed, Cancelled)', () => {
    const terminalStatusArb = fc.constantFrom('Closed' as TicketStatus, 'Cancelled' as TicketStatus);

    fc.assert(
      fc.property(terminalStatusArb, (status: TicketStatus) => {
        const { unmount } = renderTicketDetail(status);

        const allButtons = screen.queryAllByRole('button');
        const transitionButtons = allButtons.filter((btn) =>
          btn.textContent?.startsWith('Move to ')
        );

        // Terminal states must have zero transition buttons
        expect(transitionButtons.length).toBe(0);

        // Also verify the "Status Transitions" section heading is not rendered
        const heading = screen.queryByText('Status Transitions');
        expect(heading).not.toBeInTheDocument();

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('should render transition buttons only for non-terminal states', () => {
    const nonTerminalStatusArb = fc.constantFrom(
      'Open' as TicketStatus,
      'In Progress' as TicketStatus,
      'Resolved' as TicketStatus
    );

    fc.assert(
      fc.property(nonTerminalStatusArb, (status: TicketStatus) => {
        const { unmount } = renderTicketDetail(status);

        const expectedTransitions = EXPECTED_TRANSITIONS[status];

        // Non-terminal states must have at least one transition button
        expect(expectedTransitions.length).toBeGreaterThan(0);

        // Verify the "Status Transitions" section heading is rendered
        const heading = screen.queryByText('Status Transitions');
        expect(heading).toBeInTheDocument();

        const allButtons = screen.queryAllByRole('button');
        const transitionButtons = allButtons.filter((btn) =>
          btn.textContent?.startsWith('Move to ')
        );

        expect(transitionButtons.length).toBe(expectedTransitions.length);

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
