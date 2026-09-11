export type IntegrationStatus = 'connected' | 'disconnected' | 'error';

export type IntegrationCategory =
  | 'communication'
  | 'finance'
  | 'productivity'
  | 'dev-tools'
  | 'custom';

export type IntegrationType =
  | 'mcp_remote'
  | 'mcp_stdio'
  | 'oauth'
  | 'api_key'
  | 'webhook';

export interface PluginConfig {
  url?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  binaryPath?: string;
  args?: string[];
  oauth?: {
    clientId: string;
    clientSecret: string;
    scopes: string[];
  };
  [key: string]: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ConnectionResult {
  success: boolean;
  tools?: ToolDefinition[];
  error?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  lastCheck: Date;
  error?: string;
}

export interface PulsePlugin {
  id: string;
  name: string;
  icon?: string;
  category: IntegrationCategory;
  type: IntegrationType;

  connect(config: PluginConfig): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<HealthStatus>;

  getTools(): Promise<ToolDefinition[]>;
  invokeTool(name: string, input: Record<string, unknown>): Promise<unknown>;
}

export interface Integration {
  id: string;
  workspaceId: string;
  name: string;
  type: IntegrationType;
  category: IntegrationCategory;
  icon: string | null;
  config: PluginConfig;
  status: IntegrationStatus;
  lastHealthCheck: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationTool {
  id: string;
  integrationId: string;
  name: string;
  description: string | null;
  inputSchema: Record<string, unknown> | null;
  enabled: boolean;
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export interface ToolInvocation {
  id: string;
  integrationId: string;
  toolName: string;
  userId: string;
  input: Record<string, unknown> | null;
  output: unknown | null;
  status: 'success' | 'error' | 'timeout';
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: Date;
}
