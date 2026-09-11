#!/usr/bin/env node
/**
 * Pulse Developer & Admin CLI
 * Usage:
 *   pnpm pulse health
 *   pnpm pulse mcp probe <url>
 *   pnpm pulse ask "<prompt>"
 */

import { execSync } from 'child_process';

const args = process.argv.slice(2);
const command = args[0] || 'help';

async function main() {
  switch (command) {
    case 'health':
    case 'status': {
      console.log('🔍 Checking Pulse Services Status...\n');
      try {
        const res = await fetch('http://localhost:4000/api/health');
        if (res.ok) {
          const data = await res.json();
          console.log('✅ API Server: Running (port 4000)');
          console.log('   Data:', JSON.stringify(data));
        } else {
          console.log('⚠️ API Server: Returned status', res.status);
        }
      } catch {
        console.log('❌ API Server: Offline (http://localhost:4000)');
      }

      try {
        const res = await fetch('http://localhost:3000');
        if (res.ok) {
          console.log('✅ Web Dashboard: Running (port 3000)');
        } else {
          console.log('⚠️ Web Dashboard: Returned status', res.status);
        }
      } catch {
        console.log('❌ Web Dashboard: Offline (http://localhost:3000)');
      }
      break;
    }

    case 'mcp': {
      const subCmd = args[1];
      if (subCmd === 'probe') {
        const targetUrl = args[2] || 'https://prabu-life-os-production.up.railway.app/sse';
        console.log(`🔌 Probing Remote MCP Server at: ${targetUrl} ...\n`);
        try {
          const { MCPClientGateway } = await import('../packages/api/src/services/mcp-client');
          const gateway = new MCPClientGateway(10000);
          const tools = await gateway.listTools({ url: targetUrl, transport: 'sse' });
          console.log(`✅ Connection Successful! Discovered ${tools.length} Tools:`);
          tools.forEach((t, i) => {
            console.log(`   ${i + 1}. \x1b[36m${t.name}\x1b[0m — ${t.description || 'No description'}`);
          });
        } catch (err: any) {
          console.error('❌ Failed to probe MCP server:', err.message);
        }
      } else {
        console.log('Usage: pnpm pulse mcp probe <url>');
      }
      break;
    }

    case 'ask': {
      const prompt = args.slice(1).join(' ');
      if (!prompt) {
        console.log('Usage: pnpm pulse ask "<your question>"');
        return;
      }
      console.log(`🤖 Asking AGY CLI: "${prompt}"...\n`);
      try {
        const output = execSync(`agy --dangerously-skip-permissions --print "${prompt.replace(/"/g, '\\"')}"`, { encoding: 'utf-8' });
        console.log(output);
      } catch (err: any) {
        console.error('❌ AGY execution failed:', err.message);
      }
      break;
    }

    case 'help':
    default: {
      console.log(`
Pulse Developer CLI:
  pnpm pulse health          Check health of API and Web services
  pnpm pulse mcp probe [url] Probe remote MCP server and list available tools
  pnpm pulse ask "<prompt>"  Ask AGY CLI a question using local agent
  pnpm pulse help            Show this help menu
`);
      break;
    }
  }
}

main().catch(console.error);
