import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, RefreshControl } from 'react-native';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { apiClient } from '../../src/api/client';

export default function TasksScreen() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = async () => {
    try {
      const data = await apiClient.get<any[]>('/tasks');
      if (Array.isArray(data)) {
        setTasks(data);
      }
    } catch {
      // Fallback handles errors
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: `t-${Date.now()}`,
      title: newTaskTitle.trim(),
      status: 'todo',
      priority: 'medium',
      projectName: 'General',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    };
    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');

    try {
      await apiClient.post('/tasks', newTask);
    } catch {
      // Local state already updated
    }
  };

  const toggleTask = (taskId: string) => {
    setTasks(prev =>
      prev.map(t => {
        if (t.id === taskId) {
          const nextStatus = t.status === 'done' ? 'todo' : 'done';
          apiClient.patch(`/tasks/${taskId}`, { status: nextStatus }).catch(() => {});
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#FB7185';
      case 'high': return '#F59E0B';
      case 'medium': return '#38BDF8';
      default: return '#94A3B8';
    }
  };

  return (
    <ScreenContainer scroll>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Tasks & Execution</Text>
          <Text style={styles.subtitle}>Track projects, standup items, and milestones</Text>
        </View>

        {/* Quick Add Bar */}
        <View style={styles.addBar}>
          <TextInput
            style={styles.input}
            placeholder="Add a new task..."
            placeholderTextColor={colors.textMuted}
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            onSubmitEditing={handleAddTask}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['all', 'todo', 'in_progress', 'done'] as const).map(f => {
            const count = tasks.filter(t => (f === 'all' ? true : t.status === f)).length;
            const label = f === 'all' ? 'All' : f === 'todo' ? 'To Do' : f === 'in_progress' ? 'In Progress' : 'Completed';
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, filter === f && styles.filterPillActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>
                  {label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No tasks found</Text>
            <Text style={styles.emptyDesc}>Type above to create your first item in this view.</Text>
          </View>
        ) : (
          filteredTasks.map(task => {
            const isDone = task.status === 'done';
            const priorityColor = getPriorityColor(task.priority);

            return (
              <TouchableOpacity
                key={task.id}
                style={[styles.taskCard, isDone && styles.taskCardDone]}
                onPress={() => toggleTask(task.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, isDone && styles.checkboxChecked]}>
                  {isDone && <Text style={styles.checkmark}>✓</Text>}
                </View>

                <View style={styles.taskInfo}>
                  <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>{task.title}</Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.priorityBadge, { backgroundColor: `${priorityColor}22` }]}>
                      <Text style={[styles.priorityText, { color: priorityColor }]}>
                        {task.priority?.toUpperCase() || 'NORMAL'}
                      </Text>
                    </View>
                    <Text style={styles.projectText}>📁 {task.projectName || 'General'}</Text>
                    {task.dueDate && (
                      <Text style={styles.dueText}>
                        🕒 {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
    marginTop: 4,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
  },
  addBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 48,
    color: colors.text,
    fontSize: typography.sizes.md,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  addButtonText: {
    color: '#0B0F14',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    borderColor: colors.primary,
  },
  filterPillText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: colors.primary,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  taskCardDone: {
    opacity: 0.5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textMuted,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: '#0B0F14',
    fontSize: 13,
    fontWeight: 'bold',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    marginBottom: 6,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '700',
  },
  projectText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  dueText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyDesc: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
});
