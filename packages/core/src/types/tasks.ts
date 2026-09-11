export type ProjectStatus = 'active' | 'archived';

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  status: ProjectStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateProjectInput {
  workspaceId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: ProjectStatus;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: ProjectStatus;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  parentId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string | null;
  dueDate?: Date | string | null;
  tags?: string[] | null;
  position: number;
  completedAt?: Date | string | null;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  project?: Project | null;
  subtasks?: Task[];
}

export interface CreateTaskInput {
  workspaceId: string;
  projectId?: string | null;
  parentId?: string | null;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: Date | string | null;
  tags?: string[];
  position?: number;
}

export interface UpdateTaskInput {
  projectId?: string | null;
  parentId?: string | null;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: Date | string | null;
  tags?: string[];
  position?: number;
  completedAt?: Date | string | null;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TaskFilters {
  workspaceId?: string;
  projectId?: string;
  status?: TaskStatus | string;
  priority?: TaskPriority | string;
  assigneeId?: string;
  search?: string;
}
