'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/ui/sidebar';
import { Avatar } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-bg flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 border-b border-surface-elevated bg-surface">
          <div className="font-medium text-text">Workspace</div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Avatar fallback={user?.name?.[0]?.toUpperCase() || 'U'} />
          </div>
        </header>
        
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
