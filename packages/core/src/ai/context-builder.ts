import {
  AIContext,
  AITaskSummary,
  AIFinancialSummary,
  AIConnectedTool,
  AIToolInvocationResult,
} from '../types/ai';

export interface AIContextInput {
  activeTasks?: AITaskSummary[];
  financialSummary?: AIFinancialSummary | null;
  connectedTools?: AIConnectedTool[];
  workspaceName?: string;
  userName?: string;
  currentDate?: string;
  lastToolInvocation?: AIToolInvocationResult | null;
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
    lastToolInvocation: input.lastToolInvocation ?? null,
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

  // Tool Invocation Results (if an action was executed)
  if (context.lastToolInvocation) {
    const inv = context.lastToolInvocation;
    sections.push(`\n### Live Tool Execution Result:
- **Tool:** \`${inv.toolName}\` (${inv.status}, duration: ${inv.durationMs}ms)
${inv.integrationName ? `- **Integration:** ${inv.integrationName}` : ''}
- **Payload Data:**
\`\`\`json
${JSON.stringify(inv.output, null, 2)}
\`\`\`
CRITICAL INSTRUCTION: Synthesize the above live tool execution result directly into your reply. Present the data clearly with tables, bullet points, or executive summaries as requested.`);
  }

  sections.push(`
Instructions:
- Provide concise, intelligent, and helpful responses.
- Always use the live financial, task, and tool execution context above when answering questions.
- Use markdown formatting with bolding, bullet points, and code blocks where appropriate.
`);

  return sections.join('\n');
}

/**
 * Intelligent context-aware mock response generator for offline or test environments.
 */
export function generateContextualMockResponse(userMessage: string, context: AIContext): string {
  const query = userMessage.toLowerCase();

  // If a tool was executed, synthesize the live tool output directly!
  if (context.lastToolInvocation && context.lastToolInvocation.status === 'success') {
    const inv = context.lastToolInvocation;
    const output = inv.output as any;

    if (inv.toolName === 'list_emails' || inv.toolName === 'list_recent_emails') {
      const emails = output?.emails || [];
      const emailList = emails
        .map(
          (e: any) =>
            `- **${e.subject}**\n  *From:* \`${e.from}\` | *Date:* ${new Date(e.date).toLocaleString()}\n  > "${e.snippet}"`
        )
        .join('\n\n');

      return `### 📬 Recent Emails (${emails.length} found)\n\nI queried your connected email integration via MCP tool \`${inv.toolName}\` (${inv.durationMs}ms):\n\n${emailList}\n\n**Actionable Highlights:**\n- **Client Milestone:** Rick Gomez confirmed engineering deliverables are approved for deployment.\n- **Finance:** Cloud cluster invoice of \`$48.00\` was reconciled.\n\nWould you like me to draft a reply to Rick or schedule follow-up tasks?`;
    }

    if (inv.toolName === 'get_income_summary') {
      const curr = output?.currency || 'USD';
      const netSavings = output?.netPersonalSavings !== undefined ? output.netPersonalSavings.toLocaleString() : '18,450.00';
      const monthlyIncome = output?.monthlyIncome !== undefined ? output.monthlyIncome.toLocaleString() : '5,200.00';
      const monthlyExpenses = output?.monthlyExpenses !== undefined ? output.monthlyExpenses.toLocaleString() : '2,850.00';
      const savingsRate = output?.savingsRate || '45.19%';
      const runway = output?.runwayMonths || 6.4;

      return `### 📊 Executive Financial Health Memo\n\n*Executed live tool \`${inv.toolName}\` across workspace accounts (${inv.durationMs}ms)*\n\n- **Net Personal Savings:** \`${curr} ${netSavings}\`\n- **Monthly Inflow (Income):** \`+${curr} ${monthlyIncome}\`\n- **Monthly Outflow (Burn):** \`-${curr} ${monthlyExpenses}\`\n- **Target Savings Rate:** **${savingsRate}**\n- **Projected Cash Runway:** **${runway} months**\n\n**Top Expenditure Categories:**\n1. Consulting & Engineering Retainer: \`$4,200.00\` (Inflow)\n2. Software & Subscriptions: \`$1,000.00\` (Inflow)\n3. Living & Office Expenses: \`$620.00\` (Outflow)\n4. Cloud Infrastructure: \`$48.00\` (Outflow)\n\n✅ **Reconciliation Status:** All multi-bank feeds and SMS alerts match cleanly.`;
    }

    if (
      inv.toolName === 'check_health' ||
      inv.toolName === 'mcp_server_diagnostic' ||
      inv.toolName === 'server_diagnostic'
    ) {
      const servers = output?.servers || [];
      const serverRows = servers
        .map(
          (s: any) =>
            `| **${s.name}** | \`${s.status.toUpperCase()}\` | \`${s.latencyMs}ms\` | **${s.toolsAvailable}** tools |`
        )
        .join('\n');

      return `### ⚡ MCP Server Diagnostic Report\n\n*Probed ${servers.length} connected MCP servers (Gateway latency: ${inv.durationMs}ms)*\n\n| Server Endpoint | Status | Ping Latency | Available Tools |\n| :--- | :--- | :--- | :--- |\n${serverRows}\n\n- **Cluster Health:** 🟢 **Healthy** (Zero packet drops)\n- **Active Tools Registered:** **${output?.activeToolsCount || 19} tools**\n- **Average Server Latency:** \`${output?.averageLatencyMs || 38.0}ms\`\n\nAll remote SSE and HTTP transport pipelines are operating within standard SLA limits.`;
    }

    if (inv.toolName === 'search_tasks' || inv.toolName === 'list_tasks') {
      const tasks = output?.tasks || [];

      // If user requested standup format
      if (query.includes('standup') || query.includes('daily')) {
        const completed = tasks.filter((t: any) => t.status === 'done');
        const inProgress = tasks.filter((t: any) => t.status === 'in_progress');
        const blockers = tasks.filter((t: any) => t.priority === 'critical');

        return `### 🚀 Daily Engineering Standup Briefing\n\n*Synthesized from live workspace tasks via \`${inv.toolName}\`*\n\n#### 1. Accomplished Recently\n${completed.length > 0 ? completed.map((t: any) => `- [x] **${t.title}** (${t.projectName || 'General'})`).join('\n') : '- Completed MCP client test harness and connection lifecycle tests.'}\n\n#### 2. Today's Focus (In Progress)\n${inProgress.map((t: any) => `- [ ] **${t.title}** [${t.priority.toUpperCase()}] (Project: ${t.projectName || 'Core'})\n  - Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'Today'}`).join('\n')}\n\n#### 3. Active Blockers & Dependencies\n${blockers.length > 0 ? blockers.map((t: any) => `- ⚠️ **${t.title}** — flagged critical for upcoming release.`).join('\n') : '- No critical blockers reported today.'}\n\n#### 4. Sprint Health\n- Overall progress is tracking on schedule for the upcoming deployment.`;
      }

      // If user requested retrospective format
      if (query.includes('retro') || query.includes('sprint')) {
        return `### 📈 Sprint Retrospective Analysis\n\n*Backlog velocity analyzed via live tool \`${inv.toolName}\`*\n\n1. **Sprint Velocity & Completion Rate:**\n   - **Total Active Tasks Evaluated:** ${tasks.length}\n   - **Milestone Delivery Rate:** **85% on-time completion**\n\n2. **Carry-Over & Bottlenecks:**\n   - Bank SMS pipeline testing encountered slight staging delays.\n   - Prompt studio drawer requires final end-to-end typecheck.\n\n3. **What Went Well:**\n   - MCP gateway SSE transport implemented with zero regressions.\n   - Dynamic tool calling response times consistently under 250ms.\n\n4. **Recommended Action Items:**\n   - [ ] Standardize simulated tool fallbacks across all plugins.\n   - [ ] Add automated telemetry for MCP server latency checks.\n   - [ ] Schedule sprint demo with client lead Rick Gomez.`;
      }

      const taskLines = tasks.map((t: any) => `- [${t.status.toUpperCase()}] **${t.title}** (${t.priority} priority, project: ${t.projectName || 'General'})`).join('\n');
      return `### 📋 Active Tasks Summary\n\n*Queried via \`${inv.toolName}\` (${inv.durationMs}ms)*\n\n${taskLines}\n\nWould you like me to help update statuses or assign any of these?`;
    }

    if (
      inv.toolName === 'run_financial_reconciliation' ||
      inv.toolName === 'financial_reconciliation'
    ) {
      return `### 📑 Financial Audit & Reconciliation Result\n\n- **Reconciled Transactions:** **${output?.reconciledCount || 42}**\n- **Unmatched Discrepancies:** **${output?.unmatchedCount || 0}**\n- **Total Reconciled Volume:** \`$${output?.totalReconciledAmount?.toLocaleString() || '7,450.00'}\`\n- **Audit Status:** 🟢 **Passed** (No anomalies detected)\n\nAll ledger accounts are synchronized with bank statements.`;
    }

    // Generic tool output synthesis
    return `### ⚡ Tool Execution: \`${inv.toolName}\`\n\nExecuted successfully in \`${inv.durationMs}ms\` via ${inv.integrationName || 'Pulse Gateway'}.\n\n\`\`\`json\n${JSON.stringify(output, null, 2)}\n\`\`\`\n\nIs there anything specific in this data you would like me to analyze further?`;
  }

  // Savings / Financial inquiry
  if (
    query.includes('saving') ||
    query.includes('net') ||
    query.includes('balance') ||
    query.includes('finance') ||
    query.includes('income')
  ) {
    if (
      context.financialSummary &&
      (context.financialSummary.netSavings !== undefined ||
        context.financialSummary.monthlyIncome !== undefined)
    ) {
      const fin = context.financialSummary;
      const curr = fin.currency || 'USD';
      return `### Financial Summary\n\nBased on your connected accounts:\n- **Net Personal Savings / Balance:** \`${curr} ${(fin.netSavings ?? 0).toLocaleString()}\`\n- **Monthly Income:** \`${curr} ${(fin.monthlyIncome ?? 0).toLocaleString()}\`\n- **Monthly Expenses:** \`${curr} ${(fin.monthlyExpenses ?? 0).toLocaleString()}\`\n- **Connected Accounts:** ${fin.accountsCount ?? 1}\n\nYour finances are being tracked live through Pulse Finance. Would you like me to run a monthly reconciliation or categorize recent spend?`;
    }
    return `### Financial Overview\n\n- **Estimated Net Savings:** \`$18,450.00\`\n- **Monthly Inflow:** \`$5,200.00\`\n- **Monthly Outflow:** \`$2,850.00\`\n- **Projected Savings Rate:** **45.2%**\n\nAll accounts are balanced and reconciled against recent bank alerts.`;
  }

  // Client Email drafting inquiry
  if (query.includes('client email') || (query.includes('client') && query.includes('email'))) {
    return `### ✉️ Draft: Client Milestone Update\n\n**To:** Rick Gomez <rick.gomez@clientcorp.com>\n**Subject:** Milestone Update: Pulse AI Assistant & MCP Tool Calling Delivery\n\n---\n\nHi Rick,\n\nI hope you're having a productive week.\n\nI wanted to share a brief update on our latest sprint milestones for the Pulse platform:\n\n1. **Dynamic AI Tool Calling:** Successfully integrated live tool execution with our MCP client gateway. Queries for emails, financial ledgers, and system diagnostics now execute live with sub-250ms latency.\n2. **Prompt Studio:** Deployed pre-crafted professional templates for engineering standups, financial audits, and diagnostics.\n3. **Quality & Performance:** End-to-end test suites and production build validations are passing cleanly across core, API, and web.\n\nWe are on schedule for the upcoming deployment on Monday. Please let me know if you would like to review the live demonstration beforehand.\n\nBest regards,\n**Prabudeva**\nLead Engineer, Pulse`;
  }

  // Tasks inquiry
  if (
    query.includes('task') ||
    query.includes('todo') ||
    query.includes('overdue') ||
    query.includes('workload') ||
    query.includes('standup')
  ) {
    if (context.activeTasks.length > 0) {
      const critical = context.activeTasks.filter(
        (t) => t.priority === 'critical' || t.priority === 'high'
      );
      const taskList = context.activeTasks
        .slice(0, 5)
        .map((t) => `- **${t.title}** (${t.priority} priority, status: \`${t.status}\`)`)
        .join('\n');
      return `### Tasks Overview\n\nYou currently have **${context.activeTasks.length} active tasks** in this workspace.\n\n${critical.length > 0 ? `⚠️ **High Priority (${critical.length}):**\n` + critical.map((t) => `- ${t.title}`).join('\n') + '\n\n' : ''}**Recent Tasks:**\n${taskList}\n\nWould you like me to help re-prioritize or mark any of these complete?`;
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

How can I assist you today? You can ask me to run MCP diagnostics, summarize your finances, or generate your daily engineering standup from the Prompt Studio.`;
}
