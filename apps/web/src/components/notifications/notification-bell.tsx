'use client';

import * as React from 'react';
import { Bell, CheckCheck, Info, CheckCircle2, AlertTriangle, AlertCircle, Zap } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Notification, NotificationType } from '@/types/notifications';

const initialDemoNotifications: Notification[] = [
  {
    id: 'demo-1',
    userId: 'demo',
    source: 'system',
    type: 'success',
    title: 'Pulse Phase 3 Activated',
    body: 'Smart Dashboard and Notification Center are now operational.',
    data: {},
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    userId: 'demo',
    source: 'mcp',
    type: 'info',
    title: 'MCP Gateway Ready',
    body: 'Model Context Protocol server gateway is listening for tool calls.',
    data: {},
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'demo-3',
    userId: 'demo',
    source: 'finance',
    type: 'action',
    title: 'Finance Ledger Ready',
    body: 'You can now track accounts, cashflow, and automatic reconciliation.',
    data: {},
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
];

export function NotificationBell() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [notificationsList, setNotificationsList] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const fetchNotifications = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get<{ success: boolean; data: Notification[]; unreadCount: number }>('/notifications');
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setNotificationsList(res.data);
        setUnreadCount(res.unreadCount ?? res.data.filter((n) => !n.read).length);
      } else {
        // Use demo notifications if DB is fresh
        setNotificationsList(initialDemoNotifications);
        setUnreadCount(initialDemoNotifications.filter((n) => !n.read).length);
      }
    } catch {
      // Fallback gracefully to demo notifications on network/server disconnect
      setNotificationsList(initialDemoNotifications);
      setUnreadCount(initialDemoNotifications.filter((n) => !n.read).length);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Handle outside click & escape key to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.post('/notifications/read-all', {});
    } catch {
      // Fallback
    }
    setNotificationsList((prev) =>
      prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
    );
    setUnreadCount(0);
  };

  const handleMarkOneAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`, {});
    } catch {
      // Fallback
    }
    setNotificationsList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const formatTimestamp = (dateStr: string | Date) => {
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  const renderIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} className="text-income shrink-0" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-warning shrink-0" />;
      case 'error':
        return <AlertCircle size={16} className="text-expense shrink-0" />;
      case 'action':
        return <Zap size={16} className="text-broker shrink-0" />;
      case 'info':
      default:
        return <Info size={16} className="text-primary shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) fetchNotifications();
        }}
        aria-label="Notifications"
        className="relative p-2 rounded-full text-text-muted hover:text-text hover:bg-surface-elevated transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-expense px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-surface animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-surface-elevated bg-surface shadow-2xl z-50 overflow-hidden flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-elevated bg-surface">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs flex items-center gap-1 text-primary hover:underline font-medium"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 divide-y divide-surface-elevated">
            {notificationsList.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                No notifications right now
              </div>
            ) : (
              notificationsList.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.read && handleMarkOneAsRead(notif.id)}
                  className={cn(
                    'p-3.5 flex gap-3 items-start transition-colors cursor-pointer hover:bg-surface-elevated/50',
                    !notif.read ? 'bg-surface-elevated/30' : 'opacity-80'
                  )}
                >
                  <div className="mt-0.5">{renderIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={cn(
                          'text-sm truncate',
                          !notif.read ? 'font-semibold text-text' : 'font-medium text-text'
                        )}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[11px] text-text-muted shrink-0">
                        {formatTimestamp(notif.createdAt)}
                      </span>
                    </div>
                    {notif.body && (
                      <p className="text-xs text-text-muted mt-1 leading-relaxed line-clamp-2">
                        {notif.body}
                      </p>
                    )}
                  </div>
                  {!notif.read && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-surface-elevated bg-surface text-center">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-text-muted hover:text-text"
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
