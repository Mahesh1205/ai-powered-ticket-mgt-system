import { create } from 'zustand';
import apiClient from '../api/client';
import type { UserDTO, LoginResponse } from '../types';

export interface AuthState {
  token: string | null;
  user: UserDTO | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: sessionStorage.getItem('token'),
  user: null,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', { email, password });
      const { token, user } = response.data;
      sessionStorage.setItem('token', token);
      set({ token, user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    sessionStorage.removeItem('token');
    set({ token: null, user: null });
    window.location.href = '/login';
  },

  restoreSession: async () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      set({ token: null, user: null, isLoading: false });
      return;
    }
    set({ isLoading: true });
    try {
      const response = await apiClient.get<UserDTO>('/auth/me');
      set({ token, user: response.data, isLoading: false });
    } catch {
      sessionStorage.removeItem('token');
      set({ token: null, user: null, isLoading: false });
    }
  },
}));
