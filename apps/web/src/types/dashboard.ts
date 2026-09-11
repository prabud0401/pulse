export type WidgetType = 'stat' | 'chart' | 'list' | 'calendar' | 'feed' | 'custom';

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardWidget {
  id: string;
  layoutId: string;
  type: WidgetType;
  title: string;
  dataSource?: string | null;
  config: Record<string, unknown>;
  position: WidgetPosition;
  refreshInterval?: number | null;
  createdAt: string | Date;
}

export interface DashboardLayout {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  layout: unknown[];
  isDefault: boolean;
  widgets?: DashboardWidget[];
  createdAt: string | Date;
  updatedAt: string | Date;
}
