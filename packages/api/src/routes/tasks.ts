import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  db,
  tasks,
  projects,
  taskComments,
  users,
  workspaceMembers,
  eq,
  and,
  desc,
  asc,
  ilike,
  or,
} from '@pulse/db';
import { NotFoundError, ValidationError } from '@pulse/core';

export const tasksRouter: Router = Router();

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

// GET /api/tasks — list tasks with filters
tasksRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const {
      workspaceId: reqWorkspaceId,
      projectId,
      status,
      priority,
      assigneeId,
      search,
    } = req.query;

    const workspaceId = await resolveWorkspaceId(userId, reqWorkspaceId as string);

    // Build conditions
    const conditions = [eq(tasks.workspaceId, workspaceId)];

    if (projectId && typeof projectId === 'string') {
      conditions.push(eq(tasks.projectId, projectId));
    }
    if (status && typeof status === 'string') {
      conditions.push(eq(tasks.status, status));
    }
    if (priority && typeof priority === 'string') {
      conditions.push(eq(tasks.priority, priority));
    }
    if (assigneeId && typeof assigneeId === 'string') {
      conditions.push(eq(tasks.assigneeId, assigneeId));
    }
    if (search && typeof search === 'string') {
      conditions.push(
        or(
          ilike(tasks.title, `%${search}%`),
          ilike(tasks.description, `%${search}%`)
        )!
      );
    }

    const taskList = await db
      .select({
        id: tasks.id,
        workspaceId: tasks.workspaceId,
        projectId: tasks.projectId,
        parentId: tasks.parentId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        assigneeId: tasks.assigneeId,
        dueDate: tasks.dueDate,
        tags: tasks.tags,
        position: tasks.position,
        completedAt: tasks.completedAt,
        createdBy: tasks.createdBy,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        project: {
          id: projects.id,
          name: projects.name,
          color: projects.color,
          icon: projects.icon,
        },
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(asc(tasks.position), desc(tasks.createdAt));

    res.json({ success: true, data: taskList });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks — create new task
tasksRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const {
      workspaceId: reqWorkspaceId,
      projectId,
      parentId,
      title,
      description,
      status = 'todo',
      priority = 'medium',
      assigneeId,
      dueDate,
      tags = [],
      position = 0,
    } = req.body;

    if (!title || typeof title !== 'string') {
      throw new ValidationError('Task title is required');
    }

    const workspaceId = await resolveWorkspaceId(userId, reqWorkspaceId);

    const [newTask] = await db
      .insert(tasks)
      .values({
        workspaceId,
        projectId: projectId || null,
        parentId: parentId || null,
        title: title.trim(),
        description: description || null,
        status,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        tags,
        position,
        createdBy: userId,
      })
      .returning();

    res.status(201).json({ success: true, data: newTask });
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks/:id — get single task
tasksRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [task] = await db
      .select({
        id: tasks.id,
        workspaceId: tasks.workspaceId,
        projectId: tasks.projectId,
        parentId: tasks.parentId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        assigneeId: tasks.assigneeId,
        dueDate: tasks.dueDate,
        tags: tasks.tags,
        position: tasks.position,
        completedAt: tasks.completedAt,
        createdBy: tasks.createdBy,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        project: {
          id: projects.id,
          name: projects.name,
          color: projects.color,
          icon: projects.icon,
        },
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.id, id))
      .limit(1);

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    // Fetch subtasks
    const subtaskList = await db
      .select()
      .from(tasks)
      .where(eq(tasks.parentId, id))
      .orderBy(asc(tasks.position));

    // Fetch comments
    const commentList = await db
      .select({
        id: taskComments.id,
        taskId: taskComments.taskId,
        userId: taskComments.userId,
        content: taskComments.content,
        createdAt: taskComments.createdAt,
        userName: users.name,
      })
      .from(taskComments)
      .leftJoin(users, eq(taskComments.userId, users.id))
      .where(eq(taskComments.taskId, id))
      .orderBy(asc(taskComments.createdAt));

    res.json({
      success: true,
      data: {
        ...task,
        subtasks: subtaskList,
        comments: commentList,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tasks/:id — update task
tasksRouter.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      projectId,
      parentId,
      title,
      description,
      status,
      priority,
      assigneeId,
      dueDate,
      tags,
      position,
    } = req.body;

    const [existing] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Task not found');
    }

    const updates: Record<string, any> = { updatedAt: new Date() };

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description;
    if (projectId !== undefined) updates.projectId = projectId || null;
    if (parentId !== undefined) updates.parentId = parentId || null;
    if (priority !== undefined) updates.priority = priority;
    if (assigneeId !== undefined) updates.assigneeId = assigneeId || null;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
    if (tags !== undefined) updates.tags = tags;
    if (position !== undefined) updates.position = position;

    if (status !== undefined) {
      updates.status = status;
      if (status === 'done' && existing.status !== 'done') {
        updates.completedAt = new Date();
      } else if (status !== 'done' && existing.status === 'done') {
        updates.completedAt = null;
      }
    }

    const [updatedTask] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();

    res.json({ success: true, data: updatedTask });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tasks/:id/status — quick status toggle
tasksRouter.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['todo', 'in_progress', 'done', 'cancelled'].includes(status)) {
      throw new ValidationError("Invalid status. Must be 'todo', 'in_progress', 'done', or 'cancelled'");
    }

    const [existing] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Task not found');
    }

    const completedAt = status === 'done' ? new Date() : null;

    const [updated] = await db
      .update(tasks)
      .set({
        status,
        completedAt,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/:id — delete task
tasksRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundError('Task not found');
    }

    res.json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks/:id/comments — add comment
tasksRouter.post('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      throw new ValidationError('Comment content is required');
    }

    const [comment] = await db
      .insert(taskComments)
      .values({
        taskId: id,
        userId,
        content: content.trim(),
      })
      .returning();

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks/:id/comments — get comments
tasksRouter.get('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const comments = await db
      .select({
        id: taskComments.id,
        taskId: taskComments.taskId,
        userId: taskComments.userId,
        content: taskComments.content,
        createdAt: taskComments.createdAt,
        userName: users.name,
      })
      .from(taskComments)
      .leftJoin(users, eq(taskComments.userId, users.id))
      .where(eq(taskComments.taskId, id))
      .orderBy(asc(taskComments.createdAt));

    res.json({ success: true, data: comments });
  } catch (error) {
    next(error);
  }
});
