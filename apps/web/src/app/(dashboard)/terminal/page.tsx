'use client';

import * as React from 'react';
import {
  Terminal as TerminalIcon,
  Play,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Activity,
  Server,
  GitBranch,
  Cpu,
  Sparkles,
  Copy,
  Check,
  CornerDownLeft,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface TerminalEntry {
  id: string;
  command: string;
  timestamp: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  durationMs?: number;
  isLoading?: boolean;
}

const QUICK_COMMANDS = [
  { label: 'pulse health', cmd: 'pulse health', icon: Activity },
  { label: 'pulse mcp probe', cmd: 'pulse mcp probe', icon: Server },
  { label: 'git status', cmd: 'git status', icon: GitBranch },
  { label: 'git log', cmd: 'git log', icon: GitBranch },
  { label: 'sys info', cmd: 'sys info', icon: Cpu },
  { label: 'clear', cmd: 'clear', icon: Trash2 },
];

export default function TerminalPage() {
  const [entries, setEntries] = React.useState<TerminalEntry[]>([
    {
      id: 'init',
      command: '',
      timestamp: new Date().toLocaleTimeString(),
      stdout: [
        '⚡ Pulse Cloud Terminal & Web CLI Sandbox [v1.0.0]',
        'Connected to Pulse Gateway API • Authenticated Session',
        '────────────────────────────────────────────────────────────',
        'Type "help" to view available commands or click a Quick Action.',
      ].join('\n'),
      exitCode: 0,
      isLoading: false,
    },
  ]);

  const [input, setInput] = React.useState('');
  const [history, setHistory] = React.useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = React.useState<number>(-1);
  const [savedDraft, setSavedDraft] = React.useState('');
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const terminalBottomRef = React.useRef<HTMLDivElement>(null);
  const terminalContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever entries change
  React.useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, isExecuting]);

  // Keep focus on the terminal prompt input
  const focusInput = () => {
    inputRef.current?.focus();
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const executeCommand = async (cmdToRun: string) => {
    const trimmed = cmdToRun.trim();
    if (!trimmed) return;

    // Handle "clear" client-side directly
    if (trimmed.toLowerCase() === 'clear') {
      setEntries([]);
      setInput('');
      setHistory((prev) => [trimmed, ...prev.filter((h) => h !== trimmed)]);
      setHistoryIndex(-1);
      return;
    }

    // Append to history
    setHistory((prev) => [trimmed, ...prev.filter((h) => h !== trimmed)]);
    setHistoryIndex(-1);
    setInput('');

    const entryId = `entry-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newEntry: TerminalEntry = {
      id: entryId,
      command: trimmed,
      timestamp: new Date().toLocaleTimeString(),
      isLoading: true,
    };

    setEntries((prev) => [...prev, newEntry]);
    setIsExecuting(true);

    try {
      const resp = await apiClient.post<{
        success: boolean;
        command: string;
        stdout: string;
        stderr: string;
        exitCode: number;
        durationMs: number;
      }>('/terminal/exec', { command: trimmed });

      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? {
                ...e,
                isLoading: false,
                stdout: resp.stdout,
                stderr: resp.stderr,
                exitCode: resp.exitCode,
                durationMs: resp.durationMs,
              }
            : e
        )
      );
    } catch (err: any) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? {
                ...e,
                isLoading: false,
                stderr: err.message || 'Execution failed.',
                exitCode: 1,
                durationMs: 0,
              }
            : e
        )
      );
    } finally {
      setIsExecuting(false);
      setTimeout(focusInput, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isExecuting) {
        executeCommand(input);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;

      if (historyIndex === -1) {
        setSavedDraft(input);
        const nextIndex = 0;
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      } else if (historyIndex < history.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput(savedDraft);
      }
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setEntries([]);
    }
  };

  // Syntax and status styling helper
  const renderOutputLine = (line: string, index: number) => {
    if (!line) return <div key={index} className="h-4" />;

    // Success / Healthy badges
    if (
      line.startsWith('✅') ||
      line.startsWith('⚡') ||
      line.startsWith('● Database:         ONLINE') ||
      line.startsWith('● API Server:       ONLINE') ||
      line.includes('Status: All core services operational')
    ) {
      return (
        <div key={index} className="text-emerald-400 font-medium">
          {line}
        </div>
      );
    }

    // Error / Failure
    if (line.startsWith('❌') || line.startsWith('🔴') || line.includes('OFFLINE') || line.includes('failed')) {
      return (
        <div key={index} className="text-rose-400 font-medium">
          {line}
        </div>
      );
    }

    // AI / Agent Response
    if (line.startsWith('🤖')) {
      return (
        <div key={index} className="text-purple-400 font-semibold">
          {line}
        </div>
      );
    }

    // Network / Probing URLs
    if (line.startsWith('🔌') || line.includes('http://') || line.includes('https://')) {
      return (
        <div key={index} className="text-cyan-400">
          {line}
        </div>
      );
    }

    // Section dividers
    if (line.startsWith('---') || line.startsWith('===') || line.startsWith('───')) {
      return (
        <div key={index} className="text-slate-600">
          {line}
        </div>
      );
    }

    // Numbered tool or integration listings
    if (/^\s*\d+\.\s+/.test(line)) {
      return (
        <div key={index} className="text-emerald-300 pl-2">
          {line}
        </div>
      );
    }

    return (
      <div key={index} className="text-slate-200">
        {line}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      {/* Top Bar: Title & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#151B23] p-3 rounded-xl border border-[#1C2430]">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TerminalIcon size={20} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white flex items-center gap-2">
              Cloud Terminal
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sandbox
              </span>
            </h1>
            <p className="text-xs text-slate-400">Safe authenticated CLI runtime</p>
          </div>
        </div>

        {/* Quick Command Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_COMMANDS.map((qc) => {
            const IconComponent = qc.icon;
            return (
              <button
                key={qc.cmd}
                onClick={() => executeCommand(qc.cmd)}
                disabled={isExecuting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg bg-[#0B0F14] text-slate-300 border border-[#1C2430] hover:border-emerald-500/50 hover:text-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <IconComponent size={13} className="text-slate-400 group-hover:text-emerald-400" />
                <span>{qc.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Terminal Shell Window */}
      <div
        ref={terminalContainerRef}
        onClick={focusInput}
        className="flex-1 flex flex-col bg-[#0B0F14] border border-[#1C2430] rounded-xl shadow-2xl overflow-hidden font-mono cursor-text"
      >
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#151B23] border-b border-[#1C2430] select-none">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
            <span className="text-xs text-slate-400 font-sans ml-2">pulse@cloud-terminal ~ bash</span>
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-400 font-sans">
            <span>node {process.version || 'v20.x'}</span>
            <span className="text-slate-600">|</span>
            <span>UTF-8</span>
          </div>
        </div>

        {/* Output Viewport */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs leading-relaxed">
          {entries.map((entry) => (
            <div key={entry.id} className="space-y-1.5 group">
              {/* Command line */}
              {entry.command && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-900/60">
                  <div className="flex items-center space-x-2 text-emerald-400 font-semibold">
                    <span className="text-emerald-500 font-bold select-none">pulse &gt;</span>
                    <span className="text-white">{entry.command}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-sans">
                    {entry.durationMs !== undefined && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {entry.durationMs}ms
                      </span>
                    )}
                    {entry.exitCode !== undefined && (
                      <span
                        className={`px-1.5 py-0.5 rounded border ${
                          entry.exitCode === 0
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        exit {entry.exitCode}
                      </span>
                    )}
                    <span className="text-slate-600">{entry.timestamp}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(entry.id, `${entry.stdout || ''}\n${entry.stderr || ''}`.trim());
                      }}
                      className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                      title="Copy output"
                    >
                      {copiedId === entry.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Execution Loading Indicator */}
              {entry.isLoading && (
                <div className="flex items-center space-x-2 text-emerald-400/80 py-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="animate-pulse">Executing command in sandbox...</span>
                </div>
              )}

              {/* Standard Output */}
              {entry.stdout && (
                <div className="whitespace-pre-wrap font-mono break-all pl-2 border-l-2 border-slate-800 py-0.5">
                  {entry.stdout.split('\n').map((line, i) => renderOutputLine(line, i))}
                </div>
              )}

              {/* Standard Error */}
              {entry.stderr && (
                <div className="whitespace-pre-wrap font-mono break-all pl-2 border-l-2 border-rose-500/60 py-1 text-rose-400 bg-rose-500/5 rounded-r">
                  {entry.stderr}
                </div>
              )}
            </div>
          ))}

          {/* Interactive Command Prompt Line */}
          <div className="flex items-center space-x-2 pt-2 border-t border-slate-900/60">
            <span className="text-emerald-400 font-bold select-none whitespace-nowrap">pulse &gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isExecuting}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              placeholder={isExecuting ? 'Waiting for execution...' : 'type command (e.g. pulse health, git status)...'}
              className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none placeholder:text-slate-600 caret-emerald-400 disabled:opacity-50"
            />
            {isExecuting ? (
              <div className="w-3 h-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin mr-2" />
            ) : (
              <button
                onClick={() => executeCommand(input)}
                className="text-slate-500 hover:text-emerald-400 transition-colors p-1"
                title="Execute (Enter)"
              >
                <CornerDownLeft size={14} />
              </button>
            )}
          </div>

          <div ref={terminalBottomRef} />
        </div>
      </div>
    </div>
  );
}
