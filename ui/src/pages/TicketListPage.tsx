import { use, Suspense, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import type { TicketDTO, TicketStatus } from '../types';
import apiClient from '../api/client';

const STATUS_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'All Statuses', value: '' },
  { label: 'Open', value: 'Open' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Closed', value: 'Closed' },
  { label: 'Cancelled', value: 'Cancelled' },
];

function fetchTickets(params?: { search?: string; status?: string }): Promise<TicketDTO[]> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.set('search', params.search);
  if (params?.status) queryParams.set('status', params.status);
  const query = queryParams.toString();
  const url = query ? `/tickets?${query}` : '/tickets';
  return apiClient.get<TicketDTO[]>(url).then(res => res.data);
}

function getStatusBadgeClasses(status: TicketStatus): string {
  switch (status) {
    case 'Open':
      return 'bg-blue-100 text-blue-800';
    case 'In Progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'Resolved':
      return 'bg-green-100 text-green-800';
    case 'Closed':
      return 'bg-gray-100 text-gray-800';
    case 'Cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getPriorityBadgeClasses(priority: string): string {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-orange-100 text-orange-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function TicketTable({ ticketsPromise, search, statusFilter }: { ticketsPromise: Promise<TicketDTO[]>; search: string; statusFilter: string }) {
  const tickets = use(ticketsPromise);

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 bg-white shadow-sm rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">
          {search || statusFilter
            ? 'No tickets match your search criteria.'
            : 'No tickets yet. Create your first ticket to get started.'}
        </p>
        {!search && !statusFilter && (
          <Link
            to="/tickets/new"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition-colors"
          >
            Create Ticket
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned To
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <Link
                    to={`/tickets/${ticket.id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    {ticket.title}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getPriorityBadgeClasses(ticket.priority)}`}
                  >
                    {ticket.priority}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(ticket.status)}`}
                  >
                    {ticket.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {ticket.assignedTo || <span className="text-gray-500">Unassigned</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {formatDate(ticket.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" role="status">
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div
      role="alert"
      className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
    >
      {error.message || 'Failed to load tickets'}
    </div>
  );
}

export function TicketListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ticketsPromise, setTicketsPromise] = useState(() => fetchTickets());
  const [error, setError] = useState<Error | null>(null);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    setError(null);
    setTicketsPromise(fetchTickets({ search: value || undefined, status: statusFilter || undefined }));
  };

  const handleStatusChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setStatusFilter(value);
    setError(null);
    setTicketsPromise(fetchTickets({ search: search || undefined, status: value || undefined }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <Link
            to="/tickets/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Create Ticket
          </Link>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">
              Search tickets
            </label>
            <input
              id="search"
              type="text"
              placeholder="Search tickets by keyword..."
              value={search}
              onChange={handleSearchChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="sm:w-48">
            <label htmlFor="status-filter" className="sr-only">
              Filter by status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error */}
        {error && <ErrorFallback error={error} />}

        {/* Ticket data */}
        <Suspense fallback={<LoadingSpinner />}>
          <TicketTable ticketsPromise={ticketsPromise} search={search} statusFilter={statusFilter} />
        </Suspense>
      </main>
    </div>
  );
}
