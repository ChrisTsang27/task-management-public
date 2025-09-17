"use client";

import { useState, useEffect } from 'react';

import { format, formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns';
import { 
  Calendar, 
  User, 
  Edit, 
  Trash2, 
  MessageSquare,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Check,
  X
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import supabase from '@/lib/supabaseBrowserClient';
import { cn } from '@/lib/utils';
import { 
  Task, 
  TaskStatus, 
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS
} from '@/types/tasks';
import { getStatusTransitionButtons } from '@/utils/workflow';

interface TaskDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  currentUserId?: string;
}

export function TaskDetails({
  open,
  onOpenChange,
  task,
  onEdit,
  onDelete,
  onStatusChange,
  currentUserId
}: TaskDetailsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [teams, setTeams] = useState<{id: string, name: string}[]>([]);
  const [isEditingAssignee, setIsEditingAssignee] = useState(false);
  const [users, setUsers] = useState<{id: string, name: string, email: string}[]>([]);
  const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);
  const [assigneeProfile, setAssigneeProfile] = useState<{id: string, full_name: string} | null>(null);
  const [teamInfo, setTeamInfo] = useState<{id: string, name: string} | null>(null);



  // Fetch teams for name lookup
  useEffect(() => {
    const fetchTeams = async () => {
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
    };
    fetchTeams();
  }, []);

  // Fetch assignee profile if missing
  useEffect(() => {
    const fetchAssigneeProfile = async () => {
      if (task?.assignee_id && !task.assignee_profile) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('id', task.assignee_id)
            .single();

          if (error) throw error;
          setAssigneeProfile(data);
        } catch (error) {
          console.error('Error fetching assignee profile:', error);
          setAssigneeProfile(null);
        }
      } else {
        setAssigneeProfile(null);
      }
    };

    fetchAssigneeProfile();
  }, [task?.assignee_id, task?.assignee_profile]);

  // Fetch team info if missing
  useEffect(() => {
    const fetchTeamInfo = async () => {
      if (task?.team_id && !task.team) {
        try {
          const { data, error } = await supabase
            .from('teams')
            .select('id, name')
            .eq('id', task.team_id)
            .single();

          if (error) throw error;
          setTeamInfo(data);
        } catch (error) {
          console.error('Error fetching team info:', error);
          setTeamInfo(null);
        }
      } else {
        setTeamInfo(null);
      }
    };

    fetchTeamInfo();
  }, [task?.team_id, task?.team]);

  // Fetch users for assignee selection
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, title, department')
        .not('full_name', 'like', '%[DELETED USER]%')
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
  };

  // Update task assignee
  const updateAssignee = async (newAssigneeId: string | null) => {
    if (!task) return;
    
    setIsUpdatingAssignee(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No session found');
        return;
      }

      console.log('Updating assignee to:', newAssigneeId);
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          assignee_id: newAssigneeId
        }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        console.log('Task updated successfully:', updatedTask);
        
        // Update the local task state immediately
        task.assignee_id = newAssigneeId || undefined;
        
        // If we have user data, update the assignee profile
        if (newAssigneeId && users.length > 0) {
          const assignedUser = users.find(u => u.id === newAssigneeId);
          if (assignedUser) {
            task.assignee_profile = {
              id: newAssigneeId,
              full_name: assignedUser.name,
              title: assignedUser.email || undefined // Using email as title since that's what we have
            };
          }
        } else {
          task.assignee_profile = undefined;
        }
        
        // Trigger a refresh in the parent component
        if (onStatusChange) {
          onStatusChange(task.id, task.status);
        }
        
        setIsEditingAssignee(false);
      } else {
        const errorData = await response.text();
        console.error('Failed to update assignee:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error updating assignee:', error);
    } finally {
      setIsUpdatingAssignee(false);
    }
  };

  // Early return after all hooks are defined
  if (!task) return null;

  const isOverdue = task.due_date && isAfter(new Date(), new Date(task.due_date));
  const isDueSoon = task.due_date && 
    isBefore(new Date(), new Date(task.due_date)) && 
    isAfter(addDays(new Date(), 3), new Date(task.due_date));

  const canEdit = !currentUserId || task.created_by === currentUserId || task.assignee_id === currentUserId;
  const canDelete = !currentUserId || task.created_by === currentUserId;

  const handleStatusChange = (newStatus: TaskStatus) => {
    onStatusChange?.(task.id, newStatus);
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete?.(task.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'blocked':
      case 'on_hold':
        return <AlertCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock3 className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold pr-8">
                {task.title}
              </DialogTitle>
              <DialogDescription className="text-slate-400 mt-1">
                Created {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                {task.updated_at !== task.created_at && (
                  <span className="ml-2">
                    • Updated {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
                  </span>
                )}
              </DialogDescription>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-6">
              {canEdit && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(task)}
                  className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {canDelete && onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-slate-800 border-slate-600 text-red-400 hover:bg-red-900/20 hover:border-red-600 mr-4"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Status:</span>
              <Badge 
                className={cn(
                  'flex items-center gap-1',
                  TASK_STATUS_COLORS[task.status]
                )}
              >
                {getStatusIcon(task.status)}
                {TASK_STATUS_LABELS[task.status]}
              </Badge>
            </div>
            

          </div>

          {/* Quick status change buttons */}
          {onStatusChange && (
            <div className="space-y-2">
              <span className="text-sm text-slate-400">Quick Actions:</span>
              <div className="flex gap-2 flex-wrap">
                {getStatusTransitionButtons(task.status).map((button) => (
                  <Button
                    key={button.status}
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(button.status)}
                    className={`${button.color.replace('bg-', 'bg-').replace('text-', 'text-').replace('border-', 'border-')} hover:opacity-80`}
                  >
                    {button.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator className="bg-slate-700" />

          {/* Task Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Assignee */}
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-slate-400" />
                <div className="flex-1">
                  <div className="text-sm text-slate-400 mb-1">Assignee</div>
                  
                  {isEditingAssignee ? (
                    <div className="space-y-2">
                      <Select
                        value={task.assignee_id || "unassigned"}
                        onValueChange={(value) => {
                          const newAssigneeId = value === "unassigned" ? null : value;
                          updateAssignee(newAssigneeId);
                        }}
                        disabled={isUpdatingAssignee}
                      >
                        <SelectTrigger className="h-8 text-sm bg-slate-800 border-slate-600">
                          <SelectValue placeholder="Select assignee..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          <SelectItem value="unassigned" className="text-slate-400">
                            Unassigned
                          </SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-4 h-4">
                                  <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                                    {getInitials(user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{user.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingAssignee(false)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                          disabled={isUpdatingAssignee}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                        {task.assignee_id ? (
                          <>
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={`/api/users/${task.assignee_id}/avatar`} />
                              <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                                {getInitials(task.assignee_profile?.full_name || assigneeProfile?.full_name || task.assignee_id)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{task.assignee_profile?.full_name || assigneeProfile?.full_name || task.assignee_id}</span>
                          </>
                        ) : (
                          <span className="text-sm text-slate-500">Unassigned</span>
                        )}
                      </div>
                      
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditingAssignee(true);
                            fetchUsers();
                          }}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-white transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-sm text-slate-400">Due Date</div>
                  {task.due_date ? (
                    <div className={cn(
                      'text-sm mt-1',
                      isOverdue && 'text-red-400',
                      isDueSoon && 'text-yellow-400'
                    )}>
                      {format(new Date(task.due_date), 'PPP')}
                      {isOverdue && ' (Overdue)'}
                      {isDueSoon && ' (Due Soon)'}
                    </div>
                  ) : (
                    <span className="text-sm text-slate-500">No due date</span>
                  )}
                </div>
              </div>


            </div>

            {/* Right Column */}
            <div className="space-y-4">


              {/* Team */}
              {(task.team?.name || teamInfo?.name || task.team_id) && (
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-sm text-slate-400">
                      {task.is_request ? 'Request from' : 'Team'}
                    </div>
                    <div className="text-sm mt-1">
                      {task.is_request 
                        ? (() => {
                            const requestingTeamId = task.description_json?._metadata?.requesting_team_id;
                            const requestingTeam = teams.find(t => t.id === requestingTeamId);
                            return requestingTeam?.name || requestingTeamId || 'Unknown Team';
                          })()
                        : (task.team?.name || teamInfo?.name || task.team_id)
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-slate-700" />

          {/* Description */}
          {task.description_json && (
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Description
              </h3>
              <RichTextEditor
                content={task.description_json}
                editable={false}
                className="bg-slate-800/50 border-slate-700"
              />
            </div>
          )}

          {/* Activity Timeline Placeholder */}
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity
            </h3>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-4">
                <div className="text-sm text-slate-400 text-center py-8">
                  Activity timeline coming soon...
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TaskDetails;