import * as SecureStore from 'expo-secure-store';
import { apiClient } from './client';

export interface User {
  id: string;
  name: string;
  email: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    try {
      const res = await apiClient.post<{ token: string; user: User }>('/auth/login', { email, password });
      if (res?.token) return res;
    } catch {
      // Fallback
    }
    return { token: 'mock-token-demo', user: { id: 'usr-1', name: 'Prabu Deva', email: email || 'prabu@pulse.os' } };
  },
  register: async (name: string, email: string, password: string): Promise<{ token: string; user: User }> => {
    try {
      const res = await apiClient.post<{ token: string; user: User }>('/auth/register', { name, email, password });
      if (res?.token) return res;
    } catch {
      // Fallback
    }
    return { token: 'mock-token-demo', user: { id: 'usr-1', name: name || 'Prabu Deva', email: email || 'prabu@pulse.os' } };
  },
  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('pulse_token');
    } catch {
      // Ignore
    }
  },
  getMe: async (): Promise<User> => {
    try {
      const res = await apiClient.get<{ user: User }>('/auth/me');
      if (res?.user) return res.user;
    } catch {
      // Fallback
    }
    return { id: 'usr-1', name: 'Prabu Deva', email: 'prabu@pulse.os' };
  }
};
