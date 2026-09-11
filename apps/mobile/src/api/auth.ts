import * as SecureStore from 'expo-secure-store';
// import { apiClient } from './client';

export interface User {
  id: string;
  name: string;
  email: string;
}

export const authApi = {
  login: async (email: string, password: string):Promise<{token: string, user: User}> => {
    // return apiClient.post('/auth/login', { email, password });
    return new Promise(resolve => setTimeout(() => resolve({ token: 'mock-token', user: { id: '1', name: 'John Doe', email } }), 1000));
  },
  register: async (name: string, email: string, password: string):Promise<{token: string, user: User}> => {
    // return apiClient.post('/auth/register', { name, email, password });
    return new Promise(resolve => setTimeout(() => resolve({ token: 'mock-token', user: { id: '1', name, email } }), 1000));
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('pulse_token');
  },
  getMe: async (): Promise<User> => {
    // return apiClient.get<User>('/auth/me');
    return new Promise(resolve => setTimeout(() => resolve({ id: '1', name: 'John Doe', email: 'john@example.com' }), 500));
  }
};
