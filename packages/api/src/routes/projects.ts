import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { db, projects, tasks, workspaceMembers, eq, and, desc, sql } from '@pulse/db';
import { NotFoundError, ValidationError } from '@pulse/core';

export const projectsRouter: Router = Router();

async function resolveWorkspaceId(userId: string, requestedWorkspaceId?: string): Promise<string> {
  if (requestedWorkspaceId) return requestedWorkspaceId;

  const [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  if (!membership) {
    throw new ValidationError('Workspace required or user must belong to a workspace');
  }

  return membership.workspaceId;
}

// GET /api/projects — list projects with task counts
projectsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId: reqWorkspaceId, status } = req.query;
    const workspaceId = await resolveWorkspaceId(userId, reqWorkspaceId as string);

    const conditions = [eq(projects.workspaceId, workspaceId)];
    if (status && typeof status === 'string') {
      conditions.push(eq(projects.status, status));
    }

    const projectList = await db
      .select({
        id: projects.id,
        workspaceId: projects.workspaceId,
        name: projects.name,
        description: projects.description,
        color: projects.color,
        icon: projects.icon,
        status: projects.status,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.createdAt));

    res.json({ success: true, data: projectList });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects — create project
projectsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId: reqWorkspaceId, name, description, color = '#0D9488', icon = 'Folder', status = 'active' } = req.body;

    if (!name || typeof name !== 'string') {
      throw new ValidationError('Project name is required');
    }

    const workspaceId = await resolveWorkspaceId(userId, reqWorkspaceId);

    const [newProject] = await db
      .insert(projects)
      .values({
        workspaceId,
        name: name.trim(),
        description: description || null,
        color,
        icon,
        status,
      })
      .returning();

    res.status(201).json({ success: true, data: newProject });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id — get project details
projectsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/projects/:id — update project
projectsRouter.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, color, icon, status } = req.body;

    const [existing] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Project not found');
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;
    if (status !== undefined) updates.status = status;

    const [updated] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:id — delete project
projectsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundError('Project not found');
    }

    res.json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});
