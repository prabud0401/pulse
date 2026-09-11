'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plug, Play, PlusSquare, CreditCard, Sparkles, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardWidget } from '@/types/dashboard';

interface ActionItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  href: string;
  color: string;
}

const defaultActions: ActionItem[] = [
  {
    id: 'mcp',
    label: 'Connect MCP',
    description: 'Add remote SSE or stdio server',
    icon: 'Plug',
    href: '/integrations/connect',
    color: 'text-primary bg-primary/10 border-primary/20',
  },
  {
    id: 'tool',
    label: 'Run Tool',
    description: 'Execute connected MCP tools',
    icon: 'Play',
    href: '/integrations',
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
  {
    id: 'task',
    label: 'Add Task',
    description: 'Create actionable priority item',
    icon: 'PlusSquare',
    href: '/tasks',
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'finance',
    label: 'Record Expense',
    description: 'Log transaction or upload statement',
    icon: 'CreditCard',
    href: '/finance',
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  },
];

const iconMap: Record<string, React.ElementType> = {
  Plug,
  Play,
  PlusSquare,
  CreditCard,
  Sparkles,
};

interface QuickActionsWidgetProps {
  widget: DashboardWidget;
  onRemove?: (id: string) => void;
}

export function QuickActionsWidget({ widget, onRemove }: QuickActionsWidgetProps) {
  return (
    <Card className="relative group border border-surface-elevated shadow-sm flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Sparkles size={16} />
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
      <CardContent className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0">
        {defaultActions.map((action) => {
          const Icon = iconMap[action.icon] || Sparkles;
          return (
            <Link
              key={action.id}
              href={action.href}
              className="flex items-start gap-3 p-3 rounded-xl border border-surface-elevated hover:border-primary/50 bg-surface-elevated/20 hover:bg-surface-elevated/60 transition-all group/item"
            >
              <div className={cn('p-2 rounded-lg shrink-0 transition-transform group-hover/item:scale-110', action.color)}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-text group-hover/item:text-primary transition-colors">
                    {action.label}
                  </h4>
                  <ArrowRight size={12} className="text-text-muted opacity-0 group-hover/item:opacity-100 transition-opacity" />
                </div>
                <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">{action.description}</p>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
