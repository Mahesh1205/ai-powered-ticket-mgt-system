import { useActionState, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTicketStore } from '../stores/ticketStore';
import type { TicketPriority } from '../types';

interface FormState {
  error: string | null;
  fieldErrors: {
    title?: string;
    description?: string;
    priority?: string;
  };
}

export function CreateTicketPage() {
  const { createTicket } = useTicketStore();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');

  const [state, formAction, isPending] = useActionState(
    async (_prevState: FormState, formData: FormData): Promise<FormState> => {
      const titleVal = (formData.get('title') as string) || '';
      const descVal = (formData.get('description') as string) || '';
      const priorityVal = (formData.get('priority') as string) || '';

      // Client-side validation
      const fieldErrors: FormState['fieldErrors'] = {};

      if (!titleVal.trim()) {
        fieldErrors.title = 'Title is required';
      } else if (titleVal.length > 200) {
        fieldErrors.title = 'Title must be 200 characters or less';
      }

      if (!descVal.trim()) {
        fieldErrors.description = 'Description is required';
      } else if (descVal.length > 5000) {
        fieldErrors.description = 'Description must be 5000 characters or less';
      }

      if (!priorityVal) {
        fieldErrors.priority = 'Priority is required';
      }

      if (Object.keys(fieldErrors).length > 0) {
        return { error: null, fieldErrors };
      }

      try {
        await createTicket({
          title: titleVal.trim(),
          description: descVal.trim(),
          priority: priorityVal as TicketPriority,
        });
        navigate('/tickets');
        return { error: null, fieldErrors: {} };
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'response' in err) {
          const axiosError = err as { response?: { data?: { error?: string } } };
          if (axiosError.response?.data?.error) {
            return { error: axiosError.response.data.error, fieldErrors: {} };
          }
        }
        return { error: 'Service unavailable. Please try again later.', fieldErrors: {} };
      }
    },
    { error: null, fieldErrors: {} }
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          to="/tickets"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          ← Back to Tickets
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Ticket</h1>

      <form action={formAction} className="bg-white shadow-md rounded-lg p-6 space-y-5">
        {state.error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
          >
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              state.fieldErrors.title ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Brief summary of the issue"
            maxLength={200}
          />
          <div className="flex justify-between mt-1">
            {state.fieldErrors.title && (
              <p className="text-red-600 text-xs">{state.fieldErrors.title}</p>
            )}
            <p className="text-gray-500 text-xs ml-auto">{title.length}/200</p>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y ${
              state.fieldErrors.description ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Detailed description of the issue"
            maxLength={5000}
          />
          <div className="flex justify-between mt-1">
            {state.fieldErrors.description && (
              <p className="text-red-600 text-xs">{state.fieldErrors.description}</p>
            )}
            <p className="text-gray-500 text-xs ml-auto">{description.length}/5000</p>
          </div>
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
            Priority <span className="text-red-500">*</span>
          </label>
          <select
            id="priority"
            name="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority | '')}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              state.fieldErrors.priority ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          {state.fieldErrors.priority && (
            <p className="text-red-600 text-xs mt-1">{state.fieldErrors.priority}</p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Creating...' : 'Create Ticket'}
          </button>
          <Link
            to="/tickets"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
