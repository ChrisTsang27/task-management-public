"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TaskBoard } from './TaskBoard';
import { TaskForm } from './TaskForm';
import { TaskDetails } from './TaskDetails';
import { StatusTransitionDialog } from './StatusTransitionDialog';
import { AssistanceRequestForm } from './AssistanceRequestForm';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import TeamOverview from '../TeamOverview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, List } from 'lucide-react';
import {
    Task,
    TaskStatus,
    CreateTaskRequest,
    UpdateTaskRequest,
    CreateAssistanceRequestData,
    Team
  } from '@/types/tasks';
import { useToast } from '@/hooks/use-toast';
import { validateStatusTransition } from '@/utils/workflow';
import { Loader2 } from 'lucide-react';
import supabase from '@/lib/supabaseBrowserClient';

interface TaskManagerProps {
  className?: string;
  currentUserId?: string;
  teamId?: string;
  viewMode?: 'kanban' | 'list' | 'calendar';
  selectedTeam?: Team | null;
}

export const TaskManager = React.memo(function TaskManager({
  className = '',
  currentUserId,
  teamId,
  viewMode = 'kanban',
  selectedTeam
}: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [statusTransition, setStatusTransition] = useState<{
    task: Task;
    newStatus: TaskStatus;
  } | null>(null);
  const [showAssistanceForm, setShowAssistanceForm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    taskId: string;
    taskTitle: string;
  }>({ open: false, taskId: '', taskTitle: '' });
  const [rejectConfirmation, setRejectConfirmation] = useState<{
    open: boolean;
    taskId: string;
    taskTitle: string;
  }>({ open: false, taskId: '', taskTitle: '' });
  const [confirmationLoading, setConfirmationLoading] = useState(false);

  const { toast } = useToast();

  // Memoize effective team ID to prevent unnecessary re-renders
  const effectiveTeamId = useMemo(() => selectedTeam?.id || teamId, [selectedTeam?.id, teamId]);

  // Fetch users from database
  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, title, department')
        .order('full_name');

      if (error) throw error;
      
      const formattedUsers = (data || []).map(user => ({
        id: user.id,
        name: user.full_name || 'Unknown User',
        email: user.title || user.department || 'No details'
      }));
      
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  // Fetch teams from database
  const fetchTeams = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/teams', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  }, []);

  // Load users and teams only once on component mount
  useEffect(() => {
    fetchUsers();
    fetchTeams();
  }, [fetchUsers, fetchTeams]);

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (effectiveTeamId) params.append('team_id', effectiveTeamId);
      
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }
      
      const response = await fetch(`/api/tasks?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tasks. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [effectiveTeamId, toast]);

  // Load tasks when dependencies change
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Memoize filtered tasks for performance
  const memoizedTasks = useMemo(() => tasks, [tasks]);
  const memoizedUsers = useMemo(() => users, [users]);
  const memoizedTeams = useMemo(() => teams, [teams]);

  // Handle assistance request submission
  const handleAssistanceRequest = useCallback(async (data: CreateAssistanceRequestData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication session');
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...data,
          team_id: teamId, // Include the requesting team's ID
          is_request: true,
          status: 'awaiting_approval'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create assistance request');
      }

      const newRequest = await response.json();
      
      // Add to tasks list if it's for the current team
      if (newRequest.team_id === effectiveTeamId) {
        setTasks(prevTasks => [newRequest, ...prevTasks]);
      }

      toast({
        title: "Request Sent",
        description: "Your assistance request has been sent successfully",
      });
    } catch (error) {
      console.error('Error creating assistance request:', error);
      toast({
        title: "Error",
        description: "Failed to send assistance request",
        variant: "destructive",
      });
      throw error;
    }
  }, [effectiveTeamId, toast, teamId]);

  // Change task status
  const handleTaskStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus, comment?: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Validate the status transition
    const validation = validateStatusTransition(task.status, newStatus, {
      userRole: 'admin', // You might want to get this from user context
      hasAssignee: !!task.assignee_id,
      comment: comment
    });
    if (!validation.valid) {
      toast({
        title: "Invalid Status Change",
        description: validation.reason,
        variant: "destructive",
      });
      return;
    }

    try {
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

      const updatedTask = await response.json();
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      
      toast({
        title: "Status Updated",
        description: `Task status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  }, [tasks, toast]);

  // Handle assistance request approval - now goes directly to in_progress
  const handleApproveRequest = useCallback(async (taskId: string) => {
    await handleTaskStatusChange(taskId, 'in_progress');
  }, [handleTaskStatusChange]);

  // Show reject confirmation dialog
  const handleRejectRequest = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setRejectConfirmation({
        open: true,
        taskId,
        taskTitle: task.title
      });
    }
  }, [tasks]);

  // Actually reject the task after confirmation
  const confirmRejectTask = async () => {
    try {
      setConfirmationLoading(true);
      await handleTaskStatusChange(rejectConfirmation.taskId, 'done', 'Task rejected by user');
      setRejectConfirmation({ open: false, taskId: '', taskTitle: '' });
    } catch (error) {
      console.error('Error rejecting task:', error);
    } finally {
      setConfirmationLoading(false);
    }
  };

  // Create new task
  const handleCreateTask = async (data: CreateTaskRequest) => {
    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: data.title,
          description_json: data.description_json,
          status: 'awaiting_approval',
          due_date: data.due_date,
          assignee_id: data.assignee_id || null,
          is_request: data.is_request,
          team_id: selectedTeam?.id || teamId,
          created_by: currentUserId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      await response.json();
      
      // Refetch tasks to ensure UI is in sync with server
      await fetchTasks();
      
      toast({
        title: 'Success',
        description: 'Task created successfully!',
      });
      
      // Close the form
      setShowTaskForm(false);
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Update existing task
  const handleUpdateTask = async (data: UpdateTaskRequest) => {
    if (!editingTask) return;
    
    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      const updatedTask = await response.json();
      setTasks(prev => prev.map(task => 
        task.id === editingTask.id ? updatedTask : task
      ));
      
      // Update selected task if it's the same one
      if (selectedTask?.id === editingTask.id) {
        setSelectedTask(updatedTask);
      }
      
      toast({
        title: 'Success',
        description: 'Task updated successfully!',
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Show delete confirmation dialog
  const handleDeleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setDeleteConfirmation({
        open: true,
        taskId,
        taskTitle: task.title
      });
    }
  };

  // Actually delete the task after confirmation
  const confirmDeleteTask = async () => {
    try {
      setConfirmationLoading(true);
      
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/tasks/${deleteConfirmation.taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to delete task';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If not JSON, use the text as is
          errorMessage = errorText || errorMessage;
        }
        
        console.error('Error deleting task:', errorMessage);
        
        throw new Error(`${errorMessage} (${response.status})`);
      }

      setTasks(prev => prev.filter(task => task.id !== deleteConfirmation.taskId));
      setDeleteConfirmation({ open: false, taskId: '', taskTitle: '' });
      
      toast({
        title: 'Success',
        description: 'Task deleted successfully!',
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setConfirmationLoading(false);
    }
  };

  // Handle task click
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetails(true);
  };

  // Handle create task button
  const handleCreateTaskClick = () => {
    setEditingTask(null);
    setShowTaskForm(true);
  };

  // Handle edit task
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
    setShowTaskDetails(false);
  };

  // Handle form submission
  const handleFormSubmit = async (data: CreateTaskRequest | UpdateTaskRequest) => {
    if (editingTask) {
      await handleUpdateTask(data as UpdateTaskRequest);
    } else {
      await handleCreateTask(data as CreateTaskRequest);
    }
  };

  // Handle team selection from overview
  const handleTeamSelect = useCallback((teamId: string) => {
    // Notify parent component about team selection
    window.dispatchEvent(new CustomEvent('teamSelected', { detail: { teamId } }));
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading tasks...</span>
        </div>
      </div>
    );
  }

  // Render different views based on viewMode
  const renderTaskView = () => {
    // If no team is selected (All Teams view) and in kanban mode, show team overview
    if (!selectedTeam && viewMode === 'kanban') {
      return (
        <TeamOverview onTeamSelect={handleTeamSelect} />
      );
    }

    switch (viewMode) {
      case 'kanban':
        return (
          <TaskBoard
            tasks={memoizedTasks}
            teams={memoizedTeams}
            onTaskClick={handleTaskClick}
            onTaskStatusChange={handleTaskStatusChange}
            onCreateTask={handleCreateTaskClick}
            onRequestAssistance={() => setShowAssistanceForm(true)}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            onDeleteTask={handleDeleteTask}
            loading={loading}
            selectedTeam={selectedTeam}
          />
        );
      case 'list':
        return (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <List className="w-5 h-5" />
                Task List View
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No tasks found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/30 hover:bg-slate-700/70 cursor-pointer transition-colors"
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-white">{task.title}</h3>
                            <p className="text-sm text-slate-400 mt-1">{task.description_json ? 'Has description' : 'No description'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              task.status === 'done' ? 'bg-green-500/20 text-green-400' :
                              task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                              task.status === 'pending_review' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="pt-4 border-t border-slate-600/30">
                  <Button
                    onClick={handleCreateTaskClick}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Create New Task
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case 'calendar':
        return (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Calendar className="w-5 h-5" />
                Calendar View
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-400 opacity-50" />
                <h3 className="text-lg font-medium text-white mb-2">Calendar View Coming Soon</h3>
                <p className="text-slate-400 mb-6">This feature is under development and will be available in a future update.</p>
                <Button
                  onClick={handleCreateTaskClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create New Task
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return (
          <TaskBoard
            tasks={memoizedTasks}
            teams={memoizedTeams}
            onTaskClick={handleTaskClick}
            onTaskStatusChange={handleTaskStatusChange}
            onCreateTask={handleCreateTaskClick}
            onRequestAssistance={() => setShowAssistanceForm(true)}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            onDeleteTask={handleDeleteTask}
            loading={loading}
          />
        );
    }
  };

  return (
    <div className={className}>
      {/* Task View */}
      {renderTaskView()}

      {/* Task Form Dialog */}
      <TaskForm
        open={showTaskForm}
        onOpenChange={setShowTaskForm}
        task={editingTask}
        onSubmit={handleFormSubmit}
        loading={loading}
        users={memoizedUsers}
      />

      {/* Task Details Dialog */}
      <TaskDetails
        open={showTaskDetails}
        onOpenChange={setShowTaskDetails}
        task={selectedTask}
        onEdit={handleEditTask}
        onDelete={handleDeleteTask}
        onStatusChange={handleTaskStatusChange}
        currentUserId={currentUserId}
      />
      
      <StatusTransitionDialog
        task={statusTransition?.task || null}
        targetStatus={statusTransition?.newStatus || 'pending_review'}
        open={!!statusTransition}
        onOpenChange={(open) => {
          if (!open) setStatusTransition(null);
        }}
        onConfirm={async (taskId, newStatus, comment) => {
          await handleTaskStatusChange(taskId, newStatus, comment);
          setStatusTransition(null);
        }}
      />
      
      <AssistanceRequestForm
        open={showAssistanceForm}
        onOpenChange={setShowAssistanceForm}
        currentTeamId={effectiveTeamId || ''}
        onSubmit={handleAssistanceRequest}
        loading={loading}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirmation.open}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmation({ open: false, taskId: '', taskTitle: '' });
        }}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteConfirmation.taskTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteTask}
        loading={confirmationLoading}
        variant="destructive"
      />

      {/* Reject Confirmation Dialog */}
      <ConfirmationDialog
        open={rejectConfirmation.open}
        onOpenChange={(open) => {
          if (!open) setRejectConfirmation({ open: false, taskId: '', taskTitle: '' });
        }}
        title="Reject Task"
        description={`Are you sure you want to reject "${rejectConfirmation.taskTitle}"? This will cancel the task.`}
        confirmText="Reject"
        cancelText="Cancel"
        onConfirm={confirmRejectTask}
        loading={confirmationLoading}
        variant="warning"
      />
    </div>
  );
});

export default TaskManager;