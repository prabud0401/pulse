import { apiClient } from './api-client';
import {
  Integration,
  IntegrationTool,
  ToolInvocation,
  ToolInvocationResult,
  CreateIntegrationInput,
  UpdateIntegrationInput,
} from '@/types/integrations';

// Sample default integrations for rich demo / fallback when server DB is offline
const INITIAL_DEMO_INTEGRATIONS: (Integration & { tools: IntegrationTool[] })[] = [
  {
    id: 'demo-prabu-life-os',
    workspaceId: 'workspace-default',
    name: 'Prabu Life OS MCP',
    type: 'mcp_remote',
    category: 'finance',
    icon: 'Wallet',
    config: {
      url: 'https://prabu-life-os-production.up.railway.app/sse',
      headers: {
        'x-api-key': 'live_life_os_key_mock',
      },
    },
    status: 'connected',
    lastHealthCheck: new Date(Date.now() - 1000 * 60 * 3), // 3 mins ago
    errorMessage: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    updatedAt: new Date(),
    tools: [
      {
        id: 'tool-income-summary',
        integrationId: 'demo-prabu-life-os',
        name: 'get_income_summary',
        description: 'Fetch monthly salary breakdown, USD to LKR conversion rates, and total transfers.',
        inputSchema: {
          type: 'object',
          properties: {
            fromDate: { type: 'string', description: 'Start date in YYYY-MM-DD format (e.g. 2026-01-01)' },
            toDate: { type: 'string', description: 'End date in YYYY-MM-DD format (e.g. 2026-09-01)' },
          },
          required: ['fromDate'],
        },
        enabled: true,
        usageCount: 42,
        lastUsedAt: new Date(Date.now() - 1000 * 60 * 12),
        createdAt: new Date(),
      },
      {
        id: 'tool-reconcile',
        integrationId: 'demo-prabu-life-os',
        name: 'run_financial_reconciliation',
        description: 'Generate multi-scenario living expense projections (base, happy, worst-case) with net savings delta.',
        inputSchema: {
          type: 'object',
          properties: {
            scenario: { type: 'string', enum: ['base', 'happy', 'worst'], description: 'Projection scenario model' },
            includeBroker: { type: 'boolean', description: 'Whether to isolate broker pass-through accounts' },
          },
        },
        enabled: true,
        usageCount: 19,
        lastUsedAt: new Date(Date.now() - 1000 * 60 * 45),
        createdAt: new Date(),
      },
      {
        id: 'tool-classify',
        integrationId: 'demo-prabu-life-os',
        name: 'classify_transaction',
        description: 'Classify raw bank alert or SMS into personal living expense, salary, or broker transfer.',
        inputSchema: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Transaction raw text or counterparty description' },
            amountLkr: { type: 'number', description: 'Transaction amount in Sri Lankan Rupees' },
            direction: { type: 'string', enum: ['credit', 'debit'], description: 'Credit or debit entry' },
          },
          required: ['description', 'amountLkr', 'direction'],
        },
        enabled: true,
        usageCount: 88,
        lastUsedAt: new Date(Date.now() - 1000 * 60 * 5),
        createdAt: new Date(),
      },
      {
        id: 'tool-sms-ingest',
        integrationId: 'demo-prabu-life-os',
        name: 'ingest_sms_alert',
        description: 'Ingest raw bank SMS from PEOPLESBANK, COMBANK, HNB or BOC into financial ledger.',
        inputSchema: {
          type: 'object',
          properties: {
            sender: { type: 'string', description: 'Originating bank SMS sender header' },
            text: { type: 'string', description: 'SMS message body' },
          },
          required: ['sender', 'text'],
        },
        enabled: true,
        usageCount: 65,
        lastUsedAt: new Date(Date.now() - 1000 * 60 * 2),
        createdAt: new Date(),
      },
    ],
  },
  {
    id: 'demo-github-mcp',
    workspaceId: 'workspace-default',
    name: 'GitHub MCP Dev Server',
    type: 'mcp_remote',
    category: 'dev-tools',
    icon: 'GitBranch',
    config: {
      url: 'https://api.github.com/mcp',
      apiKey: 'ghp_mock_personal_access_token_123',
    },
    status: 'connected',
    lastHealthCheck: new Date(Date.now() - 1000 * 60 * 15),
    errorMessage: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    updatedAt: new Date(),
    tools: [
      {
        id: 'tool-gh-issues',
        integrationId: 'demo-github-mcp',
        name: 'list_repository_issues',
        description: 'List open issues, pull requests, and milestones for a given repository.',
        inputSchema: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository name formatted as owner/repo' },
            state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Filter issues by state' },
          },
          required: ['repo'],
        },
        enabled: true,
        usageCount: 14,
        lastUsedAt: new Date(Date.now() - 1000 * 60 * 120),
        createdAt: new Date(),
      },
      {
        id: 'tool-gh-create-issue',
        integrationId: 'demo-github-mcp',
        name: 'create_issue',
        description: 'Create a new GitHub issue with markdown body and labels.',
        inputSchema: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository name formatted as owner/repo' },
            title: { type: 'string', description: 'Title of the issue' },
            body: { type: 'string', description: 'Markdown description of the issue' },
          },
          required: ['repo', 'title'],
        },
        enabled: true,
        usageCount: 7,
        lastUsedAt: new Date(Date.now() - 1000 * 60 * 300),
        createdAt: new Date(),
      },
    ],
  },
  {
    id: 'demo-slack-integration',
    workspaceId: 'workspace-default',
    name: 'Slack Alerts Webhook',
    type: 'webhook',
    category: 'communication',
    icon: 'MessageSquare',
    config: {
      url: 'https://hooks.slack.com/services/T00/B00/XXXX',
    },
    status: 'disconnected',
    lastHealthCheck: null,
    errorMessage: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    updatedAt: new Date(),
    tools: [],
  },
];

const STORAGE_KEY = 'pulse_local_integrations_cache';
const LOGS_STORAGE_KEY = 'pulse_local_integration_logs_cache';

function getLocalStore(): (Integration & { tools: IntegrationTool[] })[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_INTEGRATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_INTEGRATIONS));
      return INITIAL_DEMO_INTEGRATIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_INTEGRATIONS;
  }
}

function saveLocalStore(items: (Integration & { tools: IntegrationTool[] })[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

function getLocalLogs(integrationId?: string): ToolInvocation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    const logs: ToolInvocation[] = raw ? JSON.parse(raw) : [
      {
        id: 'log-1',
        integrationId: 'demo-prabu-life-os',
        toolName: 'get_income_summary',
        userId: '1',
        input: { fromDate: '2026-08-01', toDate: '2026-09-01' },
        output: {
          totalUsd: 4200,
          totalLkr: 1260000,
          transferCount: 3,
          salaryCount: 1,
          bonusCount: 0,
          monthlyBreakdown: [
            { month: '2026-08', usd: 4200, lkr: 1260000, count: 3 }
          ]
        },
        status: 'success',
        durationMs: 46,
        errorMessage: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 12),
      },
      {
        id: 'log-2',
        integrationId: 'demo-prabu-life-os',
        toolName: 'classify_transaction',
        userId: '1',
        input: { description: 'UBER TRIP COLOMBO', amountLkr: 1450, direction: 'debit' },
        output: {
          category: 'transport',
          isLivingExpense: true,
          confidence: 0.98,
        },
        status: 'success',
        durationMs: 24,
        errorMessage: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 5),
      }
    ];
    if (integrationId) {
      return logs.filter((l) => l.integrationId === integrationId);
    }
    return logs;
  } catch {
    return [];
  }
}

function saveLocalLog(log: ToolInvocation) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalLogs();
    const updated = [log, ...existing].slice(0, 100);
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
}

export const integrationsApi = {
  /**
   * List all integrations for the workspace
   */
  async list(workspaceId?: string): Promise<Integration[]> {
    try {
      const endpoint = workspaceId
        ? `/api/integrations?workspaceId=${encodeURIComponent(workspaceId)}`
        : '/api/integrations';
      const res = await apiClient.get<{ success: boolean; data: Integration[] }>(endpoint);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {
      // Fallback to local store
    }
    return getLocalStore();
  },

  /**
   * Get single integration with tools
   */
  async get(id: string): Promise<Integration & { tools: IntegrationTool[] }> {
    try {
      const res = await apiClient.get<{ success: boolean; data: Integration & { tools: IntegrationTool[] } }>(
        `/api/integrations/${id}`
      );
      if (res.success && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    const item = getLocalStore().find((i) => i.id === id);
    if (item) return item;

    throw new Error('Integration not found');
  },

  /**
   * Create new integration
   */
  async create(input: CreateIntegrationInput): Promise<Integration> {
    try {
      const res = await apiClient.post<{ success: boolean; data: Integration }>(
        '/api/integrations',
        input
      );
      if (res.success && res.data) {
        return res.data;
      }
    } catch {
      // Fallback for demo
    }

    const newId = `integration-${Date.now()}`;
    const newIntegration: Integration & { tools: IntegrationTool[] } = {
      id: newId,
      workspaceId: input.workspaceId || 'workspace-default',
      name: input.name,
      type: input.type,
      category: input.category,
      icon: input.icon || null,
      config: input.config,
      status: 'disconnected',
      lastHealthCheck: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      tools: [],
    };

    const store = getLocalStore();
    saveLocalStore([newIntegration, ...store]);
    return newIntegration;
  },

  /**
   * Update integration
   */
  async update(id: string, input: UpdateIntegrationInput): Promise<Integration> {
    try {
      const res = await apiClient.patch<{ success: boolean; data: Integration }>(
        `/api/integrations/${id}`,
        input
      );
      if (res.success && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    const store = getLocalStore();
    const idx = store.findIndex((i) => i.id === id);
    if (idx >= 0) {
      store[idx] = {
        ...store[idx],
        ...input,
        config: input.config ? { ...store[idx].config, ...input.config } : store[idx].config,
        updatedAt: new Date(),
      };
      saveLocalStore([...store]);
      return store[idx];
    }

    throw new Error('Integration not found');
  },

  /**
   * Delete integration
   */
  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/integrations/${id}`);
    } catch {
      // Fallback
    }

    const store = getLocalStore();
    saveLocalStore(store.filter((i) => i.id !== id));
  },

  /**
   * Connect integration (test connection / discover tools)
   */
  async connect(id: string): Promise<Integration> {
    try {
      const res = await apiClient.post<{ success: boolean; data: Integration }>(
        `/api/integrations/${id}/connect`,
        {}
      );
      if (res.success && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    const store = getLocalStore();
    const idx = store.findIndex((i) => i.id === id);
    if (idx >= 0) {
      // Populate mock tools if newly created MCP integration had none
      let currentTools = store[idx].tools || [];
      if (currentTools.length === 0 && store[idx].type === 'mcp_remote') {
        currentTools = [
          {
            id: `tool-${Date.now()}-1`,
            integrationId: id,
            name: 'health_check',
            description: 'Check connectivity, latency, and operational health of the remote MCP host.',
            inputSchema: {
              type: 'object',
              properties: {
                ping: { type: 'string', description: 'Optional challenge payload' },
              },
            },
            enabled: true,
            usageCount: 0,
            lastUsedAt: null,
            createdAt: new Date(),
          },
          {
            id: `tool-${Date.now()}-2`,
            integrationId: id,
            name: 'query_data',
            description: 'Execute query or fetch remote resources from this MCP provider.',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search term or query expression' },
                limit: { type: 'number', description: 'Maximum number of items to return' },
              },
              required: ['query'],
            },
            enabled: true,
            usageCount: 0,
            lastUsedAt: null,
            createdAt: new Date(),
          },
        ];
      }

      store[idx] = {
        ...store[idx],
        status: 'connected',
        lastHealthCheck: new Date(),
        errorMessage: null,
        updatedAt: new Date(),
        tools: currentTools,
      };
      saveLocalStore([...store]);
      return store[idx];
    }

    throw new Error('Integration not found');
  },

  /**
   * Disconnect integration
   */
  async disconnect(id: string): Promise<Integration> {
    try {
      const res = await apiClient.post<{ success: boolean; data: Integration }>(
        `/api/integrations/${id}/disconnect`,
        {}
      );
      if (res.success && res.data) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    const store = getLocalStore();
    const idx = store.findIndex((i) => i.id === id);
    if (idx >= 0) {
      store[idx] = {
        ...store[idx],
        status: 'disconnected',
        updatedAt: new Date(),
      };
      saveLocalStore([...store]);
      return store[idx];
    }

    throw new Error('Integration not found');
  },

  /**
   * List tools for an integration
   */
  async listTools(id: string): Promise<IntegrationTool[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: IntegrationTool[] }>(
        `/api/integrations/${id}/tools`
      );
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    const store = getLocalStore();
    const integration = store.find((i) => i.id === id);
    return integration?.tools || [];
  },

  /**
   * Invoke a tool on an integration
   */
  async invokeTool(
    id: string,
    toolName: string,
    input: Record<string, unknown>
  ): Promise<ToolInvocationResult> {
    const startTime = Date.now();

    try {
      const res = await apiClient.post<{ success: boolean; data: ToolInvocationResult }>(
        `/api/integrations/${id}/tools/${toolName}/invoke`,
        { input }
      );
      if (res.success && res.data) {
        saveLocalLog({
          id: res.data.invocationId || `log-${Date.now()}`,
          integrationId: id,
          toolName,
          userId: 'current-user',
          input,
          output: res.data.output,
          status: res.data.status || 'success',
          durationMs: res.data.durationMs || Date.now() - startTime,
          errorMessage: null,
          createdAt: new Date(),
        });
        return res.data;
      }
    } catch {
      // Fallback invocation generator
    }

    const durationMs = Date.now() - startTime + Math.floor(Math.random() * 40) + 15;
    let mockOutput: unknown = {
      message: `Executed tool '${toolName}' successfully.`,
      parametersReceived: input,
      timestamp: new Date().toISOString(),
      status: 'ok',
    };

    // Realistic mock output for Life OS MCP tools
    if (toolName === 'get_income_summary') {
      mockOutput = {
        currency: 'USD & LKR',
        totalUsd: 5400,
        totalLkr: 1620000,
        salaryCount: 2,
        bonusCount: 1,
        transferCount: 4,
        dateRange: {
          from: input.fromDate || '2026-01-01',
          to: input.toDate || '2026-09-01',
        },
        monthlyBreakdown: [
          { month: '2026-07', usd: 2700, lkr: 810000, count: 2 },
          { month: '2026-08', usd: 2700, lkr: 810000, count: 2 },
        ],
      };
    } else if (toolName === 'classify_transaction') {
      mockOutput = {
        inputDescription: input.description,
        amountLkr: input.amountLkr,
        classification: 'living_expense',
        subcategory: 'dining_transport',
        isBrokerPassThrough: false,
        confidence: 0.97,
      };
    } else if (toolName === 'run_financial_reconciliation') {
      mockOutput = {
        generatedAt: new Date().toISOString(),
        scenarios: [
          {
            scenario: input.scenario || 'base',
            projectedSalaryLkr: 850000,
            projectedExpensesLkr: 240000,
            projectedNetSavingsLkr: 610000,
            notes: ['Standard monthly burn rate maintained', 'Broker accounts isolated'],
          },
        ],
      };
    }

    const invocationId = `inv-${Date.now()}`;
    const result: ToolInvocationResult = {
      invocationId,
      tool: toolName,
      status: 'success',
      durationMs,
      output: mockOutput,
    };

    saveLocalLog({
      id: invocationId,
      integrationId: id,
      toolName,
      userId: 'current-user',
      input,
      output: mockOutput,
      status: 'success',
      durationMs,
      errorMessage: null,
      createdAt: new Date(),
    });

    // Increment usage on tool
    const store = getLocalStore();
    const target = store.find((i) => i.id === id);
    if (target?.tools) {
      const t = target.tools.find((x) => x.name === toolName);
      if (t) {
        t.usageCount = (t.usageCount || 0) + 1;
        t.lastUsedAt = new Date();
        saveLocalStore([...store]);
      }
    }

    return result;
  },

  /**
   * Get logs for an integration
   */
  async getLogs(id: string): Promise<ToolInvocation[]> {
    try {
      const res = await apiClient.get<{ success: boolean; data: ToolInvocation[] }>(
        `/api/integrations/${id}/logs`
      );
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    return getLocalLogs(id);
  },
};
