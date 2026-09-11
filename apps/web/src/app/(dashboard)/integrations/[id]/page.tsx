'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plug,
  ArrowLeft,
  RefreshCw,
  Power,
  PowerOff,
  Terminal,
  Activity,
  Settings,
  Play,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Clock,
  Code2,
  Trash2,
  AlertTriangle,
  FileCode,
  Layers,
  Globe,
  Wallet,
  Code,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { integrationsApi } from '@/lib/integrations-api';
import {
  Integration,
  IntegrationTool,
  ToolInvocation,
  ToolInvocationResult,
  IntegrationCategory,
  IntegrationStatus,
} from '@/types/integrations';
import { cn } from '@/lib/utils';

type ActiveTab = 'tools' | 'logs' | 'settings';

export default function IntegrationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = (params?.id as string) || '';

  const [activeTab, setActiveTab] = React.useState<ActiveTab>('tools');
  const [toolsSearch, setToolsSearch] = React.useState('');
  const [selectedToolForTest, setSelectedToolForTest] = React.useState<IntegrationTool | null>(null);

  // Settings form states
  const [editName, setEditName] = React.useState('');
  const [editUrl, setEditUrl] = React.useState('');
  const [editCategory, setEditCategory] = React.useState<IntegrationCategory>('finance');
  const [editApiKey, setEditApiKey] = React.useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  // Expanded log payload row IDs
  const [expandedLogIds, setExpandedLogIds] = React.useState<Record<string, boolean>>({});

  // Fetch integration details with tools
  const {
    data: integration,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['integration', id],
    queryFn: () => integrationsApi.get(id),
    enabled: !!id,
  });

  // Fetch invocation logs
  const {
    data: logs = [],
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ['integration-logs', id],
    queryFn: () => integrationsApi.getLogs(id),
    enabled: !!id && activeTab === 'logs',
  });

  // Populate settings form when data loads
  React.useEffect(() => {
    if (integration) {
      setEditName(integration.name || '');
      setEditUrl((integration.config?.url as string) || '');
      setEditCategory(integration.category || 'custom');
      setEditApiKey((integration.config?.apiKey as string) || '');
    }
  }, [integration]);

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: () => integrationsApi.connect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration', id] });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: () => integrationsApi.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration', id] });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      return integrationsApi.update(id, {
        name: editName,
        category: editCategory,
        config: {
          url: editUrl,
          apiKey: editApiKey || undefined,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration', id] });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      alert('Integration settings saved successfully!');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => integrationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      router.push('/integrations');
    },
  });

  const toggleLogExpand = (logId: string) => {
    setExpandedLogIds((prev) => ({ ...prev, [logId]: !prev[logId] }));
  };

  const getStatusBadge = (status: IntegrationStatus) => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Connection Error
          </span>
        );
      case 'disconnected':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Disconnected
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center text-text-muted space-y-3">
        <RefreshCw size={24} className="animate-spin mx-auto text-primary" />
        <p className="text-sm">Loading integration details...</p>
      </div>
    );
  }

  if (error || !integration) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-lg font-semibold text-text">Integration Not Found</h2>
        <p className="text-sm text-text-muted">
          The requested integration does not exist or may have been removed.
        </p>
        <Link href="/integrations">
          <Button variant="outline" size="sm">
            Back to Integrations
          </Button>
        </Link>
      </div>
    );
  }

  const tools = integration.tools || [];
  const filteredTools = tools.filter(
    (t) =>
      t.name.toLowerCase().includes(toolsSearch.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(toolsSearch.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Link href="/integrations" className="hover:text-text transition-colors flex items-center gap-1">
          <ArrowLeft size={13} />
          Integrations
        </Link>
        <ChevronRight size={13} className="text-surface-elevated" />
        <span className="text-text font-medium truncate max-w-xs">{integration.name}</span>
      </div>

      {/* Top Banner & Status Header */}
      <Card className="border-surface-elevated bg-surface shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-text">{integration.name}</h1>
                {getStatusBadge(integration.status)}
                <Badge variant="default" className="text-xs uppercase tracking-wider font-mono">
                  {integration.type}
                </Badge>
                <Badge variant="info" className="text-xs capitalize">
                  {integration.category}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
                {integration.config?.url && (
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <Globe size={13} className="text-primary" />
                    <span>{integration.config.url as string}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <Clock size={13} />
                  <span>
                    Last Health Check:{' '}
                    {integration.lastHealthCheck
                      ? new Date(integration.lastHealthCheck).toLocaleString()
                      : 'Never'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Terminal size={13} />
                  <span>{tools.length} Tools Discovered</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-1.5 text-xs h-9"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </Button>

              {integration.status === 'connected' ? (
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={disconnectMutation.isPending}
                  onClick={() => disconnectMutation.mutate()}
                  className="gap-1.5 text-xs h-9 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                >
                  <PowerOff size={14} />
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={connectMutation.isPending}
                  onClick={() => connectMutation.mutate()}
                  className="gap-1.5 text-xs h-9"
                >
                  <Power size={14} />
                  Connect
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="border-b border-surface-elevated">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('tools')}
            className={cn(
              'pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2',
              activeTab === 'tools'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text hover:border-surface-elevated'
            )}
          >
            <Terminal size={16} />
            Tools
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-surface-elevated text-text">
              {tools.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={cn(
              'pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2',
              activeTab === 'logs'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text hover:border-surface-elevated'
            )}
          >
            <Activity size={16} />
            Invocation Logs
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2',
              activeTab === 'settings'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text hover:border-surface-elevated'
            )}
          >
            <Settings size={16} />
            Settings
          </button>
        </nav>
      </div>

      {/* TAB 1: TOOLS */}
      {activeTab === 'tools' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-text">Discovered MCP Tools & Functions</h2>
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Filter tools..."
                value={toolsSearch}
                onChange={(e) => setToolsSearch(e.target.value)}
                className="w-full h-8 px-3 rounded-lg bg-surface border border-surface-elevated text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {filteredTools.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-surface-elevated bg-surface/30">
              <Terminal size={32} className="mx-auto text-text-muted mb-2" />
              <p className="text-sm font-medium text-text">No Tools Discovered</p>
              <p className="text-xs text-text-muted max-w-sm mx-auto mt-1 mb-4">
                Make sure the MCP server is reachable, connected, and implements the standard MCP tools/list protocol.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => connectMutation.mutate()}
                isLoading={connectMutation.isPending}
                className="gap-1.5 text-xs"
              >
                <RefreshCw size={13} />
                Probe Server for Tools
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTools.map((tool) => (
                <Card
                  key={tool.id}
                  className="border-surface-elevated bg-surface hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="font-mono text-sm font-bold text-text bg-surface-elevated px-2 py-0.5 rounded inline-block text-primary">
                          {tool.name}
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                          {tool.description || 'No description provided by tool definition.'}
                        </p>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-elevated text-text-muted shrink-0">
                        {tool.usageCount || 0} runs
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-3">
                    {/* Input Schema Preview */}
                    <div className="rounded-lg bg-bg/80 border border-surface-elevated/60 p-2.5">
                      <div className="flex items-center justify-between text-[11px] text-text-muted mb-1.5 font-medium">
                        <span className="flex items-center gap-1 font-mono">
                          <Code2 size={12} />
                          inputSchema
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {tool.inputSchema?.properties
                            ? `${Object.keys(tool.inputSchema.properties).length} params`
                            : 'none'}
                        </span>
                      </div>
                      <pre className="text-[10px] font-mono text-text-muted max-h-24 overflow-y-auto scrollbar-none whitespace-pre-wrap leading-tight">
                        {tool.inputSchema ? JSON.stringify(tool.inputSchema, null, 2) : '{}'}
                      </pre>
                    </div>

                    {/* Test Button */}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedToolForTest(tool)}
                      className="w-full text-xs h-8 gap-1.5"
                    >
                      <Play size={12} className="fill-current" />
                      Run / Test Tool
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-text">Tool Invocation History</h2>
              <p className="text-xs text-text-muted">Recent executions, input parameters, and responses.</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchLogs()}
              className="gap-1.5 text-xs h-8"
            >
              <RefreshCw size={13} className={logsLoading ? 'animate-spin' : ''} />
              Refresh Logs
            </Button>
          </div>

          {logs.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-surface-elevated bg-surface/30">
              <Activity size={28} className="mx-auto text-text-muted mb-2" />
              <p className="text-sm font-medium text-text">No Invocations Yet</p>
              <p className="text-xs text-text-muted max-w-sm mx-auto mt-1 mb-4">
                Execute a tool from the Tools tab to inspect invocation latency, inputs, and payloads.
              </p>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('tools')} className="text-xs">
                Go to Tools
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-surface-elevated bg-surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-elevated/70 text-text-muted uppercase text-[10px] tracking-wider border-b border-surface-elevated">
                    <tr>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Tool Name</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-elevated text-text">
                    {logs.map((log) => {
                      const isExpanded = !!expandedLogIds[log.id];
                      return (
                        <React.Fragment key={log.id}>
                          <tr className="hover:bg-surface-elevated/30 transition-colors">
                            <td className="py-3 px-4 text-text-muted font-mono whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </td>
                            <td className="py-3 px-4 font-mono font-medium text-primary">
                              {log.toolName}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium uppercase',
                                  log.status === 'success' && 'bg-emerald-500/10 text-emerald-400',
                                  log.status === 'error' && 'bg-rose-500/10 text-rose-400',
                                  log.status === 'timeout' && 'bg-amber-500/10 text-amber-400'
                                )}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-text-muted">
                              {log.durationMs != null ? `${log.durationMs}ms` : '—'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => toggleLogExpand(log.id)}
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                              >
                                {isExpanded ? 'Hide Payload' : 'View Payload'}
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded JSON payload preview */}
                          {isExpanded && (
                            <tr className="bg-bg/60">
                              <td colSpan={5} className="p-4 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-[11px] font-semibold text-text-muted uppercase mb-1">
                                      Input Parameters
                                    </div>
                                    <pre className="p-3 rounded-lg bg-surface border border-surface-elevated text-[11px] font-mono text-text overflow-x-auto max-h-48 scrollbar-none">
                                      {JSON.stringify(log.input, null, 2)}
                                    </pre>
                                  </div>

                                  <div>
                                    <div className="text-[11px] font-semibold text-text-muted uppercase mb-1">
                                      Output Response
                                    </div>
                                    <pre className="p-3 rounded-lg bg-surface border border-surface-elevated text-[11px] font-mono text-text overflow-x-auto max-h-48 scrollbar-none">
                                      {JSON.stringify(log.output, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-2xl">
          <Card className="border-surface-elevated bg-surface">
            <CardHeader className="p-6 pb-4 border-b border-surface-elevated">
              <CardTitle className="text-base">Integration Settings</CardTitle>
              <CardDescription>
                Update endpoint parameters, name, or authentication credentials.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-surface border border-surface-elevated text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as IntegrationCategory)}
                  className="w-full h-9 px-3 rounded-lg bg-surface border border-surface-elevated text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="finance">Finance</option>
                  <option value="communication">Communication</option>
                  <option value="dev-tools">Dev Tools</option>
                  <option value="productivity">Productivity</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Endpoint URL</label>
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-surface border border-surface-elevated text-xs font-mono text-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  API Key / Secret Token
                </label>
                <input
                  type="password"
                  value={editApiKey}
                  onChange={(e) => setEditApiKey(e.target.value)}
                  placeholder="Leave empty to keep existing"
                  className="w-full h-9 px-3 rounded-lg bg-surface border border-surface-elevated text-xs font-mono text-text focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={updateMutation.isPending}
                  onClick={() => updateMutation.mutate()}
                  className="text-xs"
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-rose-500/30 bg-rose-500/5">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-base text-rose-400">Danger Zone</CardTitle>
              <CardDescription className="text-xs text-rose-400/80">
                Permanently delete this integration and remove all associated tools and invocation logs.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs gap-1.5 bg-rose-600 hover:bg-rose-700"
              >
                <Trash2 size={14} />
                Delete Integration
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TEST RUNNER MODAL / DRAWER */}
      {selectedToolForTest && (
        <ToolTestRunnerModal
          integrationId={id}
          tool={selectedToolForTest}
          isOpen={!!selectedToolForTest}
          onClose={() => setSelectedToolForTest(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['integration', id] });
            queryClient.invalidateQueries({ queryKey: ['integration-logs', id] });
          }}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Integration"
        description="This action cannot be undone."
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-text-muted">
            Are you sure you want to permanently delete <strong className="text-text">{integration.name}</strong>?
            All discovered tools and recorded logs will be deleted from your workspace.
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-elevated">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              className="text-xs bg-rose-600 hover:bg-rose-700"
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ----------------------------------------------------------------------
// Tool Test Runner Modal Component
// ----------------------------------------------------------------------
interface ToolTestRunnerModalProps {
  integrationId: string;
  tool: IntegrationTool;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function ToolTestRunnerModal({
  integrationId,
  tool,
  isOpen,
  onClose,
  onSuccess,
}: ToolTestRunnerModalProps) {
  const [mode, setMode] = React.useState<'form' | 'raw'>('form');
  const [formValues, setFormValues] = React.useState<Record<string, unknown>>({});
  const [rawJson, setRawJson] = React.useState('{}');
  const [copied, setCopied] = React.useState(false);

  const [executing, setExecuting] = React.useState(false);
  const [execResult, setExecResult] = React.useState<ToolInvocationResult | null>(null);
  const [execError, setExecError] = React.useState<string | null>(null);

  // Initialize form default values from tool input schema
  React.useEffect(() => {
    const props = (tool.inputSchema?.properties as Record<string, any>) || {};
    const initial: Record<string, unknown> = {};

    for (const key of Object.keys(props)) {
      const propDef = props[key];
      if (propDef.default !== undefined) {
        initial[key] = propDef.default;
      } else if (propDef.enum && propDef.enum.length > 0) {
        initial[key] = propDef.enum[0];
      } else if (propDef.type === 'number') {
        initial[key] = 0;
      } else if (propDef.type === 'boolean') {
        initial[key] = false;
      } else {
        // String defaults or sample values
        if (key.toLowerCase().includes('fromdate')) initial[key] = '2026-08-01';
        else if (key.toLowerCase().includes('todate')) initial[key] = '2026-09-01';
        else initial[key] = '';
      }
    }

    setFormValues(initial);
    setRawJson(JSON.stringify(initial, null, 2));
    setExecResult(null);
    setExecError(null);
  }, [tool]);

  const handleFormChange = (key: string, val: unknown) => {
    setFormValues((prev) => {
      const next = { ...prev, [key]: val };
      setRawJson(JSON.stringify(next, null, 2));
      return next;
    });
  };

  const handleRawChange = (val: string) => {
    setRawJson(val);
    try {
      const parsed = JSON.parse(val);
      setFormValues(parsed);
    } catch {
      // Ignore during typing
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    setExecError(null);
    setExecResult(null);

    let payload: Record<string, unknown> = {};
    if (mode === 'raw') {
      try {
        payload = JSON.parse(rawJson);
      } catch (err: any) {
        setExecError(`Invalid JSON payload: ${err.message}`);
        setExecuting(false);
        return;
      }
    } else {
      payload = formValues;
    }

    try {
      const result = await integrationsApi.invokeTool(integrationId, tool.name, payload);
      setExecResult(result);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setExecError(err.message || 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  const copyToClipboard = () => {
    if (!execResult?.output) return;
    navigator.clipboard.writeText(JSON.stringify(execResult.output, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const properties = (tool.inputSchema?.properties as Record<string, any>) || {};
  const requiredFields = (tool.inputSchema?.required as string[]) || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-primary" />
          <span>Test Runner: </span>
          <span className="font-mono text-primary text-base font-semibold">{tool.name}</span>
        </div>
      }
      description={tool.description || 'Invoke this tool directly through the MCP gateway.'}
    >
      <div className="space-y-5 pt-1">
        {/* Toggle form / raw */}
        <div className="flex items-center justify-between border-b border-surface-elevated pb-3">
          <div className="flex items-center gap-2 bg-surface-elevated p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('form')}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                mode === 'form' ? 'bg-surface text-text font-semibold shadow-sm' : 'text-text-muted hover:text-text'
              )}
            >
              Interactive Form
            </button>
            <button
              type="button"
              onClick={() => setMode('raw')}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                mode === 'raw' ? 'bg-surface text-text font-semibold shadow-sm' : 'text-text-muted hover:text-text'
              )}
            >
              Raw JSON
            </button>
          </div>

          <span className="text-[11px] text-text-muted font-mono">
            POST /api/integrations/:id/tools/{tool.name}/invoke
          </span>
        </div>

        {/* Input area */}
        {mode === 'form' ? (
          <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
            {Object.keys(properties).length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">
                This tool takes no required parameters. Click &quot;Execute Tool&quot; to run.
              </p>
            ) : (
              Object.entries(properties).map(([propKey, propDef]: [string, any]) => {
                const isRequired = requiredFields.includes(propKey);
                const currentValue = formValues[propKey];

                return (
                  <div key={propKey} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-text">
                        {propKey}{' '}
                        {isRequired && <span className="text-rose-400">*</span>}
                      </label>
                      <span className="text-[10px] text-text-muted font-mono">
                        {propDef.type || 'any'}
                      </span>
                    </div>

                    {propDef.description && (
                      <p className="text-[11px] text-text-muted">{propDef.description}</p>
                    )}

                    {propDef.enum ? (
                      <select
                        value={(currentValue as string) || ''}
                        onChange={(e) => handleFormChange(propKey, e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg bg-surface border border-surface-elevated text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {propDef.enum.map((opt: string) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : propDef.type === 'boolean' ? (
                      <select
                        value={String(currentValue ?? false)}
                        onChange={(e) => handleFormChange(propKey, e.target.value === 'true')}
                        className="w-full h-8 px-2.5 rounded-lg bg-surface border border-surface-elevated text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : (
                      <input
                        type={propDef.type === 'number' ? 'number' : 'text'}
                        value={(currentValue as string | number) ?? ''}
                        onChange={(e) =>
                          handleFormChange(
                            propKey,
                            propDef.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                          )
                        }
                        placeholder={propDef.default !== undefined ? String(propDef.default) : ''}
                        className="w-full h-8 px-3 rounded-lg bg-surface border border-surface-elevated text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div>
            <textarea
              rows={7}
              value={rawJson}
              onChange={(e) => handleRawChange(e.target.value)}
              className="w-full p-3 rounded-lg bg-bg border border-surface-elevated font-mono text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="{}"
            />
          </div>
        )}

        {/* Execute Action Button */}
        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={executing}
            onClick={handleExecute}
            className="gap-2 text-xs h-9 px-4"
          >
            <Play size={13} className="fill-current" />
            Execute Tool
          </Button>

          {execResult && (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[11px]">
                200 OK
              </span>
              <span className="text-text-muted font-mono text-[11px]">
                {execResult.durationMs}ms
              </span>
            </div>
          )}
        </div>

        {/* Error message */}
        {execError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
            {execError}
          </div>
        )}

        {/* Output Inspector */}
        {execResult && (
          <div className="space-y-1.5 pt-2 border-t border-surface-elevated">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text uppercase tracking-wider">
                Tool Output
              </span>
              <button
                type="button"
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-text transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
            </div>

            <pre className="p-3 rounded-lg bg-bg border border-surface-elevated text-xs font-mono text-emerald-400 max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed scrollbar-none">
              {JSON.stringify(execResult.output, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
}
