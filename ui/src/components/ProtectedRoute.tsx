import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  requiredRole?: UserRole;
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { token, user, isLoading, restoreSession } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      restoreSession();
    }
  }, [token, user, restoreSession]);

  // No token in sessionStorage — redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Session restore in progress — show loading state
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-600">Restoring session...</p>
        </div>
      </div>
    );
  }

  // Role check — agent accessing admin routes gets redirected to /tickets
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/tickets" replace />;
  }

  return <Outlet />;
}
