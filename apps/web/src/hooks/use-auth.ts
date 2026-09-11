import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auth, User } from '@/lib/auth';

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: auth.getMe,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => auth.login(email, password),
    onSuccess: (data) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pulse_token', data.token);
      }
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: ({ name, email, password }: { name: string; email: string; password: string }) => auth.register(name, email, password),
    onSuccess: (data) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pulse_token', data.token);
      }
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });

  const logout = () => {
    auth.logout();
    queryClient.setQueryData(['auth', 'me'], null);
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    logout,
  };
}
