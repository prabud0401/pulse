import { apiClient } from './api-client';

export interface User {
  id: string;
  name: string;
  email: string;
}

export const auth = {
  login: async (email: string, password: string):Promise<{token: string, user: User}> => {
    // Placeholder implementation for UI
    return new Promise(resolve => setTimeout(() => resolve({ token: 'mock-token', user: { id: '1', name: 'John Doe', email } }), 1000));
    // return apiClient.post('/auth/login', { email, password });
  },
  register: async (name: string, email: string, password: string):Promise<{token: string, user: User}> => {
    return new Promise(resolve => setTimeout(() => resolve({ token: 'mock-token', user: { id: '1', name, email } }), 1000));
    // return apiClient.post('/auth/register', { name, email, password });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pulse_token');
    }
  },
  getMe: async (): Promise<User> => {
    return new Promise(resolve => setTimeout(() => resolve({ id: '1', name: 'John Doe', email: 'john@example.com' }), 500));
    // return apiClient.get<User>('/auth/me');
  }
};
