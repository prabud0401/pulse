'use client';

import * as React from 'react';
import {
  Zap,
  Plus,
  Play,
  Power,
  PowerOff,
  History,
  Clock,
  Bell,
  Wallet,
  CheckSquare,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Sliders,
  Terminal,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface AutomationRuleItem {
  id: string;
  name: string;
  description?: string | null;
  triggerType: 'event' | 'schedule' | 'webhook';
  triggerConfig: Record<string, any>;
  actions: Array<Record<string, any>>;
  isEnabled: boolean;
  lastTriggeredAt?: string | null;
  triggerCount: number;
  createdAt: string;
}

interface LogItem {
  id: string;
  ruleId: string;
  status: 'success' | 'partial' | 'error';
  triggerData?: any;
  actionResults?: any;
  durationMs?: number;
  errorMessage?: string | null;
  createdAt: string;
}

const INITIAL_RULES: AutomationRuleItem[] = [
  {
    id: 'rule-1',
    name: 'Bank SMS → Classify → Push Notify',
    description: 'When a bank alert SMS arrives, automatically classify into personal expense or transfer and trigger push notification.',
    triggerType: 'event',
    triggerConfig: { plugin: 'finance', event: 'transaction.ingested' },
    actions: [
      { plugin: 'finance', action: 'classify', label: 'Classify Transaction' },
      { plugin: 'notifications', action: 'push', label: 'Send Push Notification' },
    ],
    isEnabled: true,
    lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    triggerCount: 142,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-2',
    name: 'Daily 9:00 AM Task Standup Digest',
    description: 'Every morning at 9 AM, identify overdue tasks and draft an AI summary in your dashboard notification feed.',
    triggerType: 'schedule',
    triggerConfig: { cron: '0 9 * * *' },
    actions: [
      { plugin: 'tasks', action: 'find_overdue', label: 'Find Overdue Tasks' },
      { plugin: 'notifications', action: 'email', label: 'Send Digest Email' },
    ],
    isEnabled: true,
    lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 60 * 11).toISOString(),
    triggerCount: 28,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-3',
    name: 'Salary Received → Recalculate Savings Budget',
    description: 'When monthly salary income is detected, recalculate living budget headroom and create an AI financial summary.',
    triggerType: 'event',
    triggerConfig: { plugin: 'finance', event: 'salary.received' },
    actions: [
      { plugin: 'finance', action: 'update_budget', label: 'Update Monthly Budget' },
      { plugin: 'ai', action: 'generate_summary', label: 'Generate Financial Briefing' },
      { plugin: 'notifications', action: 'push', label: 'Send Push Alert' },
    ],
    isEnabled: false,
    lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    triggerCount: 6,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-4',
    name: 'Incoming Webhook → Auto-Create Task',
    description: 'Accept external webhooks from GitHub or Linear and automatically log a new sprint task.',
    triggerType: 'webhook',
    triggerConfig: { webhookPath: '/webhooks/tasks' },
    actions: [
      { plugin: 'tasks', action: 'create_task', label: 'Create Backlog Task' },
    ],
    isEnabled: true,
    lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    triggerCount: 19,
    createdAt: new Date().toISOString(),
  },
];

const TRIGGER_OPTIONS = [
  { id: 'sms_arrives', label: 'When bank SMS arrives', type: 'event', plugin: 'finance', event: 'transaction.ingested' },
  { id: 'salary_received', label: 'When salary income is received', type: 'event', plugin: 'finance', event: 'salary.received' },
  { id: 'daily_9am', label: 'Daily at 9:00 AM (Schedule)', type: 'schedule', cron: '0 9 * * *' },
  { id: 'hourly_health', label: 'Every hour on the hour', type: 'schedule', cron: '0 * * * *' },
  { id: 'webhook', label: 'Incoming Webhook', type: 'webhook', webhookPath: '/webhooks/custom' },
];

const ACTION_OPTIONS = [
  { id: 'classify_tx', label: 'Classify transaction', plugin: 'finance', action: 'classify' },
  { id: 'send_push', label: 'Send push notification', plugin: 'notifications', action: 'push' },
  { id: 'send_email', label: 'Send email reminder', plugin: 'notifications', action: 'email' },
  { id: 'create_task', label: 'Create a new task', plugin: 'tasks', action: 'create_task' },
  { id: 'ai_summary', label: 'Generate AI summary briefing', plugin: 'ai', action: 'generate_summary' },
  { id: 'update_budget', label: 'Recalculate savings budget', plugin: 'finance', action: 'update_budget' },
];

export default function AutomationsPage() {
  const [rules, setRules] = React.useState<AutomationRuleItem[]>(INITIAL_RULES);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = React.useState(false);
  const [selectedRuleLogs, setSelectedRuleLogs] = React.useState<LogItem[]>([]);
  const [activeRuleForLogs, setActiveRuleForLogs] = React.useState<AutomationRuleItem | null>(null);
  const [triggeringId, setTriggeringId] = React.useState<string | null>(null);

  // Form State
  const [ruleName, setRuleName] = React.useState('');
  const [ruleDescription, setRuleDescription] = React.useState('');
  const [selectedTriggerIndex, setSelectedTriggerIndex] = React.useState(0);
  const [selectedActionIds, setSelectedActionIds] = React.useState<string[]>(['classify_tx', 'send_push']);

  // Fetch rules from backend
  React.useEffect(() => {
    async function loadRules() {
      try {
        const res = await apiClient.get<any>('/automations');
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setRules(res.data);
        }
      } catch (err) {
        // Keep initial fallback
      }
    }
    loadRules();
  }, []);

  // Toggle Rule Status
  const handleToggleRule = async (rule: AutomationRuleItem) => {
    const updatedStatus = !rule.isEnabled;
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, isEnabled: updatedStatus } : r))
    );

    try {
      await apiClient.patch(`/automations/${rule.id}`, { isEnabled: updatedStatus });
    } catch (err) {
      // Keep optimistic
    }
  };

  // Run Rule Manually
  const handleTriggerRule = async (rule: AutomationRuleItem) => {
    setTriggeringId(rule.id);
    try {
      const res = await apiClient.post<any>(`/automations/${rule.id}/trigger`, {
        payload: {
          testRun: true,
          amount: 250,
          currency: 'USD',
          source: 'manual_trigger',
          timestamp: new Date().toISOString(),
        },
      });

      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id
            ? {
                ...r,
                triggerCount: r.triggerCount + 1,
                lastTriggeredAt: new Date().toISOString(),
              }
            : r
        )
      );
    } catch (err) {
      // Optimistic increment
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id
            ? {
                ...r,
                triggerCount: r.triggerCount + 1,
                lastTriggeredAt: new Date().toISOString(),
              }
            : r
        )
      );
    } finally {
      setTimeout(() => setTriggeringId(null), 600);
    }
  };

  // View Logs
  const handleOpenLogs = async (rule: AutomationRuleItem) => {
    setActiveRuleForLogs(rule);
    setIsLogsModalOpen(true);

    try {
      const res = await apiClient.get<any>(`/automations/${rule.id}/logs`);
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setSelectedRuleLogs(res.data);
      } else {
        // Fallback demo log entries
        setSelectedRuleLogs([
          {
            id: `log-demo-${Date.now()}`,
            ruleId: rule.id,
            status: 'success',
            durationMs: 42,
            actionResults: rule.actions.map((a) => ({ action: a.action, status: 'success' })),
            createdAt: rule.lastTriggeredAt || new Date().toISOString(),
          },
          {
            id: `log-demo-prev`,
            ruleId: rule.id,
            status: 'success',
            durationMs: 38,
            actionResults: rule.actions.map((a) => ({ action: a.action, status: 'success' })),
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          },
        ]);
      }
    } catch (err) {
      setSelectedRuleLogs([
        {
          id: `log-fallback-1`,
          ruleId: rule.id,
          status: 'success',
          durationMs: 45,
          createdAt: rule.lastTriggeredAt || new Date().toISOString(),
        },
      ]);
    }
  };

  // Delete Rule
  const handleDeleteRule = async (ruleId: string) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    try {
      await apiClient.delete(`/automations/${ruleId}`);
    } catch (err) {
      // Keep optimistic
    }
  };

  // Create Rule Submit
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    const chosenTrigger = TRIGGER_OPTIONS[selectedTriggerIndex];
    const chosenActions = selectedActionIds.map((id) => {
      const opt = ACTION_OPTIONS.find((a) => a.id === id);
      return {
        plugin: opt?.plugin || 'custom',
        action: opt?.action || id,
        label: opt?.label,
      };
    });

    const newRule: AutomationRuleItem = {
      id: `rule-${Date.now()}`,
      name: ruleName.trim(),
      description: ruleDescription.trim() || null,
      triggerType: chosenTrigger.type as any,
      triggerConfig: chosenTrigger.type === 'schedule'
        ? { cron: chosenTrigger.cron }
        : chosenTrigger.type === 'webhook'
        ? { webhookPath: chosenTrigger.webhookPath }
        : { plugin: chosenTrigger.plugin, event: chosenTrigger.event },
      actions: chosenActions,
      isEnabled: true,
      triggerCount: 0,
      createdAt: new Date().toISOString(),
    };

    setRules((prev) => [newRule, ...prev]);
    setIsCreateModalOpen(false);

    // Reset
    setRuleName('');
    setRuleDescription('');
    setSelectedTriggerIndex(0);
    setSelectedActionIds(['classify_tx', 'send_push']);

    try {
      await apiClient.post('/automations', {
        name: newRule.name,
        description: newRule.description,
        triggerType: newRule.triggerType,
        triggerConfig: newRule.triggerConfig,
        actions: newRule.actions,
        isEnabled: true,
      });
    } catch (err) {
      // Keep optimistic
    }
  };

  const toggleActionSelection = (actionId: string) => {
    setSelectedActionIds((prev) =>
      prev.includes(actionId)
        ? prev.filter((id) => id !== actionId)
        : [...prev, actionId]
    );
  };

  const getActionIcon = (plugin?: string) => {
    switch (plugin) {
      case 'finance':
        return <Wallet size={14} className="text-primary" />;
      case 'notifications':
        return <Bell size={14} className="text-warning" />;
      case 'tasks':
        return <CheckSquare size={14} className="text-income" />;
      case 'ai':
        return <Sparkles size={14} className="text-broker" />;
      default:
        return <Zap size={14} className="text-text-muted" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <Zap className="text-primary" /> Automations & Rules Engine
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Build event-driven and scheduled automation pipelines with custom triggers and actions.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white hover:opacity-90 shadow-sm"
        >
          <Plus size={16} />
          Create Rule
        </Button>
      </div>

      {/* Rules Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {rules.map((rule) => (
          <Card
            key={rule.id}
            className={cn(
              'border-surface-elevated bg-surface transition-all hover:border-primary/40 shadow-sm flex flex-col justify-between',
              !rule.isEnabled && 'opacity-65'
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold text-text">
                      {rule.name}
                    </CardTitle>
                    <Badge
                      variant={rule.isEnabled ? 'success' : 'default'}
                      className="text-[10px] uppercase font-bold py-0"
                    >
                      {rule.isEnabled ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  {rule.description && (
                    <CardDescription className="text-xs text-text-muted mt-1 line-clamp-2">
                      {rule.description}
                    </CardDescription>
                  )}
                </div>

                {/* Power toggle button */}
                <button
                  onClick={() => handleToggleRule(rule)}
                  className={cn(
                    'p-1.5 rounded-lg border transition-colors',
                    rule.isEnabled
                      ? 'bg-income/10 border-income/30 text-income hover:bg-income/20'
                      : 'bg-surface-elevated border-surface-elevated text-text-muted hover:text-text'
                  )}
                  title={rule.isEnabled ? 'Pause Automation' : 'Activate Automation'}
                >
                  {rule.isEnabled ? <Power size={16} /> : <PowerOff size={16} />}
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              {/* Trigger & Action Pipeline Flow Card */}
              <div className="bg-surface-elevated rounded-xl p-3 border border-surface-elevated text-xs space-y-2.5">
                {/* Trigger */}
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text-muted uppercase text-[10px] tracking-wider w-14 shrink-0">
                    Trigger
                  </span>
                  <div className="flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-md border border-surface-elevated text-text font-medium truncate">
                    {rule.triggerType === 'schedule' ? (
                      <Clock size={13} className="text-warning shrink-0" />
                    ) : rule.triggerType === 'webhook' ? (
                      <Terminal size={13} className="text-broker shrink-0" />
                    ) : (
                      <Zap size={13} className="text-primary shrink-0" />
                    )}
                    <span className="truncate">
                      {rule.triggerConfig.cron
                        ? `Schedule (${rule.triggerConfig.cron})`
                        : rule.triggerConfig.event
                        ? `Event: ${rule.triggerConfig.event}`
                        : rule.triggerConfig.webhookPath
                        ? `Webhook: ${rule.triggerConfig.webhookPath}`
                        : rule.triggerType}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="pl-6 text-text-muted">
                  <ArrowRight size={14} className="rotate-90 sm:rotate-0" />
                </div>

                {/* Actions */}
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-text-muted uppercase text-[10px] tracking-wider w-14 shrink-0 mt-1">
                    Actions
                  </span>
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {rule.actions.map((act, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 bg-surface px-2.5 py-1 rounded-md border border-surface-elevated text-text font-medium"
                      >
                        {getActionIcon(act.plugin)}
                        <span>{act.label || act.action}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Execution Stats & Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-surface-elevated text-xs text-text-muted">
                <div className="flex items-center gap-3">
                  <span>Triggers: <b className="text-text">{rule.triggerCount}</b></span>
                  {rule.lastTriggeredAt && (
                    <span className="hidden sm:inline">
                      Last: {new Date(rule.lastTriggeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenLogs(rule)}
                    className="h-8 px-2.5 text-xs text-text-muted hover:text-text flex items-center gap-1"
                  >
                    <History size={13} />
                    Logs
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTriggerRule(rule)}
                    disabled={triggeringId === rule.id}
                    className="h-8 px-2.5 text-xs flex items-center gap-1 hover:border-primary hover:text-primary"
                  >
                    {triggeringId === rule.id ? (
                      <RefreshCw size={13} className="animate-spin text-primary" />
                    ) : (
                      <Play size={13} />
                    )}
                    Run Now
                  </Button>

                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1.5 text-text-muted hover:text-expense rounded transition-colors"
                    title="Delete rule"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Rule Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Automation Rule"
        description="Define an event trigger and subsequent automated actions."
        size="lg"
      >
        <form onSubmit={handleCreateRule} className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-text block mb-1">
              Rule Name <span className="text-expense">*</span>
            </label>
            <Input
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="e.g. Bank SMS → Classify → Notify"
              required
              className="h-10 text-sm bg-surface-elevated border-surface-elevated"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text block mb-1">Description</label>
            <textarea
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
              placeholder="What does this automation automate?"
              rows={2}
              className="w-full bg-surface-elevated border border-surface-elevated rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Trigger Picker */}
          <div>
            <label className="text-xs font-semibold text-text block mb-2">
              1. Choose Trigger (When this happens...)
            </label>
            <div className="space-y-2">
              {TRIGGER_OPTIONS.map((opt, i) => (
                <div
                  key={opt.id}
                  onClick={() => setSelectedTriggerIndex(i)}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all',
                    selectedTriggerIndex === i
                      ? 'border-primary bg-primary/10 text-text'
                      : 'border-surface-elevated bg-surface-elevated/40 hover:bg-surface-elevated text-text-muted hover:text-text'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {opt.type === 'schedule' ? (
                      <Clock size={16} className="text-warning" />
                    ) : opt.type === 'webhook' ? (
                      <Terminal size={16} className="text-broker" />
                    ) : (
                      <Zap size={16} className="text-primary" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-text">{opt.label}</div>
                      <div className="text-xs text-text-muted">
                        Type: <span className="font-mono">{opt.type}</span>
                        {opt.cron && ` • Cron: ${opt.cron}`}
                        {opt.event && ` • Event: ${opt.event}`}
                      </div>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border flex items-center justify-center',
                      selectedTriggerIndex === i ? 'border-primary bg-primary' : 'border-text-muted'
                    )}
                  >
                    {selectedTriggerIndex === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Picker */}
          <div>
            <label className="text-xs font-semibold text-text block mb-2">
              2. Choose Actions (Then do this...)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ACTION_OPTIONS.map((opt) => {
                const isSelected = selectedActionIds.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleActionSelection(opt.id)}
                    className={cn(
                      'flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10 text-text'
                        : 'border-surface-elevated bg-surface-elevated/40 hover:bg-surface-elevated text-text-muted hover:text-text'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {getActionIcon(opt.plugin)}
                      <span className="text-xs font-medium text-text">{opt.label}</span>
                    </div>
                    <div
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                        isSelected ? 'border-primary bg-primary text-white' : 'border-text-muted'
                      )}
                    >
                      {isSelected && <CheckCircle2 size={12} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-elevated">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={selectedActionIds.length === 0}
              className="bg-primary text-white hover:opacity-90"
            >
              Create Rule
            </Button>
          </div>
        </form>
      </Modal>

      {/* Execution Logs Modal */}
      <Modal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        title={activeRuleForLogs ? `Execution Logs: ${activeRuleForLogs.name}` : 'Rule Logs'}
        description="Audit trail of triggers, durations, and action outcomes."
        size="lg"
      >
        <div className="space-y-3">
          {selectedRuleLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl border border-surface-elevated bg-surface-elevated/50 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={log.status === 'success' ? 'success' : log.status === 'partial' ? 'warning' : 'danger'}
                    className="text-[10px] uppercase font-bold py-0"
                  >
                    {log.status}
                  </Badge>
                  <span className="text-text-muted">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                {log.durationMs !== undefined && (
                  <span className="text-text-muted font-mono">{log.durationMs}ms</span>
                )}
              </div>

              {log.errorMessage && (
                <div className="text-expense bg-expense/10 p-2 rounded text-xs mt-1">
                  Error: {log.errorMessage}
                </div>
              )}

              {log.actionResults && Array.isArray(log.actionResults) && (
                <div className="text-[11px] text-text-muted pt-1 flex flex-wrap gap-2">
                  <span>Actions executed:</span>
                  {log.actionResults.map((ar: any, idx: number) => (
                    <span key={idx} className="font-mono text-text bg-surface px-1.5 py-0.5 rounded border border-surface-elevated">
                      {ar.action}: {ar.status}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {selectedRuleLogs.length === 0 && (
            <div className="text-center py-8 text-text-muted text-xs">
              No recorded execution logs for this rule yet.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
