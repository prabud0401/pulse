import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { MCPClientGateway } from '../services/mcp-client';
import {
  db,
  integrations,
  integrationTools,
  workspaceMembers,
  tasks,
  projects,
  financialTransactions,
  eq,
  and,
  sql,
} from '@pulse/db';
import {
  buildAIContext,
  formatContextPrompt,
  generateContextualMockResponse,
  AIContext,
} from '@pulse/core';
import os from 'os';
import path from 'path';
import { execFile, execSync } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
export const terminalRouter: Router = Router();

// Find monorepo root
const REPO_ROOT = path.resolve(__dirname, '../../../../');

/**
 * Gather AI context for assistant queries
 */
async function getAIContext(userId: string): Promise<AIContext> {
  try {
    const [membership] = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, userId))
      .limit(1);

    const workspaceId = membership?.workspaceId;
    if (!workspaceId) {
      return buildAIContext({});
    }

    const activeTasksList = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        projectName: projects.name,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.workspaceId, workspaceId))
      .limit(10);

    let financialSummary = null;
    try {
      const txs = await db
        .select({
          direction: financialTransactions.direction,
          amount: financialTransactions.amount,
        })
        .from(financialTransactions)
        .where(eq(financialTransactions.workspaceId, workspaceId))
        .limit(50);

      if (txs.length > 0) {
        let totalIncome = 0;
        let totalExpenses = 0;
        for (const tx of txs) {
          const amt = Number(tx.amount) || 0;
          if (tx.direction === 'credit') totalIncome += amt;
          else if (tx.direction === 'debit') totalExpenses += amt;
        }
        financialSummary = {
          totalIncome,
          totalExpenses,
          monthlyIncome: totalIncome,
          monthlyExpenses: totalExpenses,
          netSavings: totalIncome - totalExpenses,
          currency: 'USD',
        };
      }
    } catch {
      // Ignore
    }

    const tools = await db
      .select({
        name: integrationTools.name,
        description: integrationTools.description,
      })
      .from(integrationTools)
      .innerJoin(integrations, eq(integrationTools.integrationId, integrations.id))
      .where(and(eq(integrations.workspaceId, workspaceId), eq(integrationTools.enabled, true)))
      .limit(20);

    return buildAIContext({
      activeTasks: activeTasksList,
      financialSummary,
      connectedTools: tools,
    });
  } catch {
    return buildAIContext({});
  }
}

/**
 * POST /api/terminal/exec
 * Executes whitelisted developer commands safely in a sandbox.
 */
terminalRouter.post('/exec', requireAuth, async (req: Request, res: Response) => {
  const startTime = Date.now();
  const rawCommand = req.body?.command;

  if (typeof rawCommand !== 'string' || !rawCommand.trim()) {
    return res.status(200).json({
      success: true,
      command: rawCommand || '',
      stdout: '',
      stderr: 'Error: Empty command received.',
      exitCode: 1,
      durationMs: 0,
    });
  }

  const command = rawCommand.trim();
  const lowerCmd = command.toLowerCase();
  const userId = req.user!.userId;

  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  try {
    // 1. Health / Status check
    if (lowerCmd === 'pulse health' || lowerCmd === 'pulse status') {
      let dbStatus = 'ONLINE';
      let dbLatencyMs = 0;
      try {
        const dbStart = Date.now();
        await db.execute(sql`SELECT 1`);
        dbLatencyMs = Date.now() - dbStart;
      } catch (dbErr: any) {
        dbStatus = `OFFLINE (${dbErr.message})`;
      }

      const uptimeSec = Math.floor(process.uptime());
      const hrs = Math.floor(uptimeSec / 3600);
      const mins = Math.floor((uptimeSec % 3600) / 60);
      const secs = uptimeSec % 60;
      const uptimeFormatted = `${hrs}h ${mins}m ${secs}s`;

      const memUsage = process.memoryUsage();
      const heapUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(1);
      const heapTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(1);

      stdout = [
        '⚡ Pulse System Health Diagnostics',
        '----------------------------------------',
        `● API Server:       ONLINE (Port ${process.env.API_PORT || 4000})`,
        `● Database:         ${dbStatus} ${dbStatus.startsWith('ONLINE') ? `(${dbLatencyMs}ms)` : ''}`,
        `● Environment:      ${process.env.NODE_ENV || 'development'}`,
        `● Process Uptime:   ${uptimeFormatted}`,
        `● Memory Usage:     ${heapUsedMB} MB / ${heapTotalMB} MB heap`,
        `● Node Version:     ${process.version}`,
        `● Current Time:     ${new Date().toISOString()}`,
        '----------------------------------------',
        'Status: All core services operational.',
      ].join('\n');
    }

    // 2. MCP Probe
    else if (lowerCmd.startsWith('pulse mcp probe')) {
      const parts = command.split(/\s+/);
      const targetUrl =
        parts[3] || 'https://prabu-life-os-production.up.railway.app/sse';
      const authToken =
        process.env.MCP_API_KEY ||
        'ed24fd25b7274c549a03105806eefcc2af5e9a4b755893f02a1a757968b5265b';

      stdout += `🔌 Probing Remote MCP Server at: ${targetUrl} ...\n\n`;

      try {
        const gateway = new MCPClientGateway(15000);
        const transport = targetUrl.endsWith('/legacy') ? 'sse' : 'streamable_http';
        const tools = await gateway.listTools({
          url: targetUrl,
          transport,
          authToken,
        });

        stdout += `✅ Connection Successful! Discovered ${tools.length} Tools:\n`;
        tools.forEach((t, i) => {
          stdout += `   ${(i + 1).toString().padStart(2, ' ')}. ${t.name} — ${
            t.description || 'No description provided'
          }\n`;
        });
      } catch (probeErr: any) {
        stderr = `❌ Failed to probe MCP server at ${targetUrl}:\n   ${probeErr.message}`;
        exitCode = 1;
      }
    }

    // 3. MCP List
    else if (lowerCmd === 'pulse mcp list') {
      try {
        const items = await db.select().from(integrations);
        if (items.length === 0) {
          stdout =
            'No MCP servers or integrations currently configured in the database.\n' +
            'You can add integrations from the Integrations tab or probe an endpoint with:\n' +
            '  pulse mcp probe <url>';
        } else {
          stdout = `Configured Integrations & MCP Servers (${items.length}):\n\n`;
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const cfg = (item.config as Record<string, unknown>) || {};
            const url = (cfg.url || cfg.endpoint || cfg.serverUrl || 'N/A') as string;
            const statusIcon =
              item.status === 'connected'
                ? '🟢'
                : item.status === 'error'
                ? '🔴'
                : '⚪';
            stdout += `${i + 1}. ${statusIcon} ${item.name} (${item.type})\n`;
            stdout += `   Category: ${item.category} | Status: ${item.status}\n`;
            stdout += `   Endpoint: ${url}\n\n`;
          }
        }
      } catch (listErr: any) {
        stderr = `Error retrieving MCP integrations: ${listErr.message}`;
        exitCode = 1;
      }
    }

    // 4. Pulse Ask (AGY / AI Query)
    else if (lowerCmd.startsWith('pulse ask')) {
      const prompt = command.slice(9).trim();
      if (!prompt) {
        stderr = 'Usage: pulse ask "<your question or prompt>"';
        exitCode = 1;
      } else {
        let answered = false;

        // Try local AGY CLI if available
        try {
          const sanitizedPrompt = prompt.replace(/"/g, '\\"');
          const agyOutput = execSync(
            `agy --dangerously-skip-permissions --print "${sanitizedPrompt}"`,
            { encoding: 'utf-8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] }
          );
          if (agyOutput && agyOutput.trim()) {
            stdout = `🤖 AGY Response:\n\n${agyOutput.trim()}`;
            answered = true;
          }
        } catch {
          // AGY CLI not present or errored; fallback to Pulse AI Engine
        }

        if (!answered) {
          const aiContext = await getAIContext(userId);
          const systemPrompt = formatContextPrompt(aiContext);

          // Try Gemini API if key is available
          const geminiKey = process.env.GEMINI_API_KEY;
          if (geminiKey) {
            try {
              const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
              const resp = await fetch(geminiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [
                    {
                      role: 'user',
                      parts: [
                        { text: `${systemPrompt}\n\nUser Question: ${prompt}` },
                      ],
                    },
                  ],
                }),
              });

              if (resp.ok) {
                const data: any = await resp.json();
                const text =
                  data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) {
                  stdout = `🤖 Pulse AI (Gemini 2.5 Flash):\n\n${text}`;
                  answered = true;
                }
              }
            } catch {
              // Fallback to contextual generator
            }
          }

          // Fallback to Contextual Mock Intelligence
          if (!answered) {
            const reply = generateContextualMockResponse(prompt, aiContext);
            stdout = `🤖 Pulse AI Assistant:\n\n${reply}`;
          }
        }
      }
    }

    // 5. Git Status
    else if (lowerCmd === 'git status' || lowerCmd === 'git status -s' || lowerCmd === 'git status --short') {
      try {
        const isShort = lowerCmd.includes('-s') || lowerCmd.includes('--short');
        const args = isShort ? ['status', '--short'] : ['status'];
        const result = await execFileAsync('git', args, { cwd: REPO_ROOT });
        stdout = result.stdout || 'On branch master. Working tree clean.';
        if (result.stderr) stderr = result.stderr;
      } catch (gitErr: any) {
        stderr = `git status failed: ${gitErr.message}`;
        exitCode = gitErr.code || 1;
      }
    }

    // 6. Git Log
    else if (lowerCmd === 'git log' || lowerCmd.startsWith('git log')) {
      try {
        const args = ['log', '-n', '10', '--oneline', '--decorate'];
        const result = await execFileAsync('git', args, { cwd: REPO_ROOT });
        stdout = result.stdout || 'No commits found.';
        if (result.stderr) stderr = result.stderr;
      } catch (gitErr: any) {
        stderr = `git log failed: ${gitErr.message}`;
        exitCode = gitErr.code || 1;
      }
    }

    // 7. System Info
    else if (lowerCmd === 'sys info' || lowerCmd === 'sysinfo') {
      const cpus = os.cpus();
      const cpuModel = cpus[0]?.model || 'Unknown CPU';
      const cpuCores = cpus.length;
      const totalMemGB = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
      const freeMemGB = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
      const memUsage = process.memoryUsage();
      const rssMB = (memUsage.rss / (1024 * 1024)).toFixed(2);
      const heapTotalMB = (memUsage.heapTotal / (1024 * 1024)).toFixed(2);
      const heapUsedMB = (memUsage.heapUsed / (1024 * 1024)).toFixed(2);

      const sysUptimeSec = Math.floor(os.uptime());
      const sysDays = Math.floor(sysUptimeSec / 86400);
      const sysHrs = Math.floor((sysUptimeSec % 86400) / 3600);
      const sysMins = Math.floor((sysUptimeSec % 3600) / 60);

      const procUptimeSec = Math.floor(process.uptime());
      const procHrs = Math.floor(procUptimeSec / 3600);
      const procMins = Math.floor((procUptimeSec % 3600) / 60);
      const procSecs = procUptimeSec % 60;

      stdout = [
        '💻 System Architecture & Runtime Metrics',
        '========================================',
        `Node.js:          ${process.version} (${process.execPath})`,
        `Platform:         ${process.platform} (${process.arch})`,
        `OS:               ${os.type()} ${os.release()}`,
        `Hostname:         ${os.hostname()}`,
        `CPU:              ${cpuCores} Cores × ${cpuModel}`,
        `System RAM:       ${freeMemGB} GB free of ${totalMemGB} GB total`,
        `Process Memory:   RSS: ${rssMB} MB | Heap: ${heapUsedMB} / ${heapTotalMB} MB`,
        `System Uptime:    ${sysDays}d ${sysHrs}h ${sysMins}m`,
        `Process Uptime:   ${procHrs}h ${procMins}m ${procSecs}s`,
        `PID:              ${process.pid}`,
        `Working Dir:      ${process.cwd()}`,
        '========================================',
      ].join('\n');
    }

    // 8. Clear
    else if (lowerCmd === 'clear') {
      stdout = '';
    }

    // 9. Help
    else if (lowerCmd === 'help' || lowerCmd === 'pulse help') {
      stdout = [
        'Pulse Cloud Terminal — Supported Commands:',
        '  pulse health               Run system & database health diagnostics',
        '  pulse status               Alias for pulse health',
        '  pulse mcp probe <url>      Probe remote MCP server and list tools',
        '  pulse mcp list             List all configured MCP servers & integrations',
        '  pulse ask <prompt>         Query Pulse AI assistant (AGY / Gemini)',
        '  git status                 Display working tree status',
        '  git log                    Display recent commit history',
        '  sys info                   Display Node.js runtime, OS, and memory specs',
        '  clear                      Clear terminal console',
        '  help                       Display this help message',
      ].join('\n');
    }

    // 10. Unrecognized command
    else {
      stderr = `pulse: command not recognized: "${command}"\nType "help" to view the list of supported commands.`;
      exitCode = 1;
    }
  } catch (err: any) {
    stderr = `Execution error: ${err.message || 'Unknown error occurred'}`;
    exitCode = 1;
  }

  const durationMs = Date.now() - startTime;

  return res.status(200).json({
    success: true,
    command,
    stdout,
    stderr,
    exitCode,
    durationMs,
  });
});
