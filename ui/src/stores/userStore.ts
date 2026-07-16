import { create } from 'zustand';
import apiClient from '../api/client';
import type { UserListDTO, CreateUserRequest, UpdateUserRequest } from '../types';

export interface UserState {
  users: UserListDTO[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  createUser: (data: CreateUserRequest) => Promise<void>;
  updateUser: (id: string, data: UpdateUserRequest) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<UserListDTO[]>('/users');
      set({ users: response.data, isLoading: false });
    } catch (error: unknown) {
      const message = extractErrorMessage(error);
      set({ error: message, isLoading: false });
    }
  },

  createUser: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post<UserListDTO>('/users', data);
      set({ isLoading: false });
    } catch (error: unknown) {
      const message = extractErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updateUser: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.patch<UserListDTO>(`/users/${id}`, data);
      set((state) => ({
        users: state.users.map((u) =>
          u.id === id ? { ...u, ...response.data } : u
        ),
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message = extractErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  deleteUser: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/users/${id}`);
      set((state) => ({
        users: state.users.filter((u) => u.id !== id),
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message = extractErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },
}));

function extractErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const axiosError = error as { response?: { data?: { error?: string } } };
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error;
    }
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  ) {
    return (error as { message: string }).message;
  }
  return 'An unexpected error occurred';
}
