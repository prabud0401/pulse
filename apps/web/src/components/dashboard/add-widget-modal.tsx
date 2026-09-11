'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plug,
  CheckSquare,
  Wallet,
  Bell,
  Activity,
  Sparkles,
  BarChart3,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WidgetType, DashboardWidget } from '@/types/dashboard';

export interface WidgetTemplate {
  id: string;
  type: WidgetType;
  title: string;
  description: string;
  dataSource: string;
  config: Record<string, unknown>;
  icon: React.ElementType;
  color: string;
  colSpan: 'col-span-1' | 'col-span-2' | 'col-span-4';
}

const widgetTemplates: WidgetTemplate[] = [
  {
    id: 'tpl-stat-integrations',
    type: 'stat',
    title: 'Total Integrations',
    description: 'Displays the number of connected and available integrations.',
    dataSource: 'integrations.count',
    config: { icon: 'Plug', color: 'blue' },
    icon: Plug,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    colSpan: 'col-span-1',
  },
  {
    id: 'tpl-stat-tasks',
    type: 'stat',
    title: 'Active Tasks',
    description: 'Tracks open tasks, due today items, and completion rate.',
    dataSource: 'tasks.count',
    config: { icon: 'CheckSquare', color: 'emerald' },
    icon: CheckSquare,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    colSpan: 'col-span-1',
  },
  {
    id: 'tpl-stat-savings',
    type: 'stat',
    title: 'Net Savings',
    description: 'Monitors net worth, monthly cash flow, and monthly savings.',
    dataSource: 'finance.summary',
    config: { icon: 'Wallet', color: 'violet' },
    icon: Wallet,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    colSpan: 'col-span-1',
  },
  {
    id: 'tpl-stat-alerts',
    type: 'stat',
    title: 'Unread Alerts',
    description: 'Shows unread notifications and urgent system alerts.',
    dataSource: 'notifications.recent',
    config: { icon: 'Bell', color: 'amber' },
    icon: Bell,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    colSpan: 'col-span-1',
  },
  {
    id: 'tpl-activity-feed',
    type: 'list',
    title: 'Activity Feed',
    description: 'Live timeline of notifications and executed MCP tool invocations.',
    dataSource: 'activity.recent',
    config: { maxItems: 6 },
    icon: Activity,
    color: 'text-primary bg-primary/10 border-primary/20',
    colSpan: 'col-span-2',
  },
  {
    id: 'tpl-quick-actions',
    type: 'custom',
    title: 'Quick Actions',
    description: 'One-click shortcuts to connect MCPs, run tools, or record expenses.',
    dataSource: 'system.actions',
    config: {},
    icon: Sparkles,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    colSpan: 'col-span-2',
  },
];

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widget: Partial<DashboardWidget>) => void;
}

export function AddWidgetModal({ isOpen, onClose, onAddWidget }: AddWidgetModalProps) {
  const [selectedTemplate, setSelectedTemplate] = React.useState<WidgetTemplate>(widgetTemplates[0]);
  const [customTitle, setCustomTitle] = React.useState('');

  React.useEffect(() => {
    if (selectedTemplate) {
      setCustomTitle(selectedTemplate.title);
    }
  }, [selectedTemplate]);

  const handleAdd = () => {
    onAddWidget({
      id: `widget-${Date.now()}`,
      type: selectedTemplate.type,
      title: customTitle.trim() || selectedTemplate.title,
      dataSource: selectedTemplate.dataSource,
      config: selectedTemplate.config,
      position: {
        x: 0,
        y: 0,
        w: selectedTemplate.colSpan === 'col-span-2' ? 2 : 1,
        h: selectedTemplate.colSpan === 'col-span-2' ? 2 : 1,
      },
      createdAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Dashboard Widget"
      description="Choose a widget template to place on your workspace dashboard"
      size="lg"
    >
      <div className="space-y-6 pt-2">
        {/* Template Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto p-1">
          {widgetTemplates.map((template) => {
            const Icon = template.icon;
            const isSelected = selectedTemplate.id === template.id;

            return (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={cn(
                  'p-3.5 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 relative',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-surface-elevated bg-surface hover:bg-surface-elevated/40'
                )}
              >
                <div className={cn('p-2 rounded-lg shrink-0', template.color)}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-sm font-semibold text-text">{template.title}</h4>
                  <p className="text-xs text-text-muted mt-1 leading-snug line-clamp-2">
                    {template.description}
                  </p>
                </div>
                {isSelected && (
                  <div className="absolute top-3 right-3 text-primary">
                    <Check size={16} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Customization */}
        <div className="border-t border-surface-elevated pt-4 space-y-3">
          <label className="block text-xs font-semibold text-text uppercase tracking-wider">
            Widget Title
          </label>
          <Input
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="e.g. My Custom Metric"
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAdd}>
            Add Widget
          </Button>
        </div>
      </div>
    </Modal>
  );
}
