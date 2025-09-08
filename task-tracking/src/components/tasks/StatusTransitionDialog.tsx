"use client";

import { useState, lazy, Suspense } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const RichTextEditor = lazy(() => import('@/components/ui/rich-text-editor'));
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Task, TaskStatus, TASK_STATUS_LABELS } from '@/types/tasks';
import {
  validateStatusTransition,
  getStatusChangeNotification
} from '@/utils/workflow';
import { useToast } from '@/hooks/use-toast';

interface StatusTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  targetStatus: TaskStatus;
  onConfirm: (taskId: string, newStatus: TaskStatus, comment?: string) => Promise<void>;
  currentUserRole?: string;
}

export function StatusTransitionDialog({
  open,
  onOpenChange,
  task,
  targetStatus,
  onConfirm,
  currentUserRole = 'user'
}: StatusTransitionDialogProps) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Early return after all hooks are defined
  if (!task) return null;

  const validation = validateStatusTransition(
    task.status,
    targetStatus,
    {
      userRole: currentUserRole,
      hasAssignee: !!task.assignee_id,
      comment: comment
    }
  );

  const notification = getStatusChangeNotification(
    task.status,
    targetStatus,
    task.title
  );

  const handleConfirm = async () => {
    if (!validation.valid) {
      toast({
        title: 'Cannot Change Status',
        description: validation.reason,
        variant: 'destructive'
      });
      return;
    }

    if (requiresComment && (!comment || (typeof comment === 'string' && !comment.trim()))) {
      toast({
        title: 'Comment Required',
        description: 'Please provide a comment for this status change.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      await onConfirm(task.id, targetStatus, comment || undefined);
      onOpenChange(false);
      setComment('');
      
      toast({
        title: notification.title,
        description: notification.description,
        variant: notification.type === 'error' ? 'destructive' : 'default'
      });
    } catch (error) {
      console.error('Error changing status:', error);
      toast({
        title: 'Error',
        description: 'Failed to change task status. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'blocked':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const requiresComment = validation.reason?.includes('comment') || 
                         targetStatus === 'cancelled';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon(targetStatus)}
            Change Task Status
          </DialogTitle>
          <DialogDescription>
            Change the status of &quot;{task.title}&quot; from{' '}
            <Badge variant="outline" className="mx-1">
              {TASK_STATUS_LABELS[task.status]}
            </Badge>
            to{' '}
            <Badge variant="outline" className="mx-1">
              {TASK_STATUS_LABELS[targetStatus]}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Validation message */}
          {!validation.valid && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <strong>Cannot proceed:</strong> {validation.reason}
              </div>
            </div>
          )}

          {/* Task details */}
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              <strong>Task:</strong> {task.title}
            </div>
            {task.assignee_profile && (
              <div className="text-sm text-gray-600">
                <strong>Assignee:</strong> {task.assignee_profile.full_name || 'Unknown User'}
              </div>
            )}

          </div>

          {/* Comment field */}
          {(requiresComment || validation.valid) && (
            <div className="space-y-2">
              <Label htmlFor="comment">
                Comment {requiresComment && <span className="text-red-500">*</span>}
              </Label>
              <Suspense fallback={<div className="h-32 bg-gray-50 rounded-md animate-pulse" />}>
                <RichTextEditor
                  content={comment}
                  onChange={(content) => setComment(typeof content === 'string' ? content : JSON.stringify(content))}
                  placeholder={requiresComment 
                    ? "Please provide a reason for this status change..."
                    : "Optional comment about this status change..."
                  }
                  className="min-h-[120px]"
                />
              </Suspense>
              {requiresComment && (!comment || (typeof comment === 'string' && !comment.trim())) && (
                <p className="text-sm text-red-600">
                  A comment is required for this status change.
                </p>
              )}
            </div>
          )}

          {/* Status change preview */}
          {validation.valid && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm text-blue-800">
                <strong>{notification.title}</strong>
                <br />
                {notification.description}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!validation.valid || loading || (requiresComment && (!comment || (typeof comment === 'string' && !comment.trim())))}
            className={targetStatus === 'cancelled'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-blue-600 hover:bg-blue-700'
            }
          >
            {loading ? 'Updating...' : `Change to ${TASK_STATUS_LABELS[targetStatus]}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StatusTransitionDialog;