export type PromptTemplateCategory =
  | 'Engineering'
  | 'Finance'
  | 'Integrations'
  | 'Productivity'
  | 'Communication';

export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  category: PromptTemplateCategory;
  prompt: string;
  suggestedTool?: string;
  iconName: string;
  tags: string[];
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'daily-engineering-standup',
    title: 'Daily Engineering Standup',
    description: 'Formats open tasks, blockers, and recent commits into an agile engineering standup briefing.',
    category: 'Engineering',
    suggestedTool: 'search_tasks',
    iconName: 'CheckSquare',
    tags: ['agile', 'tasks', 'standup', 'engineering', 'sprint'],
    prompt: `Please compile a Daily Engineering Standup based on my active tasks and sprint context.

Format the output into:
1. 🚀 Accomplished Recently (completed tasks and resolved blockers)
2. 🎯 Today's Focus (high & critical priority tasks in progress)
3. 🚧 Active Blockers & Dependencies (items requiring unblocking or team follow-up)
4. ⏱️ Sprint Health & Risk Assessment`,
  },
  {
    id: 'financial-audit-reconciliation',
    title: 'Financial Audit & Reconciliation',
    description: 'Queries ledger & scenario projector to produce executive cash flow, runway, and health memo.',
    category: 'Finance',
    suggestedTool: 'get_income_summary',
    iconName: 'Wallet',
    tags: ['finance', 'audit', 'reconciliation', 'ledger', 'cashflow'],
    prompt: `Run a Financial Audit & Reconciliation on my workspace ledger and accounts.

Please provide an Executive Financial Health Memo including:
- 💰 Net Personal Savings & Total Inflows/Outflows
- 📊 Top Expenditure Categories vs Income Streams
- 📉 Monthly Burn Rate & Projected Runway (Months)
- 🔍 Reconciled Bank Alert Status & Any Discrepancies`,
  },
  {
    id: 'mcp-server-diagnostic',
    title: 'MCP Server Diagnostic',
    description: 'Probes connected MCP servers and reports latency, tool availability, and operational health.',
    category: 'Integrations',
    suggestedTool: 'check_health',
    iconName: 'Server',
    tags: ['mcp', 'diagnostic', 'health', 'latency', 'integrations'],
    prompt: `Execute an MCP Server Diagnostic probe across all registered integrations and tools.

Report the following:
1. 🔌 Connected MCP Servers (Google Workspace, Linear, Finance Ledger, etc.)
2. ⚡ Latency & Ping Times per server (ms)
3. 🛠️ Active & Available Tool Count
4. ⚠️ Any degraded, disconnected, or erroring integration endpoints`,
  },
  {
    id: 'sprint-retrospective',
    title: 'Sprint Retrospective',
    description: 'Analyzes completed vs pending sprint tasks, velocity, bottlenecks, and next cycle action items.',
    category: 'Productivity',
    suggestedTool: 'search_tasks',
    iconName: 'Layers',
    tags: ['sprint', 'retrospective', 'velocity', 'tasks', 'review'],
    prompt: `Perform a comprehensive Sprint Retrospective analysis on our workspace backlog.

Please analyze:
1. 📈 Sprint Velocity: Total planned vs completed tasks
2. ⏳ Carry-Over & Bottlenecks: Tasks lingering or pushed across deadlines
3. 💡 What Went Well vs Areas for Improvement
4. 📋 3 High-Impact Action Items for the upcoming sprint cycle`,
  },
  {
    id: 'client-email-drafter',
    title: 'Client Email Drafter',
    description: 'Drafts an executive, professional memo summarizing project milestone deliverables and next steps.',
    category: 'Communication',
    suggestedTool: 'list_emails',
    iconName: 'Mail',
    tags: ['email', 'client', 'communication', 'deliverables', 'memo'],
    prompt: `Draft a professional, executive Client Milestone Update Email.

Key elements to include:
- 🏆 Overview of recent milestones completed and delivered
- 🚀 Current progress on high-priority deliverables and QA testing
- 📅 Target deployment schedule for the upcoming release
- 🤝 Clear, professional closing with an invitation for client feedback`,
  },
];

/**
 * Find a prompt template by unique ID.
 */
export function getPromptTemplateById(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find((tpl) => tpl.id === id);
}

/**
 * Filter prompt templates by category.
 */
export function getPromptTemplatesByCategory(category: PromptTemplateCategory | 'All'): PromptTemplate[] {
  if (category === 'All') return PROMPT_TEMPLATES;
  return PROMPT_TEMPLATES.filter((tpl) => tpl.category === category);
}

/**
 * Fuzzy search prompt templates by keyword query.
 */
export function searchPromptTemplates(query: string): PromptTemplate[] {
  const q = query.toLowerCase().trim();
  if (!q) return PROMPT_TEMPLATES;

  return PROMPT_TEMPLATES.filter(
    (tpl) =>
      tpl.title.toLowerCase().includes(q) ||
      tpl.description.toLowerCase().includes(q) ||
      tpl.prompt.toLowerCase().includes(q) ||
      tpl.category.toLowerCase().includes(q) ||
      tpl.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}
