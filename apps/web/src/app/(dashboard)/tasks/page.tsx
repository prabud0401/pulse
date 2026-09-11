'use client';

import * as React from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Kanban,
  List as ListIcon,
  Calendar,
  Tag,
  AlertCircle,
  Clock,
  CheckCircle2,
  Circle,
  MoreVertical,
  Trash2,
  Folder,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface TaskProject {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}

interface TaskItem {
  id: string;
  workspaceId?: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueDate?: string | null;
  tags?: string[] | null;
  position?: number;
  completedAt?: string | null;
  createdAt?: string;
  project?: TaskProject | null;
}

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Finalize multi-bank ledger reconciliation',
    description: 'Ensure PeoplesBank and ComBank SMS parsing rules are accurate.',
    status: 'in_progress',
    priority: 'critical',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    tags: ['finance', 'urgent'],
    project: { id: 'p-1', name: 'Core Finance', color: '#0D9488' },
  },
  {
    id: 'task-2',
    title: 'Deploy MCP server connector bridge',
    description: 'Verify SSE transport and stdio tool discovery in local container.',
    status: 'todo',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000 * 4).toISOString(),
    tags: ['mcp', 'dev-tools'],
    project: { id: 'p-2', name: 'Integrations Hub', color: '#7C3AED' },
  },
  {
    id: 'task-3',
    title: 'Wire AI Assistant context builder to live transactions',
    description: 'Provide dynamic task and finance injections into prompt.',
    status: 'done',
    priority: 'high',
    dueDate: new Date(Date.now() - 86400000).toISOString(),
    tags: ['ai', 'phase-5'],
    project: { id: 'p-3', name: 'AI Assistant', color: '#059669' },
  },
  {
    id: 'task-4',
    title: 'Review weekly expense allocation against budget',
    description: 'Check personal living threshold vs income inward.',
    status: 'todo',
    priority: 'medium',
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    tags: ['finance'],
    project: { id: 'p-1', name: 'Core Finance', color: '#0D9488' },
  },
  {
    id: 'task-5',
    title: 'Configure automated SMS trigger rule',
    description: 'Trigger classification on incoming transaction webhook.',
    status: 'in_progress',
    priority: 'medium',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    tags: ['automation'],
    project: { id: 'p-4', name: 'Automations', color: '#D97706' },
  },
  {
    id: 'task-6',
    title: 'Design Dark Fintech theme color tokens',
    description: 'Audit Tailwind v4 CSS variables for contrast and accessibility.',
    status: 'done',
    priority: 'low',
    dueDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    tags: ['ui', 'styling'],
    project: { id: 'p-5', name: 'Design System', color: '#64748B' },
  },
];

const COLUMNS: Array<{ id: TaskItem['status']; title: string; color: string }> = [
  { id: 'todo', title: 'To Do', color: 'border-t-text-muted' },
  { id: 'in_progress', title: 'In Progress', color: 'border-t-primary' },
  { id: 'done', title: 'Done', color: 'border-t-income' },
];

export default function TasksPage() {
  const [tasks, setTasks] = React.useState<TaskItem[]>(INITIAL_TASKS);
  const [projects, setProjects] = React.useState<TaskProject[]>([
    { id: 'p-1', name: 'Core Finance', color: '#0D9488' },
    { id: 'p-2', name: 'Integrations Hub', color: '#7C3AED' },
    { id: 'p-3', name: 'AI Assistant', color: '#059669' },
    { id: 'p-4', name: 'Automations', color: '#D97706' },
    { id: 'p-5', name: 'Design System', color: '#64748B' },
  ]);
  const [viewMode, setViewMode] = React.useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');
  const [projectFilter, setProjectFilter] = React.useState<string>('all');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = React.useState(false);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = React.useState('');
  const [newTaskDescription, setNewTaskDescription] = React.useState('');
  const [newTaskPriority, setNewTaskPriority] = React.useState<TaskItem['priority']>('medium');
  const [newTaskStatus, setNewTaskStatus] = React.useState<TaskItem['status']>('todo');
  const [newTaskProjectId, setNewTaskProjectId] = React.useState('');
  const [newTaskDueDate, setNewTaskDueDate] = React.useState('');
  const [newTaskTags, setNewTaskTags] = React.useState('');

  // Fetch tasks and projects from API
  React.useEffect(() => {
    async function loadData() {
      try {
        const [tasksRes, projectsRes] = await Promise.all([
          apiClient.get<any>('/tasks'),
          apiClient.get<any>('/projects'),
        ]);

        if (tasksRes?.data && Array.isArray(tasksRes.data) && tasksRes.data.length > 0) {
          setTasks(tasksRes.data);
        }
        if (projectsRes?.data && Array.isArray(projectsRes.data) && projectsRes.data.length > 0) {
          setProjects(projectsRes.data);
        }
      } catch (err) {
        // Fallback to initial seed
      }
    }
    loadData();
  }, []);

  // Quick toggle task status
  const handleToggleTask = async (task: TaskItem) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus, completedAt: nextStatus === 'done' ? new Date().toISOString() : null } : t))
    );

    try {
      await apiClient.patch(`/tasks/${task.id}/status`, { status: nextStatus });
    } catch (err) {
      // Keep optimistic or silent
    }
  };

  // Change status (move column)
  const handleMoveStatus = async (taskId: string, newStatus: TaskItem['status']) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await apiClient.patch(`/tasks/${taskId}/status`, { status: newStatus });
    } catch (err) {
      // Keep optimistic
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await apiClient.delete(`/tasks/${taskId}`);
    } catch (err) {
      // Keep optimistic
    }
  };

  // Create new task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const tagsArray = newTaskTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const targetProj = projects.find((p) => p.id === newTaskProjectId) || null;

    const newTaskData: TaskItem = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || null,
      priority: newTaskPriority,
      status: newTaskStatus,
      projectId: newTaskProjectId || null,
      dueDate: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null,
      tags: tagsArray,
      project: targetProj,
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => [newTaskData, ...prev]);
    setIsNewTaskModalOpen(false);

    // Reset form
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskPriority('medium');
    setNewTaskStatus('todo');
    setNewTaskProjectId('');
    setNewTaskDueDate('');
    setNewTaskTags('');

    try {
      await apiClient.post('/tasks', {
        title: newTaskData.title,
        description: newTaskData.description,
        priority: newTaskData.priority,
        status: newTaskData.status,
        projectId: newTaskData.projectId,
        dueDate: newTaskData.dueDate,
        tags: newTaskData.tags,
      });
    } catch (err) {
      // Keep optimistic
    }
  };

  // Filter tasks
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((task) => {
      // Search
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (task.tags && task.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())));

      if (!matchesSearch) return false;

      // Priority
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

      // Project
      if (projectFilter !== 'all' && task.projectId !== projectFilter) return false;

      return true;
    });
  }, [tasks, searchQuery, priorityFilter, projectFilter]);

  const getPriorityBadgeVariant = (priority: TaskItem['priority']) => {
    switch (priority) {
      case 'critical':
        return 'danger';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <CheckSquare className="text-primary" /> Task Manager
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Organize sprints, track priorities, and manage project workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center bg-surface-elevated rounded-lg p-1 border border-surface-elevated">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors',
                viewMode === 'kanban'
                  ? 'bg-surface text-primary shadow-sm font-semibold'
                  : 'text-text-muted hover:text-text'
              )}
            >
              <Kanban size={15} />
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors',
                viewMode === 'list'
                  ? 'bg-surface text-primary shadow-sm font-semibold'
                  : 'text-text-muted hover:text-text'
              )}
            >
              <ListIcon size={15} />
              List
            </button>
          </div>

          <Button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-white hover:opacity-90 shadow-sm"
          >
            <Plus size={16} />
            New Task
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-surface p-3 rounded-xl border border-surface-elevated">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, descriptions, or tags..."
            className="pl-9 h-9 text-sm bg-surface-elevated border-surface-elevated"
          />
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-1 text-sm text-text-muted">
          <Filter size={15} />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-surface-elevated border border-surface-elevated text-text text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Project Filter */}
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="bg-surface-elevated border border-surface-elevated text-text text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Main View Area */}
      {viewMode === 'kanban' ? (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {COLUMNS.map((column) => {
            const columnTasks = filteredTasks.filter((t) => t.status === column.id);

            return (
              <div
                key={column.id}
                className={cn(
                  'flex flex-col rounded-xl bg-surface border border-surface-elevated p-3 border-t-4 shadow-sm min-h-[500px]',
                  column.color
                )}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-elevated">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text text-sm">{column.title}</span>
                    <span className="text-xs bg-surface-elevated px-2 py-0.5 rounded-full text-text-muted font-medium">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                {/* Column Cards */}
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        'group relative bg-surface-elevated/70 hover:bg-surface-elevated rounded-xl p-3.5 border border-surface-elevated/90 shadow-sm transition-all hover:shadow hover:border-primary/40',
                        task.status === 'done' && 'opacity-70'
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Check toggle */}
                        <button
                          onClick={() => handleToggleTask(task)}
                          className="mt-0.5 text-text-muted hover:text-primary transition-colors shrink-0"
                        >
                          {task.status === 'done' ? (
                            <CheckCircle2 size={18} className="text-income" />
                          ) : (
                            <Circle size={18} />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          {/* Title */}
                          <div
                            className={cn(
                              'text-sm font-medium text-text leading-snug break-words',
                              task.status === 'done' && 'line-through text-text-muted'
                            )}
                          >
                            {task.title}
                          </div>

                          {/* Description */}
                          {task.description && (
                            <p className="text-xs text-text-muted mt-1 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Meta details */}
                          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-surface-elevated/60 text-xs">
                            {/* Priority */}
                            <Badge variant={getPriorityBadgeVariant(task.priority)} className="uppercase text-[10px] tracking-wider py-0 px-2">
                              {task.priority}
                            </Badge>

                            {/* Project tag */}
                            {task.project && (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-surface text-text font-medium border border-surface-elevated"
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: task.project.color || '#0D9488' }}
                                />
                                <span className="truncate max-w-[100px]">{task.project.name}</span>
                              </span>
                            )}

                            {/* Due date */}
                            {task.dueDate && (
                              <span className="inline-flex items-center gap-1 text-text-muted text-[11px]">
                                <Clock size={12} />
                                {new Date(task.dueDate).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card menu / delete */}
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-expense transition-opacity"
                          title="Delete task"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Quick Move Status Buttons on hover */}
                      <div className="hidden group-hover:flex items-center justify-end gap-1 mt-2 pt-1 border-t border-surface-elevated/40 text-[11px]">
                        <span className="text-text-muted text-[10px] mr-1">Move:</span>
                        {COLUMNS.filter((c) => c.id !== task.status).map((col) => (
                          <button
                            key={col.id}
                            onClick={() => handleMoveStatus(task.id, col.id)}
                            className="px-2 py-0.5 rounded bg-surface hover:bg-primary/10 hover:text-primary text-text-muted transition-colors border border-surface-elevated"
                          >
                            {col.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted text-xs border border-dashed border-surface-elevated rounded-xl">
                      No tasks in this column
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / Table View */
        <Card className="bg-surface border-surface-elevated">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-surface-elevated text-xs font-semibold text-text-muted bg-surface-elevated/40">
                <tr>
                  <th className="py-3 px-4 w-10"></th>
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-elevated">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className="text-text-muted hover:text-primary transition-colors"
                      >
                        {task.status === 'done' ? (
                          <CheckCircle2 size={18} className="text-income" />
                        ) : (
                          <Circle size={18} />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className={cn('font-medium text-text', task.status === 'done' && 'line-through text-text-muted')}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-xs text-text-muted mt-0.5 line-clamp-1">{task.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={task.status}
                        onChange={(e) => handleMoveStatus(task.id, e.target.value as TaskItem['status'])}
                        className="text-xs bg-surface-elevated border border-surface-elevated rounded px-2 py-1 text-text cursor-pointer"
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getPriorityBadgeVariant(task.priority)} className="uppercase text-[10px]">
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {task.project ? (
                        <span className="inline-flex items-center gap-1 text-xs">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: task.project.color || '#0D9488' }}
                          />
                          {task.project.name}
                        </span>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-text-muted">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-text-muted hover:text-expense p-1 rounded"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-text-muted text-xs">
                      No matching tasks found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* New Task Modal */}
      <Modal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        title="Create New Task"
        description="Add a task to your workspace backlog or sprint."
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text block mb-1">
              Title <span className="text-expense">*</span>
            </label>
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g. Implement bank ingestion webhook"
              required
              className="h-10 text-sm bg-surface-elevated border-surface-elevated"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text block mb-1">Description</label>
            <textarea
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              placeholder="Provide context or acceptance criteria..."
              rows={3}
              className="w-full bg-surface-elevated border border-surface-elevated rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-text block mb-1">Priority</label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskItem['priority'])}
                className="w-full bg-surface-elevated border border-surface-elevated text-text text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-text block mb-1">Status</label>
              <select
                value={newTaskStatus}
                onChange={(e) => setNewTaskStatus(e.target.value as TaskItem['status'])}
                className="w-full bg-surface-elevated border border-surface-elevated text-text text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-text block mb-1">Project</label>
              <select
                value={newTaskProjectId}
                onChange={(e) => setNewTaskProjectId(e.target.value)}
                className="w-full bg-surface-elevated border border-surface-elevated text-text text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">No Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-text block mb-1">Due Date</label>
              <Input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="h-10 text-sm bg-surface-elevated border-surface-elevated"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text block mb-1">
              Tags <span className="text-text-muted font-normal">(comma-separated)</span>
            </label>
            <Input
              value={newTaskTags}
              onChange={(e) => setNewTaskTags(e.target.value)}
              placeholder="e.g. backend, mcp, phase-5"
              className="h-10 text-sm bg-surface-elevated border-surface-elevated"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-elevated">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewTaskModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-primary text-white hover:opacity-90">
              Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
