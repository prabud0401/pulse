import {
  AutomationRule,
  AutomationActionConfig,
  AutomationTemplate,
  AutomationLogStatus,
} from '../types/automations';

export const BUILTIN_AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'tpl-bank-sms-notify',
    name: 'Bank SMS → Classify → Notify',
    description: 'When a bank alert SMS arrives, automatically classify the transaction and send a push notification.',
    category: 'Finance',
    triggerType: 'event',
    triggerConfig: {
      plugin: 'finance',
      event: 'transaction.ingested',
    },
    actions: [
      { plugin: 'finance', action: 'classify', params: {} },
      { plugin: 'notifications', action: 'push', params: { title: 'New transaction: {{amount}}' } },
    ],
  },
  {
    id: 'tpl-task-overdue-reminder',
    name: 'Task Overdue → Email Reminder',
    description: 'Every morning at 9:00 AM, identify overdue tasks and dispatch a reminder email.',
    category: 'Tasks',
    triggerType: 'schedule',
    triggerConfig: {
      cron: '0 9 * * *',
    },
    actions: [
      { plugin: 'tasks', action: 'find_overdue', params: {} },
      { plugin: 'notifications', action: 'email', params: { template: 'overdue_tasks' } },
    ],
  },
  {
    id: 'tpl-salary-summary',
    name: 'Salary Received → Update Budget → AI Summary',
    description: 'When monthly salary income is detected, recalculate savings budget and generate an AI financial briefing.',
    category: 'Finance',
    triggerType: 'event',
    triggerConfig: {
      plugin: 'finance',
      event: 'salary.received',
    },
    actions: [
      { plugin: 'finance', action: 'update_budget', params: {} },
      { plugin: 'ai', action: 'generate_summary', params: { prompt: 'Summarize income allocation and savings delta' } },
      { plugin: 'notifications', action: 'push', params: { title: 'Salary received! AI Summary ready.' } },
    ],
  },
  {
    id: 'tpl-webhook-task-created',
    name: 'External Webhook → Auto-Create Task',
    description: 'When an incoming webhook is posted, automatically generate a task in the active sprint backlog.',
    category: 'Productivity',
    triggerType: 'webhook',
    triggerConfig: {
      webhookPath: '/webhooks/tasks',
    },
    actions: [
      { plugin: 'tasks', action: 'create_task', params: { priority: 'medium', tags: ['webhook', 'automated'] } },
      { plugin: 'notifications', action: 'push', params: { title: 'New task created via webhook' } },
    ],
  },
];

export interface Condition {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'in';
  value: unknown;
}

/**
 * Checks whether the incoming trigger payload matches the conditions specified in triggerConfig.
 */
export function evaluateConditions(
  conditions: Array<Condition> | Record<string, unknown> | undefined,
  payload: Record<string, unknown> = {}
): boolean {
  if (!conditions) return true;

  // Simple key-value equality
  if (!Array.isArray(conditions)) {
    for (const [key, expected] of Object.entries(conditions)) {
      if (payload[key] !== expected) return false;
    }
    return true;
  }

  // Structured conditions
  for (const cond of conditions) {
    const val = payload[cond.field];
    switch (cond.operator) {
      case 'eq':
        if (val != cond.value) return false;
        break;
      case 'neq':
        if (val == cond.value) return false;
        break;
      case 'contains':
        if (typeof val !== 'string' || !val.includes(String(cond.value))) return false;
        break;
      case 'gt':
        if (Number(val) <= Number(cond.value)) return false;
        break;
      case 'lt':
        if (Number(val) >= Number(cond.value)) return false;
        break;
      case 'in':
        if (Array.isArray(cond.value) && !cond.value.includes(val)) return false;
        break;
      default:
        break;
    }
  }

  return true;
}

/**
 * Evaluates template interpolation strings such as "Hello {{name}}".
 */
export function interpolateParams(
  params: Record<string, unknown> = {},
  data: Record<string, unknown> = {}
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(params)) {
    if (typeof val === 'string') {
      result[key] = val.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, varName) => {
        return data[varName] !== undefined ? String(data[varName]) : `{{${varName}}}`;
      });
    } else {
      result[key] = val;
    }
  }

  return result;
}

export interface ActionResult {
  action: string;
  plugin?: string;
  status: 'success' | 'error';
  result?: unknown;
  error?: string;
}

export interface ExecutionOutcome {
  status: AutomationLogStatus;
  durationMs: number;
  actionResults: ActionResult[];
  errorMessage?: string;
}

/**
 * Executes the configured action list against a trigger payload.
 */
export async function executeAutomationActions(
  actions: AutomationActionConfig[],
  triggerData: Record<string, unknown> = {}
): Promise<ExecutionOutcome> {
  const startTime = Date.now();
  const actionResults: ActionResult[] = [];
  let errorCount = 0;

  for (const act of actions) {
    try {
      const resolvedParams = interpolateParams(act.params, triggerData);
      
      // Simulate action execution based on plugin & action type
      let output: unknown;
      switch (act.action) {
        case 'classify':
          output = { classified: true, category: triggerData.category || 'General Expense' };
          break;
        case 'push':
        case 'email':
          output = { sent: true, recipient: 'user', title: resolvedParams.title || 'Notification' };
          break;
        case 'create_task':
          output = { created: true, title: resolvedParams.title || triggerData.title || 'Automated Task' };
          break;
        case 'generate_summary':
          output = { generated: true, summary: 'AI summary executed successfully based on current state.' };
          break;
        default:
          output = { executed: true, params: resolvedParams };
          break;
      }

      actionResults.push({
        action: act.action,
        plugin: act.plugin,
        status: 'success',
        result: output,
      });
    } catch (err: any) {
      errorCount++;
      actionResults.push({
        action: act.action,
        plugin: act.plugin,
        status: 'error',
        error: err?.message || 'Action execution failed',
      });
    }
  }

  const durationMs = Date.now() - startTime;
  let status: AutomationLogStatus = 'success';
  if (errorCount === actions.length && actions.length > 0) {
    status = 'error';
  } else if (errorCount > 0) {
    status = 'partial';
  }

  return {
    status,
    durationMs,
    actionResults,
    errorMessage: errorCount > 0 ? `${errorCount} of ${actions.length} actions failed` : undefined,
  };
}
