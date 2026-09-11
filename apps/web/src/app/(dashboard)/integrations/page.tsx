'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plug,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Power,
  PowerOff,
  Wallet,
  Code,
  MessageSquare,
  Sparkles,
  Layers,
  Terminal,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { integrationsApi } from '@/lib/integrations-api';
import { Integration, IntegrationCategory, IntegrationStatus, IntegrationType } from '@/types/integrations';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | 'connected' | 'disconnected' | 'mcp_remote' | 'dev-tools' | 'finance' | 'communication';

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  // Fetch integrations list
  const { data: integrations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.list(),
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.connect(id),
    onMutate: (id) => setActionLoadingId(id),
    onSettled: () => {
      setActionLoadingId(null);
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.disconnect(id),
    onMutate: (id) => setActionLoadingId(id),
    onSettled: () => {
      setActionLoadingId(null);
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  const handleToggleConnection = async (integration: Integration, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (integration.status === 'connected') {
      disconnectMutation.mutate(integration.id);
    } else {
      connectMutation.mutate(integration.id);
    }
  };

  // Filter integrations
  const filteredIntegrations = React.useMemo(() => {
    return integrations.filter((item) => {
      // Search matching
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Tab filter
      switch (activeTab) {
        case 'connected':
          return item.status === 'connected';
        case 'disconnected':
          return item.status === 'disconnected';
        case 'mcp_remote':
          return item.type === 'mcp_remote';
        case 'dev-tools':
          return item.category === 'dev-tools';
        case 'finance':
          return item.category === 'finance';
        case 'communication':
          return item.category === 'communication';
        case 'all':
        default:
          return true;
      }
    });
  }, [integrations, activeTab, searchQuery]);

  // Summary counts
  const totalCount = integrations.length;
  const connectedCount = integrations.filter((i) => i.status === 'connected').length;
  const totalTools = integrations.reduce((acc, i) => acc + (i.tools?.length || 0), 0);

  const getCategoryIcon = (category: IntegrationCategory) => {
    switch (category) {
      case 'finance':
        return <Wallet size={16} className="text-emerald-400" />;
      case 'dev-tools':
        return <Code size={16} className="text-cyan-400" />;
      case 'communication':
        return <MessageSquare size={16} className="text-purple-400" />;
      case 'productivity':
        return <Sparkles size={16} className="text-amber-400" />;
      default:
        return <Layers size={16} className="text-primary" />;
    }
  };

  const getStatusBadge = (status: IntegrationStatus) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Error
          </span>
        );
      case 'disconnected':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Disconnected
          </span>
        );
    }
  };

  const formatType = (type: IntegrationType) => {
    switch (type) {
      case 'mcp_remote':
        return 'Remote MCP';
      case 'mcp_stdio':
        return 'Local STDIO';
      case 'api_key':
        return 'API Key';
      case 'webhook':
        return 'Webhook';
      case 'oauth':
        return 'OAuth 2.0';
      default:
        return type;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-elevated pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Plug size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text">Integrations & MCP Hub</h1>
              <p className="text-sm text-text-muted mt-0.5">
                Connect any MCP server, APIs, or tools to power your workspace
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-text-muted hover:text-text"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span className="ml-1.5 hidden sm:inline">Refresh</span>
          </Button>

          <Link href="/integrations/connect">
            <Button variant="primary" size="sm" className="gap-1.5">
              <Plus size={16} />
              Add Integration
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-surface/60 border-surface-elevated">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-text-muted">Total Integrations</p>
              <p className="text-2xl font-bold text-text mt-1">{totalCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-elevated text-primary">
              <Layers size={22} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface/60 border-surface-elevated">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-text-muted">Active Connections</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{connectedCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity size={22} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface/60 border-surface-elevated">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-text-muted">Discovered Tools</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">{totalTools}</p>
            </div>
            <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Terminal size={22} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'connected', label: 'Connected' },
              { id: 'disconnected', label: 'Disconnected' },
              { id: 'mcp_remote', label: 'MCP Remote' },
              { id: 'dev-tools', label: 'Dev Tools' },
              { id: 'finance', label: 'Finance' },
              { id: 'communication', label: 'Communication' },
            ] as { id: FilterTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border',
                activeTab === tab.id
                  ? 'bg-primary text-black font-semibold border-primary'
                  : 'bg-surface border-surface-elevated text-text-muted hover:text-text hover:bg-surface-elevated'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface border border-surface-elevated text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Integrations Grid or Empty State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="h-56 animate-pulse bg-surface/50 border-surface-elevated">
              <CardContent className="p-6 space-y-4">
                <div className="h-4 bg-surface-elevated rounded w-1/3" />
                <div className="h-6 bg-surface-elevated rounded w-2/3" />
                <div className="h-4 bg-surface-elevated rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredIntegrations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-elevated bg-surface/40 p-8 sm:p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-4">
            <Plug size={28} />
          </div>
          <h3 className="text-lg font-semibold text-text">No Integrations Found</h3>
          <p className="text-sm text-text-muted max-w-md mx-auto mt-1 mb-8">
            {searchQuery
              ? `No integrations match your search query "${searchQuery}".`
              : 'Connect external Model Context Protocol (MCP) servers, webhooks, or APIs to automate your workflow.'}
          </p>

          <div className="text-xs uppercase tracking-wider font-semibold text-text-muted mb-4">
            Quick Start Presets
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
            <Link
              href="/integrations/connect?preset=life-os"
              className="group p-4 rounded-xl border border-surface-elevated bg-surface hover:border-primary/40 hover:bg-surface-elevated transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Wallet size={18} />
                </div>
                <ArrowRight size={14} className="text-text-muted group-hover:text-primary transition-colors" />
              </div>
              <h4 className="text-sm font-semibold text-text">Prabu Life OS MCP</h4>
              <p className="text-xs text-text-muted mt-1">Connect personal finance, salary insights & ledger intelligence via SSE.</p>
            </Link>

            <Link
              href="/integrations/connect?preset=github"
              className="group p-4 rounded-xl border border-surface-elevated bg-surface hover:border-primary/40 hover:bg-surface-elevated transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Code size={18} />
                </div>
                <ArrowRight size={14} className="text-text-muted group-hover:text-primary transition-colors" />
              </div>
              <h4 className="text-sm font-semibold text-text">GitHub MCP</h4>
              <p className="text-xs text-text-muted mt-1">Issue tracking, pull requests, repository automation and actions.</p>
            </Link>

            <Link
              href="/integrations/connect?preset=custom"
              className="group p-4 rounded-xl border border-surface-elevated bg-surface hover:border-primary/40 hover:bg-surface-elevated transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Terminal size={18} />
                </div>
                <ArrowRight size={14} className="text-text-muted group-hover:text-primary transition-colors" />
              </div>
              <h4 className="text-sm font-semibold text-text">Custom SSE MCP</h4>
              <p className="text-xs text-text-muted mt-1">Plug into any standard HTTP / Server-Sent Events MCP endpoint.</p>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredIntegrations.map((integration) => {
            const isConnecting = actionLoadingId === integration.id;
            const toolCount = integration.tools?.length ?? 0;

            return (
              <Card
                key={integration.id}
                className="group relative flex flex-col justify-between border-surface-elevated bg-surface hover:border-primary/40 hover:shadow-lg transition-all"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-surface-elevated border border-surface-elevated/80">
                        {getCategoryIcon(integration.category)}
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold text-text truncate max-w-[180px]">
                          {integration.name}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[11px] px-2 py-0.5 rounded bg-surface-elevated text-text-muted font-medium">
                            {formatType(integration.type)}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-surface-elevated text-text-muted capitalize">
                            {integration.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>{getStatusBadge(integration.status)}</div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-2 flex-1 flex flex-col justify-between">
                  <div className="py-2 border-y border-surface-elevated/60 my-2 text-xs text-text-muted space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span>Discovered Tools:</span>
                      <span className="font-semibold text-text">
                        {toolCount > 0 ? `${toolCount} tools available` : '0 tools discovered'}
                      </span>
                    </div>

                    {integration.config?.url && (
                      <div className="flex items-center justify-between truncate">
                        <span>Endpoint:</span>
                        <span className="font-mono text-[11px] text-text-muted truncate max-w-[170px]" title={integration.config.url as string}>
                          {integration.config.url as string}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span>Health Check:</span>
                      <span className="text-text-muted">
                        {integration.lastHealthCheck
                          ? new Date(integration.lastHealthCheck).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : 'Never'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant={integration.status === 'connected' ? 'outline' : 'primary'}
                      size="sm"
                      isLoading={isConnecting}
                      onClick={(e) => handleToggleConnection(integration, e)}
                      className="flex-1 gap-1 text-xs h-8"
                    >
                      {integration.status === 'connected' ? (
                        <>
                          <PowerOff size={13} className="text-rose-400" />
                          Disconnect
                        </>
                      ) : (
                        <>
                          <Power size={13} />
                          Connect
                        </>
                      )}
                    </Button>

                    <Link href={`/integrations/${integration.id}`} className="flex-1">
                      <Button variant="default" size="sm" className="w-full text-xs h-8 gap-1">
                        View & Test
                        <ArrowRight size={12} />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
