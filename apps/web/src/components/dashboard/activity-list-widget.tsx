'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Activity, Terminal, Bell, CheckCircle, AlertCircle, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardWidget } from '@/types/dashboard';

interface ActivityItem {
  id: string;
  type: 'tool_invocation' | 'notification' | 'system';
  title: string;
  subtitle: string;
  timestamp: string;
  status?: string;
}

const defaultActivities: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'tool_invocation',
    title: 'Ran tool: notion.sync_salary_to_notion',
    subtitle: 'Success • 142ms',
    timestamp: '5m ago',
    status: 'success',
  },
  {
    id: 'act-2',
    type: 'notification',
    title: 'Pulse Phase 3 Activated',
    subtitle: 'Smart Dashboard & Notifications deployed',
    timestamp: '18m ago',
    status: 'info',
  },
  {
    id: 'act-3',
    type: 'tool_invocation',
    title: 'Ran tool: finance.run_financial_reconciliation',
    subtitle: 'Success • 380ms',
    timestamp: '1h ago',
    status: 'success',
  },
  {
    id: 'act-4',
    type: 'notification',
    title: 'MCP Gateway SSE Connected',
    subtitle: 'Connected 12 tools from prabu-life-os-remote',
    timestamp: '2h ago',
    status: 'info',
  },
];

interface ActivityListWidgetProps {
  widget: DashboardWidget;
  onRemove?: (id: string) => void;
  items?: ActivityItem[];
}

export function ActivityListWidget({ widget, onRemove, items = defaultActivities }: ActivityListWidgetProps) {
  return (
    <Card className="relative group border border-surface-elevated shadow-sm flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Activity size={16} />
          </div>
          <CardTitle className="text-base font-semibold text-text">{widget.title}</CardTitle>
        </div>
        {onRemove && (
          <button
            onClick={() => onRemove(widget.id)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-elevated text-text-muted hover:text-expense transition-all"
            aria-label="Remove widget"
          >
            <X size={14} />
          </button>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto divide-y divide-surface-elevated pt-0">
        {items.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-sm">No recent activity</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0">
              <div className="mt-0.5 p-1.5 rounded bg-surface-elevated text-text-muted shrink-0">
                {item.type === 'tool_invocation' ? (
                  <Terminal size={14} className="text-primary" />
                ) : (
                  <Bell size={14} className="text-broker" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-text truncate">{item.title}</p>
                  <span className="text-[11px] text-text-muted shrink-0">{item.timestamp}</span>
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">{item.subtitle}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
