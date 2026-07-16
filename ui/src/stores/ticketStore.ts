import { create } from 'zustand';
import apiClient from '../api/client';
import type {
  TicketDTO,
  TicketDetailDTO,
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketStatus,
} from '../types';

export interface TicketState {
  tickets: TicketDTO[];
  currentTicket: TicketDetailDTO | null;
  isLoading: boolean;
  error: string | null;
  fetchTickets: (params?: { search?: string; status?: string }) => Promise<void>;
  fetchTicket: (id: string) => Promise<void>;
  createTicket: (data: CreateTicketRequest) => Promise<void>;
  updateTicket: (id: string, data: UpdateTicketRequest) => Promise<void>;
  transitionStatus: (id: string, status: TicketStatus) => Promise<void>;
  addComment: (ticketId: string, message: string) => Promise<void>;
}

export const useTicketStore = create<TicketState>((set) => ({
  tickets: [],
  currentTicket: null,
  isLoading: false,
  error: null,

  fetchTickets: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.set('search', params.search);
      if (params?.status) queryParams.set('status', params.status);

      const query = queryParams.toString();
      const url = query ? `/tickets?${query}` : '/tickets';
      const response = await apiClient.get<TicketDTO[]>(url);
      set({ tickets: response.data, isLoading: false });
    } catch (error: unknown) {
      const message = extractErrorMessage(error);
      set({ error: message, isLoading: false });
    }
  },

  fetchTicket: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<TicketDetailDTO>(`/tickets/${id}`);
      set({ currentTicket: response.data, isLoading: false });
    } catch (error: unknown) {
      const message = extractErrorMessage(error);
      set({ error: message, isLoading: false });
    }
  },

  createTicket: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post<TicketDTO>('/tickets', data);
      set({ isLoading: false });
    } catch (error: unknown) {
      const message = extractErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  updateTicket: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.patch<TicketDTO>(`/tickets/${id}`, data);
      set((state) => ({
        currentTicket: state.currentTicket
          ? { ...state.currentTicket, ...response.data }
          : null,
        tickets: state.tickets.map((t) =>
          t.id === id ? { ...t, ...response.data } : t
        ),
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message = extractErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  transitionStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.patch<TicketDTO>(`/tickets/${id}/status`, { status });
      set((state) => ({
        currentTicket: state.currentTicket
          ? { ...state.currentTicket, ...response.data }
          : null,
        tickets: state.tickets.map((t) =>
          t.id === id ? { ...t, ...response.data } : t
        ),
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message = extractErrorMessage(error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  addComment: async (ticketId, message) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post(`/tickets/${ticketId}/comments`, { message });
      set((state) => ({
        currentTicket: state.currentTicket
          ? {
              ...state.currentTicket,
              comments: [...state.currentTicket.comments, response.data],
            }
          : null,
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
