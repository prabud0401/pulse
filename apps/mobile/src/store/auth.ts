import { create } from 'zustand';
import { User, authApi } from '../api/auth';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null, token?: string | null) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user, token) => set({ user, token: token || null, isAuthenticated: !!user, isLoading: false }),
  logout: async () => {
    await authApi.logout();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },
  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('pulse_token');
      if (token) {
        const user = await authApi.getMe();
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  }
}));
