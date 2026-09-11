import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { db, workspaces, workspaceMembers } from '@pulse/db';
import { eq } from 'drizzle-orm';
import { NotFoundError, ForbiddenError } from '@pulse/core';

export const workspacesRouter: Router = Router();

workspacesRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { name, slug } = req.body;
    
    const [workspace] = await db.insert(workspaces).values({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      ownerId: userId,
    }).returning();
    
    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId,
      role: 'owner',
    });
    
    res.status(201).json({ success: true, data: workspace });
  } catch (error) {
    next(error);
  }
});

workspacesRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const userWorkspaces = await db.select({
      workspace: workspaces,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId));
    
    res.json({ success: true, data: userWorkspaces });
  } catch (error) {
    next(error);
  }
});

workspacesRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
    if (!workspace) throw new NotFoundError('Workspace not found');
    
    res.json({ success: true, data: workspace });
  } catch (error) {
    next(error);
  }
});

workspacesRouter.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user!.userId;
    
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
    if (!workspace) throw new NotFoundError('Workspace not found');
    if (workspace.ownerId !== userId) throw new ForbiddenError('Only owner can update workspace');
    
    const [updatedWorkspace] = await db.update(workspaces)
      .set({ name, description, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();
      
    res.json({ success: true, data: updatedWorkspace });
  } catch (error) {
    next(error);
  }
});

workspacesRouter.post('/:id/members', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId: memberId, role = 'member' } = req.body;
    
    const [member] = await db.insert(workspaceMembers).values({
      workspaceId: id,
      userId: memberId,
      role,
    }).returning();
    
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    next(error);
  }
});

workspacesRouter.get('/:id/members', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const members = await db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, id));
    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
});
