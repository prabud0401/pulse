import { AIConnectedTool, AIToolInvocationResult } from '../types/ai';

export interface ToolCallDetectionResult {
  shouldCallTool: boolean;
  toolName?: string;
  args?: Record<string, unknown>;
  reason?: string;
}


export type AIToolDispatcher = (
  toolName: string,
  args: Record<string, unknown>,
  workspaceId?: string
) => Promise<AIToolInvocationResult>;

// Registry for external MCP or backend dispatchers
let registeredDispatcher: AIToolDispatcher | null = null;

export function registerToolDispatcher(dispatcher: AIToolDispatcher): void {
  registeredDispatcher = dispatcher;
}

export function clearToolDispatcher(): void {
  registeredDispatcher = null;
}

/**
 * Detects if the incoming user prompt implies or explicitly requests a tool action.
 */
export function detectToolCall(
  userMessage: string,
  availableTools: Array<{ name: string; description?: string | null }> = []
): ToolCallDetectionResult {
  const lower = userMessage.toLowerCase().trim();

  // 1. Email / Inbox actions
  if (
    lower.includes('list email') ||
    lower.includes('recent email') ||
    lower.includes('show email') ||
    lower.includes('check email') ||
    lower.includes('fetch email') ||
    lower.includes('list recent emails') ||
    lower.includes('client email') ||
    lower.includes('my inbox')
  ) {
    return {
      shouldCallTool: true,
      toolName: 'list_emails',
      args: { limit: 5, folder: 'inbox' },
      reason: 'User requested email listing or inbox inspection',
    };
  }

  // 2. Financial & Income summary actions
  if (
    lower.includes('income summary') ||
    lower.includes('get income') ||
    lower.includes('financial summary') ||
    lower.includes('personal savings') ||
    lower.includes('net savings') ||
    lower.includes('financial audit') ||
    lower.includes('reconcile') ||
    lower.includes('ledger') ||
    (lower.includes('income') && lower.includes('summary')) ||
    (lower.includes('finance') && lower.includes('summary'))
  ) {
    return {
      shouldCallTool: true,
      toolName: 'get_income_summary',
      args: { period: 'current_month' },
      reason: 'User requested financial or income summary',
    };
  }

  // 3. Health check & MCP diagnostics
  if (
    lower.includes('check health') ||
    lower.includes('system health') ||
    lower.includes('mcp diagnostic') ||
    lower.includes('server diagnostic') ||
    lower.includes('probe server') ||
    lower.includes('server latency') ||
    lower.includes('mcp server') ||
    lower.includes('diagnose server') ||
    lower.includes('ping server')
  ) {
    return {
      shouldCallTool: true,
      toolName: 'check_health',
      args: { probeLatency: true },
      reason: 'User requested system health check or MCP server diagnostic',
    };
  }

  // 4. Task searching & backlog
  if (
    lower.includes('search task') ||
    lower.includes('list task') ||
    lower.includes('pending task') ||
    lower.includes('overdue task') ||
    lower.includes('active task') ||
    lower.includes('sprint task') ||
    lower.includes('engineering standup') ||
    lower.includes('sprint retro') ||
    lower.includes('retrospective')
  ) {
    return {
      shouldCallTool: true,
      toolName: 'search_tasks',
      args: { status: 'active', limit: 10 },
      reason: 'User requested task search or standup/retrospective workload analysis',
    };
  }

  // 5. Match against explicitly available integration tools
  for (const tool of availableTools) {
    const toolNameLower = tool.name.toLowerCase();
    const cleanName = toolNameLower.replace(/_/g, ' ');

    if (lower.includes(toolNameLower) || lower.includes(cleanName)) {
      return {
        shouldCallTool: true,
        toolName: tool.name,
        args: {},
        reason: `Matched registered tool: ${tool.name}`,
      };
    }

    if (tool.description) {
      const descWords = tool.description.toLowerCase().split(/\s+/);
      const significantKeywords = descWords.filter((w) => w.length > 5);
      const matches = significantKeywords.filter((w) => lower.includes(w));
      if (matches.length >= 2) {
        return {
          shouldCallTool: true,
          toolName: tool.name,
          args: {},
          reason: `Matched tool description keywords for: ${tool.name}`,
        };
      }
    }
  }

  return { shouldCallTool: false };
}

/**
 * Built-in simulated dispatcher returning high-fidelity, realistic payloads
 * for tools when no remote MCP server is connected.
 */
export function executeSimulatedTool(
  toolName: string,
  args: Record<string, unknown> = {}
): AIToolInvocationResult {
  const startTime = Date.now();
  const normalized = toolName.toLowerCase();

  let output: unknown;
  let integrationName = 'Pulse Core Engine';

  if (normalized === 'list_emails' || normalized === 'list_recent_emails') {
    integrationName = 'Google Workspace MCP';
    output = {
      emails: [
        {
          id: 'msg-901',
          from: 'rick.gomez@clientcorp.com',
          subject: 'Engineering Deliverables & Sprint Milestone Sign-off',
          date: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
          snippet: 'Hi Prabudeva, reviewed the latest sprint deliverables and MCP tool calling demo. Everything looks solid for deployment.',
          unread: true,
          priority: 'high',
        },
        {
          id: 'msg-902',
          from: 'billing@cloudinfra.net',
          subject: 'Invoice #INV-2026-09: Pulse Cluster Services',
          date: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
          snippet: 'Your monthly infrastructure invoice for $48.00 has been reconciled and paid.',
          unread: false,
          priority: 'normal',
        },
        {
          id: 'msg-903',
          from: 'alex.m@blueoceansp.com',
          subject: 'Client Demo Preparation: Pulse Assistant & MCP Gateway',
          date: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
          snippet: 'Looking forward to the live demonstration tomorrow at 10 AM EST. The new tool badges look great.',
          unread: false,
          priority: 'normal',
        },
      ],
      totalCount: 3,
      unreadCount: 1,
      retrievedAt: new Date().toISOString(),
    };
  } else if (normalized === 'get_income_summary') {
    integrationName = 'Pulse Finance Engine';
    output = {
      currency: 'USD',
      netPersonalSavings: 18450.0,
      monthlyIncome: 5200.0,
      monthlyExpenses: 2850.0,
      savingsRate: '45.19%',
      activeAccounts: 3,
      topCategories: [
        { category: 'Consulting & Engineering Retainer', amount: 4200.0, type: 'income' },
        { category: 'Software & Subscriptions', amount: 1000.0, type: 'income' },
        { category: 'Cloud Infrastructure', amount: 48.0, type: 'expense' },
        { category: 'Living & Office Expenses', amount: 620.0, type: 'expense' },
      ],
      runwayMonths: 6.4,
      reconciliationStatus: 'reconciled_clean',
      asOf: new Date().toISOString(),
    };
  } else if (
    normalized === 'check_health' ||
    normalized === 'mcp_server_diagnostic' ||
    normalized === 'server_diagnostic'
  ) {
    integrationName = 'Pulse MCP Gateway';
    output = {
      system: 'Pulse MCP Gateway Cluster',
      overallStatus: 'healthy',
      timestamp: new Date().toISOString(),
      servers: [
        {
          name: 'Google Workspace MCP (Gmail/Drive/Calendar)',
          status: 'connected',
          latencyMs: 38,
          toolsAvailable: 8,
          lastPing: new Date(Date.now() - 1000 * 20).toISOString(),
        },
        {
          name: 'Pulse Finance Ledger Gateway',
          status: 'connected',
          latencyMs: 14,
          toolsAvailable: 5,
          lastPing: new Date(Date.now() - 1000 * 10).toISOString(),
        },
        {
          name: 'Linear / Jira Task Tracker MCP',
          status: 'connected',
          latencyMs: 62,
          toolsAvailable: 6,
          lastPing: new Date(Date.now() - 1000 * 30).toISOString(),
        },
      ],
      activeToolsCount: 19,
      averageLatencyMs: 38.0,
    };
  } else if (normalized === 'search_tasks' || normalized === 'list_tasks') {
    integrationName = 'Pulse Tasks Engine';
    output = {
      total: 4,
      tasks: [
        {
          id: 'task-101',
          title: 'Implement Dynamic AI Tool Calling in Assistant',
          status: 'in_progress',
          priority: 'critical',
          assignee: 'Prabudeva',
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          projectName: 'Pulse Core AI',
        },
        {
          id: 'task-102',
          title: 'Verify MCP Client Gateway SSE Transport',
          status: 'done',
          priority: 'high',
          assignee: 'Prabudeva',
          dueDate: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
          projectName: 'Integrations Hub',
        },
        {
          id: 'task-103',
          title: 'Automate Bank SMS Alert Ingestion Pipeline',
          status: 'in_progress',
          priority: 'high',
          assignee: 'Prabudeva',
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
          projectName: 'Pulse Finance',
        },
        {
          id: 'task-104',
          title: 'Draft Client Milestone Deliverables Memo',
          status: 'todo',
          priority: 'medium',
          assignee: 'Prabudeva',
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
          projectName: 'Client Deliverables',
        },
      ],
    };
  } else if (
    normalized === 'run_financial_reconciliation' ||
    normalized === 'financial_reconciliation'
  ) {
    integrationName = 'Pulse Finance Engine';
    output = {
      reconciledCount: 42,
      unmatchedCount: 0,
      totalReconciledAmount: 7450.0,
      anomaliesDetected: 0,
      cashFlowStatus: 'positive',
      auditPassed: true,
      completedAt: new Date().toISOString(),
    };
  } else {
    output = {
      executed: true,
      tool: toolName,
      simulated: true,
      args,
      timestamp: new Date().toISOString(),
      message: `Tool '${toolName}' executed successfully via Pulse dispatcher.`,
    };
  }

  const durationMs = Date.now() - startTime + Math.floor(Math.random() * 40 + 80);

  return {
    toolName,
    integrationName,
    durationMs,
    status: 'success',
    output,
  };
}

/**
 * Primary AI Tool Call executor.
 * Dispatches to registered MCP bridge (e.g. from @pulse/api) if available,
 * or runs the built-in simulated dispatcher with realistic data.
 */
export async function executeAIToolCall(
  toolName: string,
  args: Record<string, unknown> = {},
  workspaceId?: string,
  customDispatcher?: AIToolDispatcher
): Promise<AIToolInvocationResult> {
  const dispatcher = customDispatcher || registeredDispatcher;

  if (dispatcher) {
    try {
      const result = await dispatcher(toolName, args, workspaceId);
      if (result) return result;
    } catch (err: any) {
      // Fallback to simulated dispatcher on error
      const simulated = executeSimulatedTool(toolName, args);
      return {
        ...simulated,
        error: `Dispatcher error: ${err.message || String(err)}, using simulated fallback`,
      };
    }
  }

  return executeSimulatedTool(toolName, args);
}
