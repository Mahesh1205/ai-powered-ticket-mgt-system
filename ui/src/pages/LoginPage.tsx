import { useActionState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { AxiosError } from 'axios';
import type { ErrorResponse } from '../types';

type LoginState = { error: string | null };

export function LoginPage() {
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const [state, formAction, isPending] = useActionState(
    async (_prevState: LoginState, formData: FormData): Promise<LoginState> => {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      if (!email || !password) {
        return { error: 'Email and password are required.' };
      }

      try {
        await login(email, password);
        navigate('/tickets');
        return { error: null };
      } catch (err) {
        const axiosError = err as AxiosError<ErrorResponse>;
        if (axiosError.response?.data?.error) {
          return { error: axiosError.response.data.error };
        } else if (axiosError.request) {
          return { error: 'Service unavailable. Please try again later.' };
        }
        return { error: 'An unexpected error occurred.' };
      }
    },
    { error: null }
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>

        <form action={formAction} className="bg-white shadow-md rounded-lg p-8 space-y-6">
          {state.error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
            >
              {state.error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
