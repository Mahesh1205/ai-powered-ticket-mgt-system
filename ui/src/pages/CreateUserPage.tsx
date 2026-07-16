import { useActionState, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';
import { NavBar } from '../components/NavBar';
import type { UserRole } from '../types';

interface FormState {
  error: string | null;
  fieldErrors: {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CreateUserPage() {
  const { createUser } = useUserStore();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');

  const [state, formAction, isPending] = useActionState(
    async (_prevState: FormState, formData: FormData): Promise<FormState> => {
      const nameVal = (formData.get('name') as string) || '';
      const emailVal = (formData.get('email') as string) || '';
      const passwordVal = (formData.get('password') as string) || '';
      const roleVal = (formData.get('role') as string) || '';

      // Client-side validation
      const fieldErrors: FormState['fieldErrors'] = {};

      if (!nameVal.trim()) {
        fieldErrors.name = 'Name is required';
      } else if (nameVal.length > 100) {
        fieldErrors.name = 'Name must be 100 characters or less';
      }

      if (!emailVal.trim()) {
        fieldErrors.email = 'Email is required';
      } else if (!EMAIL_REGEX.test(emailVal)) {
        fieldErrors.email = 'Please enter a valid email address';
      }

      if (!passwordVal) {
        fieldErrors.password = 'Password is required';
      } else if (passwordVal.length < 6) {
        fieldErrors.password = 'Password must be at least 6 characters';
      }

      if (!roleVal) {
        fieldErrors.role = 'Role is required';
      }

      if (Object.keys(fieldErrors).length > 0) {
        return { error: null, fieldErrors };
      }

      try {
        await createUser({
          name: nameVal.trim(),
          email: emailVal.trim().toLowerCase(),
          password: passwordVal,
          role: roleVal as UserRole,
        });
        navigate('/users');
        return { error: null, fieldErrors: {} };
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'response' in err) {
          const axiosError = err as {
            response?: { status?: number; data?: { error?: string; details?: Record<string, string> } };
          };
          if (axiosError.response?.status === 409) {
            return {
              error: axiosError.response.data?.error || 'A user with this email already exists.',
              fieldErrors: {},
            };
          } else if (axiosError.response?.status === 400) {
            const details = axiosError.response.data?.details;
            const detailErrors: FormState['fieldErrors'] = {};
            if (details) {
              if (details.name) detailErrors.name = details.name;
              if (details.email) detailErrors.email = details.email;
              if (details.password) detailErrors.password = details.password;
              if (details.role) detailErrors.role = details.role;
            }
            return {
              error: axiosError.response.data?.error || 'Validation failed. Please check your input.',
              fieldErrors: detailErrors,
            };
          }
          return {
            error: axiosError.response?.data?.error || 'An unexpected error occurred. Please try again.',
            fieldErrors: {},
          };
        }
        return { error: 'Service unavailable. Please try again later.', fieldErrors: {} };
      }
    },
    { error: null, fieldErrors: {} }
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            to="/users"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Users
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create User</h1>

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
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                state.fieldErrors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Full name"
              maxLength={100}
            />
            <div className="flex justify-between mt-1">
              {state.fieldErrors.name && (
                <p className="text-red-600 text-xs">{state.fieldErrors.name}</p>
              )}
              <p className="text-gray-500 text-xs ml-auto">{name.length}/100</p>
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                state.fieldErrors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="user@example.com"
            />
            {state.fieldErrors.email && (
              <p className="text-red-600 text-xs mt-1">{state.fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                state.fieldErrors.password ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Minimum 6 characters"
            />
            {state.fieldErrors.password && (
              <p className="text-red-600 text-xs mt-1">{state.fieldErrors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole | '')}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                state.fieldErrors.role ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select role</option>
              <option value="admin">Admin</option>
              <option value="agent">Agent</option>
            </select>
            {state.fieldErrors.role && (
              <p className="text-red-600 text-xs mt-1">{state.fieldErrors.role}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Creating...' : 'Create User'}
            </button>
            <Link
              to="/users"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
