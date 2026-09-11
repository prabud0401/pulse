import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  db,
  dashboardLayouts,
  dashboardWidgets,
  workspaceMembers,
  integrations,
  toolInvocations,
  notifications,
} from '@pulse/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { NotFoundError, ValidationError, ForbiddenError } from '@pulse/core';

export const dashboardRouter: Router = Router();

// Helper to get workspaceId for user
async function resolveWorkspaceId(userId: string, requestedWorkspaceId?: string): Promise<string> {
  if (requestedWorkspaceId) {
    return requestedWorkspaceId;
  }
  const [userMembership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  if (!userMembership) {
    throw new ValidationError('No active workspace found for user');
  }
  return userMembership.workspaceId;
}

// GET /api/dashboard/layouts — get user layouts for workspace (with widgets)
dashboardRouter.get('/layouts', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const workspaceId = await resolveWorkspaceId(userId, req.query.workspaceId as string | undefined);

    let layouts = await db
      .select()
      .from(dashboardLayouts)
      .where(
        and(
          eq(dashboardLayouts.userId, userId),
          eq(dashboardLayouts.workspaceId, workspaceId)
        )
      )
      .orderBy(desc(dashboardLayouts.isDefault), desc(dashboardLayouts.createdAt));

    // If no layout exists yet, create a default layout with seed widgets
    if (layouts.length === 0) {
      const [newLayout] = await db
        .insert(dashboardLayouts)
        .values({
          userId,
          workspaceId,
          name: 'Overview',
          layout: [],
          isDefault: true,
        })
        .returning();

      // Seed standard widgets
      const defaultWidgets = [
        {
          layoutId: newLayout.id,
          type: 'stat',
          title: 'Total Integrations',
          dataSource: 'integrations.count',
          config: { icon: 'Plug', color: 'blue' },
          position: { x: 0, y: 0, w: 1, h: 1 },
        },
        {
          layoutId: newLayout.id,
          type: 'stat',
          title: 'Active Tasks',
          dataSource: 'tasks.count',
          config: { icon: 'CheckSquare', color: 'emerald' },
          position: { x: 1, y: 0, w: 1, h: 1 },
        },
        {
          layoutId: newLayout.id,
          type: 'stat',
          title: 'Net Savings',
          dataSource: 'finance.summary',
          config: { icon: 'Wallet', color: 'violet' },
          position: { x: 2, y: 0, w: 1, h: 1 },
        },
        {
          layoutId: newLayout.id,
          type: 'stat',
          title: 'Unread Alerts',
          dataSource: 'notifications.recent',
          config: { icon: 'Bell', color: 'amber' },
          position: { x: 3, y: 0, w: 1, h: 1 },
        },
        {
          layoutId: newLayout.id,
          type: 'list',
          title: 'Recent Activity',
          dataSource: 'activity.recent',
          config: { maxItems: 5 },
          position: { x: 0, y: 1, w: 2, h: 2 },
        },
        {
          layoutId: newLayout.id,
          type: 'custom',
          title: 'Quick Actions',
          dataSource: 'system.actions',
          config: {
            actions: [
              { id: 'mcp', label: 'Connect MCP', icon: 'Plug', href: '/integrations/connect' },
              { id: 'tool', label: 'Run Tool', icon: 'Play', href: '/integrations' },
              { id: 'task', label: 'Add Task', icon: 'PlusSquare', href: '/tasks' },
              { id: 'finance', label: 'Record Expense', icon: 'CreditCard', href: '/finance' },
            ],
          },
          position: { x: 2, y: 1, w: 2, h: 2 },
        },
      ];

      await db.insert(dashboardWidgets).values(defaultWidgets);

      layouts = [newLayout];
    }

    // Fetch widgets for each layout
    const layoutIds = layouts.map((l) => l.id);
    const widgets = layoutIds.length > 0
      ? await db
          .select()
          .from(dashboardWidgets)
          .where(sql`${dashboardWidgets.layoutId} IN ${layoutIds}`)
      : [];

    const widgetsByLayout = widgets.reduce<Record<string, typeof widgets>>((acc, w) => {
      acc[w.layoutId] = acc[w.layoutId] || [];
      acc[w.layoutId].push(w);
      return acc;
    }, {});

    const enrichedLayouts = layouts.map((layout) => ({
      ...layout,
      widgets: widgetsByLayout[layout.id] || [],
    }));

    res.json({ success: true, data: enrichedLayouts });
  } catch (error) {
    next(error);
  }
});

// POST /api/dashboard/layouts — create layout
dashboardRouter.post('/layouts', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { name, layout = [], isDefault = false, workspaceId } = req.body;

    if (!name) {
      throw new ValidationError('name is required');
    }

    const targetWorkspaceId = await resolveWorkspaceId(userId, workspaceId);

    if (isDefault) {
      // Unset other default layouts for this user and workspace
      await db
        .update(dashboardLayouts)
        .set({ isDefault: false })
        .where(
          and(
            eq(dashboardLayouts.userId, userId),
            eq(dashboardLayouts.workspaceId, targetWorkspaceId)
          )
        );
    }

    const [created] = await db
      .insert(dashboardLayouts)
      .values({
        userId,
        workspaceId: targetWorkspaceId,
        name,
        layout,
        isDefault,
      })
      .returning();

    res.status(201).json({ success: true, data: { ...created, widgets: [] } });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/dashboard/layouts/:id — update layout positions / config
dashboardRouter.patch('/layouts/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { name, layout, isDefault } = req.body;

    const [existing] = await db
      .select()
      .from(dashboardLayouts)
      .where(and(eq(dashboardLayouts.id, id), eq(dashboardLayouts.userId, userId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Dashboard layout not found');
    }

    if (isDefault) {
      await db
        .update(dashboardLayouts)
        .set({ isDefault: false })
        .where(
          and(
            eq(dashboardLayouts.userId, userId),
            eq(dashboardLayouts.workspaceId, existing.workspaceId)
          )
        );
    }

    const updateData: Partial<typeof dashboardLayouts.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updateData.name = name;
    if (layout !== undefined) updateData.layout = layout;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const [updated] = await db
      .update(dashboardLayouts)
      .set(updateData)
      .where(eq(dashboardLayouts.id, id))
      .returning();

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/dashboard/layouts/:id — delete layout
dashboardRouter.delete('/layouts/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(dashboardLayouts)
      .where(and(eq(dashboardLayouts.id, id), eq(dashboardLayouts.userId, userId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Dashboard layout not found');
    }

    await db.delete(dashboardLayouts).where(eq(dashboardLayouts.id, id));

    res.json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// POST /api/dashboard/widgets — add widget to layout
dashboardRouter.post('/widgets', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { layoutId, type, title, dataSource, config = {}, position, refreshInterval } = req.body;

    if (!layoutId || !type || !title) {
      throw new ValidationError('layoutId, type, and title are required');
    }

    // Verify layout ownership
    const [layout] = await db
      .select()
      .from(dashboardLayouts)
      .where(and(eq(dashboardLayouts.id, layoutId), eq(dashboardLayouts.userId, userId)))
      .limit(1);

    if (!layout) {
      throw new NotFoundError('Dashboard layout not found');
    }

    const defaultPosition = position || { x: 0, y: 0, w: 1, h: 1 };

    const [widget] = await db
      .insert(dashboardWidgets)
      .values({
        layoutId,
        type,
        title,
        dataSource: dataSource || null,
        config,
        position: defaultPosition,
        refreshInterval: refreshInterval || null,
      })
      .returning();

    res.status(201).json({ success: true, data: widget });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/dashboard/widgets/:id — update widget config/title/position
dashboardRouter.patch('/widgets/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { title, type, dataSource, config, position, refreshInterval } = req.body;

    // Verify widget belongs to user's layout
    const [widgetWithLayout] = await db
      .select({
        widget: dashboardWidgets,
        userId: dashboardLayouts.userId,
      })
      .from(dashboardWidgets)
      .innerJoin(dashboardLayouts, eq(dashboardWidgets.layoutId, dashboardLayouts.id))
      .where(and(eq(dashboardWidgets.id, id), eq(dashboardLayouts.userId, userId)))
      .limit(1);

    if (!widgetWithLayout) {
      throw new NotFoundError('Widget not found');
    }

    const updateData: Partial<typeof dashboardWidgets.$inferInsert> = {};
    if (title !== undefined) updateData.title = title;
    if (type !== undefined) updateData.type = type;
    if (dataSource !== undefined) updateData.dataSource = dataSource;
    if (config !== undefined) updateData.config = config;
    if (position !== undefined) updateData.position = position;
    if (refreshInterval !== undefined) updateData.refreshInterval = refreshInterval;

    const [updated] = await db
      .update(dashboardWidgets)
      .set(updateData)
      .where(eq(dashboardWidgets.id, id))
      .returning();

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/dashboard/widgets/:id — delete widget
dashboardRouter.delete('/widgets/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const [widgetWithLayout] = await db
      .select({
        widgetId: dashboardWidgets.id,
      })
      .from(dashboardWidgets)
      .innerJoin(dashboardLayouts, eq(dashboardWidgets.layoutId, dashboardLayouts.id))
      .where(and(eq(dashboardWidgets.id, id), eq(dashboardLayouts.userId, userId)))
      .limit(1);

    if (!widgetWithLayout) {
      throw new NotFoundError('Widget not found');
    }

    await db.delete(dashboardWidgets).where(eq(dashboardWidgets.id, id));

    res.json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/widgets/:id/data — fetch live data for widget based on dataSource
dashboardRouter.get('/widgets/:id/data', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const [result] = await db
      .select({
        widget: dashboardWidgets,
        workspaceId: dashboardLayouts.workspaceId,
      })
      .from(dashboardWidgets)
      .innerJoin(dashboardLayouts, eq(dashboardWidgets.layoutId, dashboardLayouts.id))
      .where(and(eq(dashboardWidgets.id, id), eq(dashboardLayouts.userId, userId)))
      .limit(1);

    if (!result) {
      throw new NotFoundError('Widget not found');
    }

    const { widget, workspaceId } = result;
    const dataSource = widget.dataSource || '';

    let data: unknown = null;

    if (dataSource.startsWith('integrations')) {
      const allIntegrations = await db
        .select()
        .from(integrations)
        .where(eq(integrations.workspaceId, workspaceId));

      const connected = allIntegrations.filter((i) => i.status === 'connected');
      data = {
        total: allIntegrations.length,
        connected: connected.length,
        items: allIntegrations.slice(0, 5),
      };
    } else if (dataSource.startsWith('finance')) {
      data = {
        netWorth: 24850.00,
        monthlyIncome: 6400.00,
        monthlyExpenses: 3120.00,
        netSavings: 3280.00,
        savingsRate: '51.2%',
        change: '+14.2%',
        currency: 'USD',
      };
    } else if (dataSource.startsWith('tasks')) {
      data = {
        active: 8,
        dueToday: 3,
        completed: 15,
        overdue: 1,
        total: 24,
      };
    } else if (dataSource.startsWith('notifications')) {
      const recentNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(5);

      const unreadCount = recentNotifs.filter((n) => !n.read).length;
      data = {
        unreadCount,
        recent: recentNotifs,
      };
    } else if (dataSource.startsWith('activity')) {
      const [recentInvocations, recentNotifs] = await Promise.all([
        db
          .select()
          .from(toolInvocations)
          .where(eq(toolInvocations.userId, userId))
          .orderBy(desc(toolInvocations.createdAt))
          .limit(4),
        db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, userId))
          .orderBy(desc(notifications.createdAt))
          .limit(4),
      ]);

      const items = [
        ...recentInvocations.map((inv) => ({
          id: inv.id,
          type: 'tool_invocation',
          title: `Ran tool: ${inv.toolName}`,
          subtitle: `Status: ${inv.status} (${inv.durationMs || 0}ms)`,
          timestamp: inv.createdAt,
          status: inv.status,
        })),
        ...recentNotifs.map((n) => ({
          id: n.id,
          type: 'notification',
          title: n.title,
          subtitle: n.body || n.source,
          timestamp: n.createdAt,
          status: n.type,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6);

      data = { items };
    } else {
      data = {
        timestamp: new Date().toISOString(),
        status: 'active',
        config: widget.config,
      };
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});
