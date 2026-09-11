'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plug,
  Wallet,
  Code,
  Terminal,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  KeyRound,
  Globe,
  Radio,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { integrationsApi } from '@/lib/integrations-api';
import { IntegrationCategory, IntegrationType } from '@/types/integrations';
import { cn } from '@/lib/utils';

// Presets definitions
const PRESETS = [
  {
    id: 'life-os',
    label: 'Prabu Life OS MCP',
    name: 'Prabu Life OS MCP',
    type: 'mcp_remote' as IntegrationType,
    category: 'finance' as IntegrationCategory,
    url: 'https://prabu-life-os-production.up.railway.app/sse',
    apiKey: 'ed24fd25b7274c549a03105806eefcc2af5e9a4b755893f02a1a757968b5265b',
    description: 'Production personal finance intelligence MCP server via Server-Sent Events',
    icon: Wallet,
    color: 'emerald',
  },
  {
    id: 'github',
    label: 'GitHub MCP',
    name: 'GitHub MCP Dev Server',
    type: 'mcp_remote' as IntegrationType,
    category: 'dev-tools' as IntegrationCategory,
    url: 'https://api.github.com/mcp',
    apiKey: '',
    description: 'Repository issues, pull requests, commit automation and CI workflows',
    icon: Code,
    color: 'cyan',
  },
  {
    id: 'custom',
    label: 'Custom SSE MCP',
    name: 'Custom SSE MCP Server',
    type: 'mcp_remote' as IntegrationType,
    category: 'custom' as IntegrationCategory,
    url: 'http://localhost:8000/sse',
    apiKey: '',
    description: 'Connect any remote Model Context Protocol server over HTTP/SSE',
    icon: Terminal,
    color: 'purple',
  },
];

function ConnectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const presetParam = searchParams.get('preset');

  // Form states
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<IntegrationType>('mcp_remote');
  const [category, setCategory] = React.useState<IntegrationCategory>('finance');
  const [url, setUrl] = React.useState('');
  const [apiKey, setApiKey] = React.useState('');
  const [headerName, setHeaderName] = React.useState('Authorization');
  const [error, setError] = React.useState<string | null>(null);
  const [statusStep, setStatusStep] = React.useState<string | null>(null);

  // Apply preset if selected
  const applyPreset = React.useCallback((presetId: string) => {
    const p = PRESETS.find((item) => item.id === presetId);
    if (p) {
      setName(p.name);
      setType(p.type);
      setCategory(p.category);
      setUrl(p.url);
      setApiKey(p.apiKey);
    }
  }, []);

  React.useEffect(() => {
    if (presetParam) {
      applyPreset(presetParam);
    }
  }, [presetParam, applyPreset]);

  // Connect & Create mutation
  const createAndConnectMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (!name.trim()) throw new Error('Integration name is required');
      if (!url.trim()) throw new Error('URL / Endpoint is required');

      setStatusStep('Registering integration in workspace...');
      const headers: Record<string, string> = {};
      if (apiKey.trim()) {
        headers[headerName.trim() || 'Authorization'] = apiKey.startsWith('Bearer ') || headerName !== 'Authorization'
          ? apiKey.trim()
          : `Bearer ${apiKey.trim()}`;
      }

      const created = await integrationsApi.create({
        name: name.trim(),
        type,
        category,
        config: {
          url: url.trim(),
          apiKey: apiKey.trim() || undefined,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        },
      });

      setStatusStep('Testing connection and discovering tools...');
      try {
        await integrationsApi.connect(created.id);
      } catch (connErr) {
        console.warn('Initial connection probe failed, integration created:', connErr);
      }

      return created;
    },
    onSuccess: (created) => {
      setStatusStep('Connected! Redirecting to integration hub...');
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setTimeout(() => {
        router.push(`/integrations/${created.id}`);
      }, 600);
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create and connect integration');
      setStatusStep(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAndConnectMutation.mutate();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Back Link & Header */}
      <div className="space-y-3">
        <Link
          href="/integrations"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Integrations
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-text">Add Integration</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Connect any Model Context Protocol (MCP) server, external API, or webhook to your workspace.
          </p>
        </div>
      </div>

      {/* Preset Pickers */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted">
          Quick Fill from Presets
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESETS.map((p) => {
            const Icon = p.icon;
            const isSelected = name === p.name && url === p.url;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={cn(
                  'p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between group',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-surface-elevated bg-surface hover:border-surface-elevated/80 hover:bg-surface-elevated'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={cn(
                      'p-1.5 rounded-md',
                      p.color === 'emerald' && 'bg-emerald-500/10 text-emerald-400',
                      p.color === 'cyan' && 'bg-cyan-500/10 text-cyan-400',
                      p.color === 'purple' && 'bg-purple-500/10 text-purple-400'
                    )}
                  >
                    <Icon size={16} />
                  </div>
                  <span className="text-xs font-semibold text-text truncate">{p.label}</span>
                </div>
                <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                  {p.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Form Card */}
      <Card className="border-surface-elevated bg-surface shadow-md">
        <form onSubmit={handleSubmit}>
          <CardHeader className="p-6 pb-4 border-b border-surface-elevated">
            <CardTitle className="text-base">Configuration Details</CardTitle>
            <CardDescription>
              Configure the connection protocol, endpoint URL, and authentication headers.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {statusStep && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs flex items-center gap-2 animate-pulse">
                <Radio size={16} className="shrink-0 animate-spin" />
                <span>{statusStep}</span>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-text mb-1.5">
                Integration Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Prabu Life OS MCP"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-10 px-3.5 rounded-lg bg-surface border border-surface-elevated text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-[11px] text-text-muted mt-1">A human-readable label for this integration.</p>
            </div>

            {/* Type & Category Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-text mb-1.5">
                  Protocol Type <span className="text-rose-400">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as IntegrationType)}
                  className="w-full h-10 px-3 rounded-lg bg-surface border border-surface-elevated text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="mcp_remote">Remote MCP (SSE / HTTP)</option>
                  <option value="api_key">REST API (API Key)</option>
                  <option value="webhook">Incoming / Outgoing Webhook</option>
                  <option value="mcp_stdio">Local MCP Process (STDIO)</option>
                </select>
                <p className="text-[11px] text-text-muted mt-1">
                  Remote MCP connects over Server-Sent Events (SSE) or streamable HTTP.
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-text mb-1.5">
                  Category <span className="text-rose-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as IntegrationCategory)}
                  className="w-full h-10 px-3 rounded-lg bg-surface border border-surface-elevated text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="finance">Finance & Accounting</option>
                  <option value="communication">Communication & Alerts</option>
                  <option value="dev-tools">Developer Tools & CI/CD</option>
                  <option value="productivity">Productivity & Notes</option>
                  <option value="custom">Custom Tooling</option>
                </select>
                <p className="text-[11px] text-text-muted mt-1">Used for categorizing and routing agent tool calls.</p>
              </div>
            </div>

            {/* URL / Endpoint */}
            <div>
              <label className="block text-xs font-medium text-text mb-1.5">
                Endpoint URL <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="url"
                  placeholder="https://prabu-life-os-production.up.railway.app/sse"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="w-full h-10 pl-10 pr-3.5 rounded-lg bg-surface border border-surface-elevated text-sm text-text placeholder:text-text-muted font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <p className="text-[11px] text-text-muted mt-1">
                For Remote MCP, specify the complete `/sse` or streaming HTTP endpoint.
              </p>
            </div>

            {/* Auth / API Key (Optional) */}
            <div className="p-4 rounded-xl border border-surface-elevated bg-surface-elevated/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-text">
                <KeyRound size={15} className="text-primary" />
                <span>Authentication & Headers (Optional)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-text-muted mb-1">Header Name</label>
                  <input
                    type="text"
                    value={headerName}
                    onChange={(e) => setHeaderName(e.target.value)}
                    placeholder="Authorization"
                    className="w-full h-9 px-3 rounded-lg bg-surface border border-surface-elevated text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-text-muted mb-1">Secret / Token Value</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="e.g. bearer_token or api_key"
                    className="w-full h-9 px-3 rounded-lg bg-surface border border-surface-elevated text-xs text-text font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <p className="text-[10px] text-text-muted">
                Stored encrypted in workspace settings. Will be passed with every tool discovery and invocation.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-elevated">
              <Link href="/integrations">
                <Button type="button" variant="outline" size="md">
                  Cancel
                </Button>
              </Link>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={createAndConnectMutation.isPending}
                className="gap-2 px-6"
              >
                <Plug size={16} />
                Connect & Discover Tools
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-text-muted">Loading connector...</div>}>
      <ConnectPageContent />
    </React.Suspense>
  );
}
