import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';
import { NavBar } from '../components/NavBar';
import type { UserRole } from '../types';

function getRoleBadgeClasses(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'bg-purple-100 text-purple-800';
    case 'agent':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function UserListPage() {
  const { users, isLoading, error, fetchUsers, deleteUser } = useUserStore();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteClick = (userId: string) => {
    setDeleteError(null);
    setConfirmDeleteId(userId);
  };

  const handleDeleteCancel = () => {
    setConfirmDeleteId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return;

    try {
      await deleteUser(confirmDeleteId);
      setConfirmDeleteId(null);
      setDeleteError(null);
    } catch (err: unknown) {
      setConfirmDeleteId(null);
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err
      ) {
        const axiosError = err as { response?: { status?: number; data?: { error?: string } } };
        if (axiosError.response?.status === 409) {
          setDeleteError(
            axiosError.response.data?.error ||
              'Cannot delete user: user has associated tickets or comments.'
          );
        } else {
          setDeleteError(
            axiosError.response?.data?.error || 'Failed to delete user.'
          );
        }
      } else {
        setDeleteError('Failed to delete user.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <Link
            to="/users/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Create User
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
          >
            {error}
          </div>
        )}

        {/* Delete Error (409) */}
        {deleteError && (
          <div
            role="alert"
            className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
          >
            {deleteError}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div
              className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
              role="status"
            >
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        )}

        {/* User Table */}
        {!isLoading && users.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Role
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getRoleBadgeClasses(user.role)}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Link
                          to={`/users/${user.id}/edit`}
                          className="text-blue-600 hover:text-blue-800 font-medium mr-4"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(user.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && users.length === 0 && !error && (
          <div className="text-center py-12 bg-white shadow-sm rounded-lg border border-gray-200">
            <p className="text-gray-500 text-sm">
              No users found. Create your first user to get started.
            </p>
            <Link
              to="/users/new"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition-colors"
            >
              Create User
            </Link>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={handleDeleteCancel}
              aria-hidden="true"
            />
            <div
              className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-dialog-title"
            >
              <h2
                id="delete-dialog-title"
                className="text-lg font-semibold text-gray-900 mb-2"
              >
                Confirm Delete
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete this user? This action cannot be
                undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleDeleteCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
