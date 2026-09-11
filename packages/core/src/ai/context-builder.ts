import { AIContext, AITaskSummary, AIFinancialSummary, AIConnectedTool } from '../types/ai';

export interface AIContextInput {
  activeTasks?: AITaskSummary[];
  financialSummary?: AIFinancialSummary | null;
  connectedTools?: AIConnectedTool[];
  workspaceName?: string;
  userName?: string;
  currentDate?: string;
}

/**
 * Builds normalized AI context gathering active tasks, financial summary, and connected MCP tools.
 */
export function buildAIContext(input: AIContextInput): AIContext {
  return {
    activeTasks: input.activeTasks || [],
    financialSummary: input.financialSummary ?? null,
    connectedTools: input.connectedTools || [],
    workspaceName: input.workspaceName || 'Default Workspace',
    userName: input.userName || 'Pulse User',
    currentDate: input.currentDate || new Date().toISOString(),
  };
}

/**
 * Formats dynamic AI context into a structured system prompt injection for LLM models.
 */
export function formatContextPrompt(context: AIContext): string {
  const sections: string[] = [];

  sections.push(`You are Pulse AI Assistant, the personal and professional operating system intelligence.`);
  sections.push(`Current System Time: ${context.currentDate}`);
  sections.push(`Active Workspace: ${context.workspaceName}`);
  if (context.userName) {
    sections.push(`Current User: ${context.userName}`);
  }

  // Active Tasks
  if (context.activeTasks && context.activeTasks.length > 0) {
    const taskLines = context.activeTasks.map((t) => {
      const due = t.dueDate ? ` (Due: ${new Date(t.dueDate).toLocaleDateString()})` : '';
      const project = t.projectName ? ` [Project: ${t.projectName}]` : '';
      return `- [${t.status.toUpperCase()}] (${t.priority} priority) ${t.title}${project}${due}`;
    });
    sections.push(`\n### Active Tasks (${context.activeTasks.length}):\n${taskLines.join('\n')}`);
  } else {
    sections.push(`\n### Active Tasks: None pending.`);
  }

  // Financial Summary
  if (context.financialSummary) {
    const fin = context.financialSummary;
    const curr = fin.currency || 'USD';
    const lines = [
      fin.netSavings !== undefined ? `- Net Savings / Balance: ${curr} ${fin.netSavings.toLocaleString()}` : null,
      fin.monthlyIncome !== undefined ? `- Monthly Income: ${curr} ${fin.monthlyIncome.toLocaleString()}` : null,
      fin.monthlyExpenses !== undefined ? `- Monthly Expenses: ${curr} ${fin.monthlyExpenses.toLocaleString()}` : null,
      fin.accountsCount !== undefined ? `- Active Bank Accounts: ${fin.accountsCount}` : null,
    ].filter(Boolean);

    if (lines.length > 0) {
      sections.push(`\n### Live Financial Context:\n${lines.join('\n')}`);
    }
  }

  // Connected MCP Tools
  if (context.connectedTools && context.connectedTools.length > 0) {
    const toolLines = context.connectedTools.map((tool) => {
      const desc = tool.description ? `: ${tool.description}` : '';
      return `- ${tool.name}${desc}`;
    });
    sections.push(`\n### Connected MCP Tools & Integrations (${context.connectedTools.length}):\n${toolLines.join('\n')}`);
  }

  sections.push(`
Instructions:
- Provide concise, intelligent, and helpful responses.
- Always use the live financial and task context above when answering questions about finances, schedules, or workload.
- Use markdown formatting with bolding, bullet points, and code blocks where appropriate.
`);

  return sections.join('\n');
}

/**
 * Intelligent context-aware mock response generator for offline or test environments.
 */
export function generateContextualMockResponse(userMessage: string, context: AIContext): string {
  const query = userMessage.toLowerCase();

  // Savings / Financial inquiry
  if (query.includes('saving') || query.includes('net') || query.includes('balance') || query.includes('finance') || query.includes('income')) {
    if (context.financialSummary && (context.financialSummary.netSavings !== undefined || context.financialSummary.monthlyIncome !== undefined)) {
      const fin = context.financialSummary;
      const curr = fin.currency || 'USD';
      return `### Financial Summary\n\nBased on your connected accounts:\n- **Net Personal Savings / Balance:** \`${curr} ${(fin.netSavings ?? 0).toLocaleString()}\`\n- **Monthly Income:** \`${curr} ${(fin.monthlyIncome ?? 0).toLocaleString()}\`\n- **Monthly Expenses:** \`${curr} ${(fin.monthlyExpenses ?? 0).toLocaleString()}\`\n- **Connected Accounts:** ${fin.accountsCount ?? 1}\n\nYour finances are being tracked live through Pulse Finance. Would you like me to run a monthly reconciliation or categorize recent spend?`;
    }
    return `### Financial Overview\n\n- **Estimated Net Savings:** \`$18,450.00\`\n- **Monthly Inflow:** \`$5,200.00\`\n- **Monthly Outflow:** \`$2,850.00\`\n- **Projected Savings Rate:** **45.2%**\n\nAll accounts are balanced and reconciled against recent bank alerts.`;
  }

  // Tasks inquiry
  if (query.includes('task') || query.includes('todo') || query.includes('overdue') || query.includes('workload')) {
    if (context.activeTasks.length > 0) {
      const critical = context.activeTasks.filter(t => t.priority === 'critical' || t.priority === 'high');
      const taskList = context.activeTasks.slice(0, 5).map(t => `- **${t.title}** (${t.priority} priority, status: \`${t.status}\`)`).join('\n');
      return `### Tasks Overview\n\nYou currently have **${context.activeTasks.length} active tasks** in this workspace.\n\n${critical.length > 0 ? `⚠️ **High Priority (${critical.length}):**\n` + critical.map(t => `- ${t.title}`).join('\n') + '\n\n' : ''}**Recent Tasks:**\n${taskList}\n\nWould you like me to help re-prioritize or mark any of these complete?`;
    }
    return `### Tasks Status\n\nYou currently have no pending tasks marked overdue! All scheduled items for this sprint are up to date.`;
  }

  // Transactions inquiry
  if (query.includes('transaction') || query.includes('spent') || query.includes('expense')) {
    return `### Recent Transactions Analysis\n\n1. **Cloud Hosting Subscription** — \`$48.00\` (Categorized: Infrastructure)\n2. **Grocery & Living Expenses** — \`$124.50\` (Categorized: Personal Living)\n3. **Client Retainer Payment** — \`+$3,500.00\` (Categorized: Freelance/Consulting)\n\nOverall spending this week is well within your 30-day budget threshold.`;
  }

  // Default intelligent assistant response
  const toolsCount = context.connectedTools?.length || 0;
  const tasksCount = context.activeTasks.length;

  return `Hello! I'm your Pulse AI Assistant.

I'm synced with your workspace data:
- **Tasks:** ${tasksCount} active tasks tracked.
- **Integrations:** ${toolsCount} MCP tools and connected services active.
- **Finance Engine:** Connected to your multi-bank ledger.

How can I assist you today? You can ask me about your savings, pending tasks, or to run automated workflows.`;
}
