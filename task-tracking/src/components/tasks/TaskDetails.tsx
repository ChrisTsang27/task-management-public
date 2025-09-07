"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Task, 
  TaskStatus, 
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS
} from '@/types/tasks';
import { getStatusTransitionButtons } from '@/utils/workflow';
import { 
  Calendar, 
  User, 
  Edit, 
  Trash2, 
  MessageSquare,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock3
} from 'lucide-react';
import { format, formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

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
            <div className="flex items-center gap-2">
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
                  className="bg-slate-800 border-slate-600 text-red-400 hover:bg-red-900/20 hover:border-red-600"
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
                <div>
                  <div className="text-sm text-slate-400">Assignee</div>
                  {task.assignee_id ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={`/api/users/${task.assignee_id}/avatar`} />
                        <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                          {getInitials(task.assignee_id)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{task.assignee_id}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-500">Unassigned</span>
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
              {task.team_id && (
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="text-sm text-slate-400">Team</div>
                    <div className="text-sm mt-1">{task.team_id}</div>
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