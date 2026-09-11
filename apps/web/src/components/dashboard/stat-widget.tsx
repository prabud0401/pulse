'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plug, CheckSquare, Wallet, Bell, ArrowUpRight, TrendingUp, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardWidget } from '@/types/dashboard';

interface StatWidgetProps {
  widget: DashboardWidget;
  onRemove?: (id: string) => void;
  data?: {
    value?: string | number;
    change?: string;
    subtitle?: string;
  };
}

const iconMap: Record<string, React.ElementType> = {
  Plug,
  CheckSquare,
  Wallet,
  Bell,
  TrendingUp,
};

export function StatWidget({ widget, onRemove, data }: StatWidgetProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const iconKey = (widget.config?.icon as string) || 'TrendingUp';
  const IconComponent = iconMap[iconKey] || TrendingUp;
  const color = (widget.config?.color as string) || 'primary';

  const colorStyles: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-500' },
    emerald: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-500' },
    violet: { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-500' },
    amber: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-500' },
    primary: { bg: 'bg-primary/10 dark:bg-primary/20', text: 'text-primary' },
  };

  const currentColors = colorStyles[color] || colorStyles.primary;

  // Derive value if not provided
  let displayValue = data?.value ?? '$0.00';
  let changeText = data?.change ?? '+0.0%';

  if (!data?.value) {
    if (widget.title.includes('Integration')) {
      displayValue = '3';
      changeText = '+1 this week';
    } else if (widget.title.includes('Task')) {
      displayValue = '7';
      changeText = '3 due today';
    } else if (widget.title.includes('Saving') || widget.title.includes('Net')) {
      displayValue = '$24,850.00';
      changeText = '+14.2% MoM';
    } else if (widget.title.includes('Alert') || widget.title.includes('Notification')) {
      displayValue = '2';
      changeText = 'Needs attention';
    }
  }

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <Card className="relative group overflow-hidden border border-surface-elevated hover:border-primary/40 transition-all shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-text-muted">{widget.title}</CardTitle>
        <div className="flex items-center gap-1.5">
          <div className={cn('p-2 rounded-lg transition-transform group-hover:scale-105', currentColors.bg, currentColors.text)}>
            <IconComponent size={18} />
          </div>
          {onRemove && (
            <button
              onClick={() => onRemove(widget.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-elevated text-text-muted hover:text-expense transition-all"
              aria-label="Remove widget"
              title="Remove widget"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-text flex items-baseline justify-between">
          <span>{displayValue}</span>
          <button
            onClick={handleRefresh}
            className={cn('text-text-muted hover:text-text transition-transform', isRefreshing && 'animate-spin')}
            title="Refresh"
          >
            <RefreshCw size={12} />
          </button>
        </div>
        <p className="text-xs text-income mt-1 flex items-center gap-1 font-medium">
          <ArrowUpRight size={13} />
          <span>{changeText}</span>
        </p>
      </CardContent>
    </Card>
  );
}
