"use client";

import React, { useState, useEffect, useCallback } from "react";

import { CheckCircle, Clock, AlertCircle, Play, User, Calendar, Tag, RotateCcw, XCircle, Pause, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingCard } from "@/components/ui/LoadingSpinner";
import { useSupabaseProfile } from "@/hooks/useSupabaseProfile";
import supabase from "@/lib/supabaseBrowserClient";
import { Task, TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_TRANSITIONS } from '@/types/tasks';


interface MyTasksProps {
  currentUserId?: string;
  className?: string;
}

const statusConfig = {
  awaiting_approval: {
    label: "Awaiting Approval",
    icon: <Clock className="w-4 h-4" />,
    color: "bg-yellow-500",
    textColor: "text-yellow-100",
    borderColor: "border-yellow-400"
  },
  approved: {
    label: "Approved",
    icon: <CheckCircle className="w-4 h-4" />,
    color: "bg-green-500",
    textColor: "text-green-100",
    borderColor: "border-green-400"
  },
  in_progress: {
    label: "In Progress",
    icon: <Play className="w-4 h-4" />,
    color: "bg-blue-500",
    textColor: "text-blue-100",
    borderColor: "border-blue-400"
  },
  pending_review: {
    label: "Pending Review",
    icon: <AlertCircle className="w-4 h-4" />,
    color: "bg-purple-500",
    textColor: "text-purple-100",
    borderColor: "border-purple-400"
  },
  rework: {
    label: "Rework",
    icon: <RotateCcw className="w-4 h-4" />,
    color: "bg-orange-500",
    textColor: "text-orange-100",
    borderColor: "border-orange-400"
  },
  done: {
    label: "Done",
    icon: <CheckCircle className="w-4 h-4" />,
    color: "bg-emerald-500",
    textColor: "text-emerald-100",
    borderColor: "border-emerald-400"
  },
  blocked: {
    label: "Blocked",
    icon: <XCircle className="w-4 h-4" />,
    color: "bg-red-500",
    textColor: "text-red-100",
    borderColor: "border-red-400"
  },
  on_hold: {
    label: "On Hold",
    icon: <Pause className="w-4 h-4" />,
    color: "bg-gray-500",
    textColor: "text-gray-100",
    borderColor: "border-gray-400"
  },
  cancelled: {
    label: "Cancelled",
    icon: <X className="w-4 h-4" />,
    color: "bg-slate-500",
    textColor: "text-slate-100",
    borderColor: "border-slate-400"
  }
};

// Display order for task statuses (excluding cancelled for better UX)
const statusOrder: TaskStatus[] = ['awaiting_approval', 'approved', 'in_progress', 'pending_review', 'rework', 'done', 'blocked', 'on_hold'];

export default function MyTasks({ currentUserId, className }: MyTasksProps) {
  const { user, loading: profileLoading } = useSupabaseProfile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // Fetch user's tasks
  const fetchMyTasks = useCallback(async () => {
    const userId = currentUserId || user?.id;
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          team:teams!tasks_team_id_fkey(id, name),
          created_by_profile:profiles!tasks_created_by_fkey(id, full_name, title, department),
          assignee_profile:profiles!tasks_assignee_id_fkey(id, full_name, title, department)
        `)
        .or(`created_by.eq.${userId},assignee_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching my tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, user?.id]);

  // Update task status
  const updateTaskStatus = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      setUpdatingTaskId(taskId);

      // Optimistic update
      const optimisticTask = { 
        ...task, 
        status: newStatus, 
        updated_at: new Date().toISOString() 
      };
      
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === taskId ? optimisticTask : t)
      );

      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          status: newStatus
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', response.status, response.statusText, errorData);
        throw new Error(`Failed to update task status: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      const updatedTask = responseData.task || responseData; // Handle different response formats
      
      // Update with the actual response from the server
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === taskId ? updatedTask : t)
      );

      toast.success(`Task status updated to ${statusConfig[newStatus].label}`);
    } catch (err) {
      console.error('Error updating task status:', err);
      
      // Revert optimistic update on error
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === taskId ? task : t)
      );
      
      toast.error('Failed to update task status');
    } finally {
      setUpdatingTaskId(null);
    }
  }, [tasks]);

  // Get available status transitions for a task
  const getAvailableTransitions = (currentStatus: TaskStatus): TaskStatus[] => {
    return TASK_STATUS_TRANSITIONS[currentStatus] || [];
  };

  // Get next logical status in the workflow (for quick actions)
  const getNextStatus = (currentStatus: TaskStatus): TaskStatus | null => {
    const transitions = getAvailableTransitions(currentStatus);
    
    // Prioritize common workflow transitions
    const priorityOrder: TaskStatus[] = ['in_progress', 'pending_review', 'done'];
    
    for (const priority of priorityOrder) {
      if (transitions.includes(priority)) {
        return priority;
      }
    }
    
    // Return first available transition if no priority match
    return transitions.length > 0 ? transitions[0] : null;
  };

  // Get previous logical status (for undo actions)
  const getPreviousStatus = (currentStatus: TaskStatus): TaskStatus | null => {
    // Simple reverse mapping for common cases
    const reverseMap: Partial<Record<TaskStatus, TaskStatus>> = {
      'in_progress': 'awaiting_approval',
      'pending_review': 'in_progress',
      'done': 'pending_review',
      'rework': 'pending_review',
      'blocked': 'in_progress',
      'on_hold': 'in_progress'
    };
    
    return reverseMap[currentStatus] || null;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Initial fetch
  useEffect(() => {
    if (!profileLoading && user) {
      fetchMyTasks();
    }
  }, [profileLoading, user, fetchMyTasks]);

  // Show loading state
  if (profileLoading || loading) {
    return (
      <LoadingCard 
        title="Loading Your Tasks..." 
        description="Please wait while we fetch your assigned tasks" 
      />
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <div className="text-center text-red-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Tasks</h3>
            <p className="text-sm text-slate-400 mb-4">{error}</p>
            <Button onClick={fetchMyTasks} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group tasks by status
  const tasksByStatus = statusOrder.reduce((acc, status) => {
    acc[status] = tasks.filter(task => task.status === status);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">My Tasks</h2>
          <p className="text-slate-400">
            Manage your assigned tasks &bull; {tasks.length} total tasks
          </p>
        </div>
        <Button onClick={fetchMyTasks} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Tasks by Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusOrder.map(status => {
          const statusTasks = tasksByStatus[status];
          const config = statusConfig[status];

          return (
            <Card key={status} className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    {config.icon}
                  </div>
                  <div>
                    <div className="text-white">{config.label}</div>
                    <div className="text-sm text-slate-400 font-normal">
                      {statusTasks.length} tasks
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statusTasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <div className="text-4xl mb-2">📝</div>
                    <p className="text-sm">No {config.label.toLowerCase()} tasks</p>
                  </div>
                ) : (
                  statusTasks.map(task => (
                    <Card key={task.id} className="bg-slate-700/50 border-slate-600 hover:bg-slate-700/70 transition-colors">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Task Title */}
                          <h4 className="font-medium text-white line-clamp-2">
                            {task.title}
                          </h4>

                          {/* Task Description */}
                          {task.description && (
                            <p className="text-sm text-slate-400 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          {/* Task Meta */}
                          <div className="space-y-2">
                            {/* Team */}
                            {task.team && (
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Tag className="w-3 h-3" />
                                <span>{task.team.name}</span>
                              </div>
                            )}

                            {/* Due Date */}
                            {task.due_date && (
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Calendar className="w-3 h-3" />
                                <span>Due {formatDate(task.due_date)}</span>
                              </div>
                            )}

                            {/* Priority Score */}
                            {task.priority_score && task.priority_score > 7 && (
                              <Badge 
                                variant={task.priority_score > 8 ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                High Priority
                              </Badge>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="space-y-2 pt-2">
                            {/* Status Dropdown for all available transitions */}
                            {getAvailableTransitions(task.status).length > 0 && (
                              <select
                                value={task.status}
                                onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                                disabled={updatingTaskId === task.id}
                                className="w-full h-8 px-2 text-xs bg-slate-600 border border-slate-500 rounded text-white"
                              >
                                <option value={task.status}>{statusConfig[task.status].label}</option>
                                {getAvailableTransitions(task.status).map(status => (
                                  <option key={status} value={status}>
                                    → {statusConfig[status].label}
                                  </option>
                                ))}
                              </select>
                            )}
                            
                            {/* Quick Action Buttons */}
                            <div className="flex gap-2">
                              {/* Move to Previous Status */}
                              {getPreviousStatus(task.status) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateTaskStatus(task.id, getPreviousStatus(task.status)!)}
                                  disabled={updatingTaskId === task.id}
                                  className="flex-1 text-xs"
                                  title={`Move to ${statusConfig[getPreviousStatus(task.status)!].label}`}
                                >
                                  ← {statusConfig[getPreviousStatus(task.status)!].label}
                                </Button>
                              )}

                              {/* Move to Next Status */}
                              {getNextStatus(task.status) && (
                                <Button
                                  size="sm"
                                  onClick={() => updateTaskStatus(task.id, getNextStatus(task.status)!)}
                                  disabled={updatingTaskId === task.id}
                                  className="flex-1 text-xs"
                                  title={`Move to ${statusConfig[getNextStatus(task.status)!].label}`}
                                >
                                  {statusConfig[getNextStatus(task.status)!].label} →
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {tasks.length === 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Tasks Assigned</h3>
              <p className="text-slate-400 mb-4">
                You don&apos;t have any tasks assigned to you yet. Check back later or contact your team lead.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}