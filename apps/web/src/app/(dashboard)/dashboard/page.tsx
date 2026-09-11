'use client';

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Plus, RotateCcw, LayoutGrid, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { StatWidget } from '@/components/dashboard/stat-widget';
import { ActivityListWidget } from '@/components/dashboard/activity-list-widget';
import { QuickActionsWidget } from '@/components/dashboard/quick-actions-widget';
import { AddWidgetModal } from '@/components/dashboard/add-widget-modal';
import type { DashboardWidget, DashboardLayout } from '@/types/dashboard';

const defaultSeedWidgets: DashboardWidget[] = [
  {
    id: 'w-1',
    layoutId: 'layout-default',
    type: 'stat',
    title: 'Total Integrations',
    dataSource: 'integrations.count',
    config: { icon: 'Plug', color: 'blue' },
    position: { x: 0, y: 0, w: 1, h: 1 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'w-2',
    layoutId: 'layout-default',
    type: 'stat',
    title: 'Active Tasks',
    dataSource: 'tasks.count',
    config: { icon: 'CheckSquare', color: 'emerald' },
    position: { x: 1, y: 0, w: 1, h: 1 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'w-3',
    layoutId: 'layout-default',
    type: 'stat',
    title: 'Net Savings',
    dataSource: 'finance.summary',
    config: { icon: 'Wallet', color: 'violet' },
    position: { x: 2, y: 0, w: 1, h: 1 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'w-4',
    layoutId: 'layout-default',
    type: 'stat',
    title: 'Unread Alerts',
    dataSource: 'notifications.recent',
    config: { icon: 'Bell', color: 'amber' },
    position: { x: 3, y: 0, w: 1, h: 1 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'w-5',
    layoutId: 'layout-default',
    type: 'list',
    title: 'Recent Activity',
    dataSource: 'activity.recent',
    config: { maxItems: 6 },
    position: { x: 0, y: 1, w: 2, h: 2 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'w-6',
    layoutId: 'layout-default',
    type: 'custom',
    title: 'Quick Actions',
    dataSource: 'system.actions',
    config: {},
    position: { x: 2, y: 1, w: 2, h: 2 },
    createdAt: new Date().toISOString(),
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [widgets, setWidgets] = React.useState<DashboardWidget[]>(defaultSeedWidgets);
  const [layoutId, setLayoutId] = React.useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Load dashboard layouts and widgets from backend
  const loadDashboard = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get<{ success: boolean; data: (DashboardLayout & { widgets?: DashboardWidget[] })[] }>('/dashboard/layouts');
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const primaryLayout = res.data.find((l) => l.isDefault) || res.data[0];
        setLayoutId(primaryLayout.id);
        if (primaryLayout.widgets && primaryLayout.widgets.length > 0) {
          setWidgets(primaryLayout.widgets);
        }
      }
    } catch {
      // Gracefully fall back to local seed widgets
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRemoveWidget = async (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    if (layoutId) {
      try {
        await apiClient.delete(`/dashboard/widgets/${id}`);
      } catch {
        // Silently tolerate if mock or offline
      }
    }
  };

  const handleAddWidget = async (newWidget: Partial<DashboardWidget>) => {
    const created: DashboardWidget = {
      id: newWidget.id || `w-${Date.now()}`,
      layoutId: layoutId || 'layout-default',
      type: newWidget.type || 'stat',
      title: newWidget.title || 'New Widget',
      dataSource: newWidget.dataSource || null,
      config: newWidget.config || {},
      position: newWidget.position || { x: 0, y: 0, w: 1, h: 1 },
      createdAt: new Date().toISOString(),
    };

    setWidgets((prev) => [...prev, created]);

    if (layoutId) {
      try {
        const res = await apiClient.post<{ success: boolean; data: DashboardWidget }>('/dashboard/widgets', {
          layoutId,
          type: created.type,
          title: created.title,
          dataSource: created.dataSource,
          config: created.config,
          position: created.position,
        });
        if (res?.data?.id) {
          setWidgets((prev) => prev.map((w) => (w.id === created.id ? res.data : w)));
        }
      } catch {
        // Silently tolerate
      }
    }
  };

  const handleResetLayout = () => {
    setWidgets(defaultSeedWidgets);
  };

  // Group widgets into stats and wide cards
  const statWidgets = widgets.filter((w) => w.type === 'stat');
  const wideWidgets = widgets.filter((w) => w.type !== 'stat');

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="text-text-muted mt-1">
            Real-time unified heartbeat of your life, workflows, and integrations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetLayout}
            className="flex items-center gap-2 text-xs"
          >
            <RotateCcw size={14} />
            Reset Layout
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 text-xs"
          >
            <Plus size={14} />
            Add Widget
          </Button>
        </div>
      </div>

      {/* Primary Stat Widgets Grid */}
      {statWidgets.length > 0 && (
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {statWidgets.map((widget) => (
              <StatWidget
                key={widget.id}
                widget={widget}
                onRemove={handleRemoveWidget}
              />
            ))}
          </div>
        </section>
      )}

      {/* Main Content Widgets (Activity Feed, Quick Actions, Custom) */}
      {wideWidgets.length > 0 && (
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {wideWidgets.map((widget) => {
              if (widget.type === 'list') {
                return (
                  <ActivityListWidget
                    key={widget.id}
                    widget={widget}
                    onRemove={handleRemoveWidget}
                  />
                );
              }
              if (widget.type === 'custom') {
                return (
                  <QuickActionsWidget
                    key={widget.id}
                    widget={widget}
                    onRemove={handleRemoveWidget}
                  />
                );
              }
              return (
                <StatWidget
                  key={widget.id}
                  widget={widget}
                  onRemove={handleRemoveWidget}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Empty State */}
      {widgets.length === 0 && (
        <div className="text-center py-16 border border-dashed border-surface-elevated rounded-2xl p-8">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <LayoutGrid size={24} />
          </div>
          <h3 className="text-lg font-semibold text-text">Your dashboard is empty</h3>
          <p className="text-sm text-text-muted mt-1 max-w-sm mx-auto">
            Add customizable widgets to track integrations, tasks, finances, and live notifications.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="primary" onClick={() => setIsAddModalOpen(true)}>
              <Plus size={14} className="mr-2" /> Add Your First Widget
            </Button>
            <Button variant="outline" onClick={handleResetLayout}>
              Restore Default Dashboard
            </Button>
          </div>
        </div>
      )}

      {/* Add Widget Modal */}
      <AddWidgetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddWidget={handleAddWidget}
      />
    </div>
  );
}
