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
  [key: string]: unknown;
}

export interface IntegrationTool {
  id: string;
  integrationId: string;
  name: string;
  description: string | null;
  inputSchema: Record<string, unknown> | null;
  enabled: boolean;
  usageCount: number;
  lastUsedAt: string | Date | null;
  createdAt: string | Date;
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
  lastHealthCheck: string | Date | null;
  errorMessage: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  tools?: IntegrationTool[];
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
  createdAt: string | Date;
}

export interface ToolInvocationResult {
  invocationId: string;
  tool: string;
  status: 'success' | 'error' | 'timeout';
  durationMs: number;
  output: unknown;
}

export interface CreateIntegrationInput {
  name: string;
  type: IntegrationType;
  category: IntegrationCategory;
  config: PluginConfig;
  icon?: string | null;
  workspaceId?: string;
}

export interface UpdateIntegrationInput {
  name?: string;
  category?: IntegrationCategory;
  icon?: string | null;
  config?: PluginConfig;
  status?: IntegrationStatus;
}
