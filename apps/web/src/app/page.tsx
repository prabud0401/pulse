'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Wallet,
  Plug,
  Sparkles,
  CheckSquare,
  Zap,
  Terminal,
  ArrowRight,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between p-6 sm:p-12 selection:bg-primary/20">
      {/* Top Navigation */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-text">PULSE</span>
              <Badge variant="outline" className="text-[10px] border-primary/40 text-primary py-0 px-1.5">
                v1.0 LIVE
              </Badge>
            </div>
            <p className="text-xs text-text-muted">The Heartbeat of Life & Work</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="primary" size="sm" className="flex items-center gap-1.5 shadow-md shadow-primary/20">
              <span>Open Dashboard</span>
              <ArrowRight size={15} />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl w-full mx-auto my-auto py-12 flex flex-col items-center text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium">
          <ShieldCheck size={14} />
          <span>Multi-Tenant • Self-Hosted • 100% Open Source</span>
        </div>

        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-text leading-tight">
            The All-in-One <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-teal-300 to-emerald-400">Personal & Work OS</span>
          </h1>
          <p className="text-base sm:text-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
            Unify multi-bank finances, autonomous MCP server tools, multi-model AI reasoning, Kanban task workflows, and automated cron pipelines in one platform.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Button
            size="lg"
            variant="primary"
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-base px-8 h-12 shadow-lg shadow-primary/25"
          >
            <span>Launch Dashboard</span>
            <ArrowRight size={18} />
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push('/terminal')}
            className="flex items-center gap-2 text-base px-6 h-12 border-surface-elevated hover:border-primary/50"
          >
            <Terminal size={18} className="text-primary" />
            <span>Open Terminal</span>
          </Button>
        </div>

        {/* Live Modules Grid */}
        <div className="w-full pt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 text-left">
          <Link href="/dashboard" className="group">
            <Card className="p-4 bg-surface/60 border-surface-elevated hover:border-primary/50 transition-all hover:-translate-y-1">
              <Activity className="w-5 h-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-semibold text-text">Dashboard</div>
              <div className="text-[11px] text-text-muted mt-0.5">Widget Engine</div>
            </Card>
          </Link>

          <Link href="/finance" className="group">
            <Card className="p-4 bg-surface/60 border-surface-elevated hover:border-emerald-500/50 transition-all hover:-translate-y-1">
              <Wallet className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-semibold text-text">Finance</div>
              <div className="text-[11px] text-text-muted mt-0.5">Multi-Bank Ledger</div>
            </Card>
          </Link>

          <Link href="/integrations" className="group">
            <Card className="p-4 bg-surface/60 border-surface-elevated hover:border-violet-500/50 transition-all hover:-translate-y-1">
              <Plug className="w-5 h-5 text-violet-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-semibold text-text">MCP Hub</div>
              <div className="text-[11px] text-text-muted mt-0.5">32 Live Tools</div>
            </Card>
          </Link>

          <Link href="/assistant" className="group">
            <Card className="p-4 bg-surface/60 border-surface-elevated hover:border-amber-500/50 transition-all hover:-translate-y-1">
              <Sparkles className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-semibold text-text">AI Assistant</div>
              <div className="text-[11px] text-text-muted mt-0.5">Tool Calling</div>
            </Card>
          </Link>

          <Link href="/tasks" className="group">
            <Card className="p-4 bg-surface/60 border-surface-elevated hover:border-blue-500/50 transition-all hover:-translate-y-1">
              <CheckSquare className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-semibold text-text">Tasks</div>
              <div className="text-[11px] text-text-muted mt-0.5">Kanban Board</div>
            </Card>
          </Link>

          <Link href="/automations" className="group">
            <Card className="p-4 bg-surface/60 border-surface-elevated hover:border-rose-500/50 transition-all hover:-translate-y-1">
              <Zap className="w-5 h-5 text-rose-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-sm font-semibold text-text">Automations</div>
              <div className="text-[11px] text-text-muted mt-0.5">Cron & Events</div>
            </Card>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-surface-elevated flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted gap-2">
        <div>Pulse Platform © 2026. Built with Next.js 15, Drizzle ORM, Express & MCP.</div>
        <div className="flex items-center gap-4">
          <Link href="/terminal" className="hover:text-primary transition-colors flex items-center gap-1">
            <Terminal size={12} />
            <span>CLI Console</span>
          </Link>
          <Link href="/settings" className="hover:text-primary transition-colors">Settings</Link>
        </div>
      </footer>
    </div>
  );
}
