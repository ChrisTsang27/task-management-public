import { TaskStatus } from '@/types/tasks';

// Define valid status transitions
export const VALID_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  awaiting_approval: ['in_progress', 'cancelled'], // Skip approved, go directly to in_progress
  approved: ['in_progress', 'cancelled'], // Keep for future use but hidden
  in_progress: ['pending_review', 'blocked', 'on_hold', 'cancelled'],
  pending_review: ['done', 'rework', 'cancelled'],
  rework: ['in_progress', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  on_hold: ['in_progress', 'cancelled'],
  done: [], // Tasks marked as done cannot transition to other states
  cancelled: [] // Cancelled tasks cannot transition to other states
};

// Define status transition requirements
export interface StatusTransitionRule {
  requiresApproval?: boolean;
  requiresAssignee?: boolean;
  requiresComment?: boolean;
  allowedRoles?: string[];
}

export const STATUS_TRANSITION_RULES: Record<string, StatusTransitionRule> = {
  'awaiting_approval->in_progress': {
    requiresApproval: true,
    allowedRoles: ['admin', 'manager', 'team_lead'],
    requiresAssignee: true
  },
  'approved->in_progress': {
    requiresAssignee: true
  },
  'in_progress->pending_review': {
    // No special requirements
  },
  'pending_review->done': {
    allowedRoles: ['admin', 'manager', 'team_lead', 'assignee']
  },
  'pending_review->rework': {
    requiresComment: true,
    allowedRoles: ['admin', 'manager', 'team_lead']
  },
  'rework->in_progress': {
    // No special requirements
  },
  'in_progress->blocked': {
    requiresComment: true
  },
  'blocked->in_progress': {
    // No special requirements
  },
  'in_progress->on_hold': {
    requiresComment: true
  },
  'on_hold->in_progress': {
    // No special requirements
  },
  'any->cancelled': {
    requiresComment: true
  }
};

// Workflow validation functions
export function isValidStatusTransition(
  fromStatus: TaskStatus, 
  toStatus: TaskStatus
): boolean {
  return VALID_STATUS_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}

export function getValidNextStatuses(currentStatus: TaskStatus): TaskStatus[] {
  return VALID_STATUS_TRANSITIONS[currentStatus] || [];
}

export function validateStatusTransition(
  fromStatus: TaskStatus,
  toStatus: TaskStatus,
  context: {
    userRole?: string;
    hasAssignee?: boolean;
    comment?: string;
  }
): { valid: boolean; reason?: string } {
  // Check if transition is allowed
  if (!isValidStatusTransition(fromStatus, toStatus)) {
    return {
      valid: false,
      reason: `Cannot transition from ${fromStatus} to ${toStatus}`
    };
  }

  // Get transition rules
  const ruleKey = `${fromStatus}->${toStatus}`;
  const genericRule = STATUS_TRANSITION_RULES[ruleKey];
  const cancelRule = toStatus === 'cancelled' ? STATUS_TRANSITION_RULES['any->cancelled'] : null;
  const rule = genericRule || cancelRule;

  if (!rule) {
    return { valid: true }; // No special rules
  }

  // Check role requirements
  if (rule.allowedRoles && context.userRole) {
    if (!rule.allowedRoles.includes(context.userRole)) {
      return {
        valid: false,
        reason: `This action requires one of these roles: ${rule.allowedRoles.join(', ')}`
      };
    }
  }

  // Check assignee requirement
  if (rule.requiresAssignee && !context.hasAssignee) {
    return {
      valid: false,
      reason: 'This action requires the task to have an assignee'
    };
  }

  // Check comment requirement
  if (rule.requiresComment && !context.comment?.trim()) {
    return {
      valid: false,
      reason: 'This action requires a comment explaining the reason'
    };
  }



  return { valid: true };
}

// Get status transition button configuration
export interface StatusTransitionButton {
  status: TaskStatus;
  label: string;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
  color: string;
  icon?: string;
}

export function getStatusTransitionButtons(
  currentStatus: TaskStatus
): StatusTransitionButton[] {
  const nextStatuses = getValidNextStatuses(currentStatus);
  
  const buttonConfig: Record<TaskStatus, StatusTransitionButton> = {
    awaiting_approval: {
      status: 'awaiting_approval',
      label: 'Submit for Approval',
      variant: 'outline',
      color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
    },
    approved: {
      status: 'approved',
      label: 'Approve',
      variant: 'outline',
      color: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
    },
    in_progress: {
      status: 'in_progress',
      label: 'Approve & Start', // Updated label to reflect direct approval to in_progress
      variant: 'outline',
      color: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
    },
    blocked: {
      status: 'blocked',
      label: 'Mark Blocked',
      variant: 'outline',
      color: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200'
    },
    pending_review: {
      status: 'pending_review',
      label: 'Ready for Review',
      variant: 'outline',
      color: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200'
    },
    done: {
      status: 'done',
      label: 'Mark Complete',
      variant: 'outline',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'
    },
    cancelled: {
      status: 'cancelled',
      label: 'Cancel',
      variant: 'destructive',
      color: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
    },
    rework: {
      status: 'rework',
      label: 'Request Rework',
      variant: 'outline',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'
    },
    on_hold: {
      status: 'on_hold',
      label: 'Put On Hold',
      variant: 'outline',
      color: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'
    }
  };

  return nextStatuses.map(status => buttonConfig[status]).filter(Boolean);
}

// Workflow automation helpers
export function shouldAutoTransition(
  currentStatus: TaskStatus,
  context: {
    isOverdue?: boolean;
    hasBlockingIssues?: boolean;
    allSubtasksComplete?: boolean;
  }
): TaskStatus | null {
  // Auto-block overdue tasks
  if (context.isOverdue && currentStatus === 'in_progress') {
    return 'blocked';
  }

  // Auto-complete when all subtasks are done
  if (context.allSubtasksComplete && currentStatus === 'pending_review') {
    return 'done';
  }

  return null;
}

// Status change notifications
export function getStatusChangeNotification(
  fromStatus: TaskStatus,
  toStatus: TaskStatus,
  taskTitle: string
): { title: string; description: string; type: 'success' | 'warning' | 'error' } {
  const transitions: Record<string, { title: string; description: string; type: 'success' | 'warning' | 'error' }> = {
    'draft->awaiting_approval': {
      title: 'Task Submitted',
      description: `"${taskTitle}" has been submitted for approval`,
      type: 'success'
    },
    'awaiting_approval->in_progress': { // Direct transition notification
      title: 'Task Approved & Started',
      description: `"${taskTitle}" has been approved and work has begun`,
      type: 'success'
    },
    'awaiting_approval->approved': { // Keep for backward compatibility
      title: 'Task Approved',
      description: `"${taskTitle}" has been approved and is ready to start`,
      type: 'success'
    },
    'awaiting_approval->rejected': {
      title: 'Task Rejected',
      description: `"${taskTitle}" has been rejected and needs revision`,
      type: 'warning'
    },
    'approved->in_progress': {
      title: 'Work Started',
      description: `Work has begun on "${taskTitle}"`,
      type: 'success'
    },
    'in_progress->blocked': {
      title: 'Task Blocked',
      description: `"${taskTitle}" is now blocked and needs attention`,
      type: 'warning'
    },
    'in_progress->pending_review': {
      title: 'Ready for Review',
      description: `"${taskTitle}" is ready for review`,
      type: 'success'
    },
    'pending_review->done': {
      title: 'Task Completed',
      description: `"${taskTitle}" has been completed successfully`,
      type: 'success'
    },
    'any->cancelled': {
      title: 'Task Cancelled',
      description: `"${taskTitle}" has been cancelled`,
      type: 'warning'
    }
  };

  const key = `${fromStatus}->${toStatus}`;
  return transitions[key] || transitions['any->cancelled'] || {
    title: 'Status Updated',
    description: `"${taskTitle}" status changed to ${toStatus}`,
    type: 'success'
  };
}