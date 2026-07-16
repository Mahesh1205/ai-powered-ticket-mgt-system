import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTicketStore } from '../stores/ticketStore';
import { NavBar } from '../components/NavBar';
import type { TicketStatus, TicketPriority, UpdateTicketRequest } from '../types';

// State machine: valid transitions from each status
const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  'Open': ['In Progress', 'Cancelled'],
  'In Progress': ['Resolved', 'Cancelled'],
  'Resolved': ['Closed'],
  'Closed': [],
  'Cancelled': [],
};

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

function getTransitionButtonClasses(targetStatus: TicketStatus): string {
  switch (targetStatus) {
    case 'In Progress':
      return 'bg-yellow-600 hover:bg-yellow-700 text-white';
    case 'Resolved':
      return 'bg-green-600 hover:bg-green-700 text-white';
    case 'Closed':
      return 'bg-gray-600 hover:bg-gray-700 text-white';
    case 'Cancelled':
      return 'bg-red-600 hover:bg-red-700 text-white';
    default:
      return 'bg-blue-600 hover:bg-blue-700 text-white';
  }
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    currentTicket,
    isLoading,
    error,
    fetchTicket,
    updateTicket,
    transitionStatus,
    addComment,
  } = useTicketStore();

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<TicketPriority>('medium');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editApiError, setEditApiError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Status transition state
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Comment form state
  const [commentMessage, setCommentMessage] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTicket(id);
    }
  }, [id, fetchTicket]);

  // Initialize edit form when ticket loads
  useEffect(() => {
    if (currentTicket && !isEditing) {
      setEditTitle(currentTicket.title);
      setEditDescription(currentTicket.description);
      setEditPriority(currentTicket.priority);
      setEditAssignedTo(currentTicket.assignedTo || '');
    }
  }, [currentTicket, isEditing]);

  const handleStartEditing = () => {
    if (currentTicket) {
      setEditTitle(currentTicket.title);
      setEditDescription(currentTicket.description);
      setEditPriority(currentTicket.priority);
      setEditAssignedTo(currentTicket.assignedTo || '');
      setEditErrors({});
      setEditApiError(null);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditErrors({});
    setEditApiError(null);
  };

  const validateEdit = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!editTitle.trim()) {
      errors.title = 'Title is required';
    } else if (editTitle.length > 200) {
      errors.title = 'Title must be 200 characters or less';
    }
    if (!editDescription.trim()) {
      errors.description = 'Description is required';
    } else if (editDescription.length > 5000) {
      errors.description = 'Description must be 5000 characters or less';
    }
    return errors;
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    setEditApiError(null);

    const validationErrors = validateEdit();
    setEditErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (!id) return;

    const updates: UpdateTicketRequest = {};
    if (editTitle.trim() !== currentTicket?.title) updates.title = editTitle.trim();
    if (editDescription.trim() !== currentTicket?.description) updates.description = editDescription.trim();
    if (editPriority !== currentTicket?.priority) updates.priority = editPriority;
    if (editAssignedTo.trim() !== (currentTicket?.assignedTo || '')) {
      updates.assignedTo = editAssignedTo.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      setIsEditing(false);
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateTicket(id, updates);
      setIsEditing(false);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        setEditApiError(axiosError.response?.data?.error || 'Failed to update ticket');
      } else {
        setEditApiError('Service unavailable. Please try again later.');
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleTransition = async (targetStatus: TicketStatus) => {
    if (!id) return;
    setTransitionError(null);
    setIsTransitioning(true);

    try {
      await transitionStatus(id, targetStatus);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { status?: number; data?: { error?: string } } };
        if (axiosError.response?.status === 409) {
          setTransitionError(axiosError.response?.data?.error || 'This status transition is not allowed.');
        } else {
          setTransitionError(axiosError.response?.data?.error || 'Failed to transition status.');
        }
      } else {
        setTransitionError('Service unavailable. Please try again later.');
      }
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();
    setCommentError(null);

    const trimmed = commentMessage.trim();
    if (!trimmed) {
      setCommentError('Comment cannot be empty');
      return;
    }
    if (trimmed.length > 2000) {
      setCommentError('Comment must be 2000 characters or less');
      return;
    }

    if (!id) return;

    setIsSubmittingComment(true);
    try {
      await addComment(id, trimmed);
      setCommentMessage('');
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        setCommentError(axiosError.response?.data?.error || 'Failed to add comment');
      } else {
        setCommentError('Service unavailable. Please try again later.');
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (isLoading && !currentTicket) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !currentTicket) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link to="/tickets" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            ← Back to Tickets
          </Link>
          <div role="alert" className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        </main>
      </div>
    );
  }

  if (!currentTicket) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link to="/tickets" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            ← Back to Tickets
          </Link>
          <p className="mt-4 text-gray-600">Ticket not found.</p>
        </main>
      </div>
    );
  }

  const validTransitions = VALID_TRANSITIONS[currentTicket.status] || [];
  const isTerminalState = currentTicket.status === 'Closed' || currentTicket.status === 'Cancelled';

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <div className="mb-6">
          <Link to="/tickets" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            ← Back to Tickets
          </Link>
        </div>

        {/* Ticket Header */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {!isEditing && (
                <>
                  <h1 className="text-2xl font-bold text-gray-900">{currentTicket.title}</h1>
                  <div className="mt-2 flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(currentTicket.status)}`}>
                      {currentTicket.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getPriorityBadgeClasses(currentTicket.priority)}`}>
                      {currentTicket.priority}
                    </span>
                  </div>
                </>
              )}
            </div>
            {!isEditing && (
              <button
                onClick={handleStartEditing}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {/* Edit Form */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              {editApiError && (
                <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {editApiError}
                </div>
              )}

              <div>
                <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  id="edit-title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                    if (editErrors.title) setEditErrors((prev) => ({ ...prev, title: '' }));
                  }}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${editErrors.title ? 'border-red-300' : 'border-gray-300'}`}
                  maxLength={200}
                />
                <div className="flex justify-between mt-1">
                  {editErrors.title && <p className="text-red-600 text-xs">{editErrors.title}</p>}
                  <p className="text-gray-500 text-xs ml-auto">{editTitle.length}/200</p>
                </div>
              </div>

              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  rows={4}
                  value={editDescription}
                  onChange={(e) => {
                    setEditDescription(e.target.value);
                    if (editErrors.description) setEditErrors((prev) => ({ ...prev, description: '' }));
                  }}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y ${editErrors.description ? 'border-red-300' : 'border-gray-300'}`}
                  maxLength={5000}
                />
                <div className="flex justify-between mt-1">
                  {editErrors.description && <p className="text-red-600 text-xs">{editErrors.description}</p>}
                  <p className="text-gray-500 text-xs ml-auto">{editDescription.length}/5000</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-priority" className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    id="edit-priority"
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TicketPriority)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-assigned-to" className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned To
                  </label>
                  <input
                    id="edit-assigned-to"
                    type="text"
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    placeholder="User UUID (leave empty for unassigned)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md shadow-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* Ticket Details (read mode) */
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
                <p className="text-gray-900 whitespace-pre-wrap">{currentTicket.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Assigned To</h3>
                  <p className="text-gray-900 mt-0.5">
                    {currentTicket.assignedTo || <span className="text-gray-500">Unassigned</span>}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created By</h3>
                  <p className="text-gray-900 mt-0.5">{currentTicket.createdBy}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created</h3>
                  <p className="text-gray-900 mt-0.5">{formatDateTime(currentTicket.createdAt)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Updated</h3>
                  <p className="text-gray-900 mt-0.5">{formatDateTime(currentTicket.updatedAt)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Transitions */}
        {!isTerminalState && validTransitions.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Status Transitions</h2>

            {transitionError && (
              <div role="alert" className="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {transitionError}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {validTransitions.map((targetStatus) => (
                <button
                  key={targetStatus}
                  onClick={() => handleTransition(targetStatus)}
                  disabled={isTransitioning}
                  className={`px-4 py-2 font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm ${getTransitionButtonClasses(targetStatus)}`}
                >
                  {isTransitioning ? 'Updating...' : `Move to ${targetStatus}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Comments ({currentTicket.comments.length})
          </h2>

          {/* Comment List */}
          {currentTicket.comments.length > 0 ? (
            <div className="space-y-4 mb-6">
              {[...currentTicket.comments]
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                .map((comment) => (
                  <div key={comment.id} className="border-l-4 border-gray-200 pl-4 py-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <span className="font-medium text-gray-700">{comment.createdBy}</span>
                      <span>•</span>
                      <time dateTime={comment.createdAt}>{formatDateTime(comment.createdAt)}</time>
                    </div>
                    <p className="text-gray-900 whitespace-pre-wrap">{comment.message}</p>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm mb-6">No comments yet.</p>
          )}

          {/* Add Comment Form */}
          <form onSubmit={handleSubmitComment} className="border-t border-gray-200 pt-4">
            <label htmlFor="comment-message" className="block text-sm font-medium text-gray-700 mb-1">
              Add a Comment
            </label>
            <textarea
              id="comment-message"
              rows={3}
              value={commentMessage}
              onChange={(e) => {
                setCommentMessage(e.target.value);
                if (commentError) setCommentError(null);
              }}
              placeholder="Write a comment..."
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y ${commentError ? 'border-red-300' : 'border-gray-300'}`}
              maxLength={2000}
            />
            <div className="flex justify-between items-center mt-1">
              {commentError && <p className="text-red-600 text-xs">{commentError}</p>}
              <p className="text-gray-500 text-xs ml-auto">{commentMessage.length}/2000</p>
            </div>
            <button
              type="submit"
              disabled={isSubmittingComment}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isSubmittingComment ? 'Posting...' : 'Post Comment'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

// Keep default export for backward compatibility with tests
export default TicketDetailPage;
