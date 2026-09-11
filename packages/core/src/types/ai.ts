export type AIProviderType = 'gemini' | 'openai' | 'anthropic' | 'ollama';

export type AIMessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface AIConversation {
  id: string;
  workspaceId: string;
  userId: string;
  title: string | null;
  model: string;
  systemPrompt: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: AIMessageRole;
  content: string;
  toolCalls?: Record<string, unknown> | Array<unknown> | null;
  toolResults?: Record<string, unknown> | Array<unknown> | null;
  tokensUsed?: number | null;
  model?: string | null;
  createdAt: Date | string;
}

export interface AIProvider {
  id: string;
  workspaceId: string;
  provider: AIProviderType;
  apiKeyEncrypted?: string | null;
  baseUrl?: string | null;
  defaultModel?: string | null;
  isDefault: boolean;
  createdAt: Date | string;
}

export interface AITaskSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: Date | string | null;
  projectName?: string | null;
}

export interface AIFinancialSummary {
  netSavings?: number;
  totalIncome?: number;
  totalExpenses?: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  currency?: string;
  accountsCount?: number;
}

export interface AIConnectedTool {
  name: string;
  description?: string | null;
  category?: string | null;
  enabled?: boolean;
}

export interface AIContext {
  activeTasks: AITaskSummary[];
  financialSummary?: AIFinancialSummary | null;
  connectedTools?: AIConnectedTool[];
  workspaceName?: string;
  userName?: string;
  currentDate: string;
}

export interface AIChatRequest {
  conversationId?: string;
  workspaceId?: string;
  message: string;
  model?: string;
  provider?: AIProviderType;
  systemPrompt?: string;
}

export interface AIChatResponse {
  conversationId: string;
  message: AIMessage;
  contextSummary?: {
    tasksCount: number;
    toolsCount: number;
    hasFinanceContext: boolean;
  };
}
