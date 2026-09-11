'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network, Wallet, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text mb-2">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-text-muted">Here's what's happening with your accounts today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-text-muted">Total Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-text-muted">Tasks Due Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-text-muted">Active Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card className="flex flex-col h-full border-dashed">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Network className="text-primary" size={24} />
            </div>
            <CardTitle>Connect an Integration</CardTitle>
            <CardDescription>Link your banks, tools, or apps</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-end justify-center pt-4">
            <Button variant="outline" className="w-full">Setup Integration</Button>
          </CardContent>
        </Card>
        
        <Card className="flex flex-col h-full border-dashed">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Wallet className="text-primary" size={24} />
            </div>
            <CardTitle>Set up Finance Tracking</CardTitle>
            <CardDescription>Create budgets and track expenses</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-end justify-center pt-4">
            <Button variant="outline" className="w-full">Go to Finance</Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full border-dashed">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="text-primary" size={24} />
            </div>
            <CardTitle>Try the AI Assistant</CardTitle>
            <CardDescription>Ask questions about your data</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex items-end justify-center pt-4">
            <Button variant="outline" className="w-full">Open Assistant</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
