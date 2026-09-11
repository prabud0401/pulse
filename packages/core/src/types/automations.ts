export type TriggerType = 'event' | 'schedule' | 'webhook';

export type AutomationLogStatus = 'success' | 'partial' | 'error';

export interface AutomationTriggerConfig {
  plugin?: string;
  event?: string;
  cron?: string;
  webhookPath?: string;
  conditions?: Array<{ field: string; operator: string; value: unknown }> | Record<string, unknown>;
  [key: string]: unknown;
}

export interface AutomationActionConfig {
  plugin?: string;
  action: string;
  params?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AutomationRule {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  triggerType: TriggerType;
  triggerConfig: AutomationTriggerConfig;
  actions: AutomationActionConfig[];
  isEnabled: boolean;
  lastTriggeredAt?: Date | string | null;
  triggerCount: number;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateAutomationRuleInput {
  workspaceId: string;
  name: string;
  description?: string;
  triggerType: TriggerType;
  triggerConfig: AutomationTriggerConfig;
  actions: AutomationActionConfig[];
  isEnabled?: boolean;
}

export interface UpdateAutomationRuleInput {
  name?: string;
  description?: string;
  triggerType?: TriggerType;
  triggerConfig?: AutomationTriggerConfig;
  actions?: AutomationActionConfig[];
  isEnabled?: boolean;
}

export interface AutomationLog {
  id: string;
  ruleId: string;
  status: AutomationLogStatus;
  triggerData?: Record<string, unknown> | null;
  actionResults?: Array<Record<string, unknown>> | null;
  durationMs?: number | null;
  errorMessage?: string | null;
  createdAt: Date | string;
}

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerType: TriggerType;
  triggerConfig: AutomationTriggerConfig;
  actions: AutomationActionConfig[];
}
