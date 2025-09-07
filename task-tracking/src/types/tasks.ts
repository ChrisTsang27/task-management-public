// Task Management Types
// Based on database schema and application requirements

export type TaskStatus = 
  | 'awaiting_approval'
  | 'approved'
  | 'in_progress'
  | 'pending_review'
  | 'rework'
  | 'done'
  | 'blocked'
  | 'on_hold'
  | 'cancelled';



export interface Task {
  id: string;
  team_id?: string;
  created_by?: string;
  assignee_id?: string;
  title: string;
  description_json?: Record<string, unknown>; // TipTap JSON content
  status: TaskStatus;
  due_date?: string; // ISO date string
  is_request: boolean; // For assistance requests
  created_at: string;
  updated_at: string;
  
  // Joined data
  team?: Team;
  created_by_profile?: Profile;
  assignee_profile?: Profile;
}

export interface Team {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name?: string;
  title?: string;
  department?: string;
  location?: string;
  role?: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: 'admin' | 'member';
  created_at: string;
}

// Task creation and update interfaces
export interface CreateTaskData {
  team_id?: string;
  assignee_id?: string;
  title: string;
  description_json?: Record<string, unknown>;
  status?: TaskStatus;
  due_date?: string;
  is_request?: boolean;
}

export interface UpdateTaskData {
  title?: string;
  description_json?: Record<string, unknown>;
  status?: TaskStatus;
  assignee_id?: string;
  due_date?: string;
}

// Task status transitions mapping
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  awaiting_approval: ['in_progress', 'cancelled'], // Skip approved, go directly to in_progress
  approved: ['in_progress', 'on_hold', 'cancelled'], // Keep for future use but hidden
  in_progress: ['pending_review', 'blocked', 'on_hold', 'cancelled'],
  pending_review: ['done', 'rework', 'cancelled'],
  rework: ['in_progress', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  on_hold: ['in_progress', 'cancelled'],
  done: [],
  cancelled: []
};

// Task status display labels
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  awaiting_approval: 'Awaiting Approval',
  approved: 'Approved',
  in_progress: 'In Progress',
  pending_review: 'Pending Review',
  rework: 'Rework',
  done: 'Done',
  blocked: 'Blocked',
  on_hold: 'On Hold',
  cancelled: 'Cancelled'
};



// Task status colors for UI
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  awaiting_approval: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  pending_review: 'bg-purple-100 text-purple-800 border-purple-200',
  rework: 'bg-orange-100 text-orange-800 border-orange-200',
  done: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  blocked: 'bg-red-100 text-red-800 border-red-200',
  on_hold: 'bg-gray-100 text-gray-800 border-gray-200',
  cancelled: 'bg-slate-100 text-slate-800 border-slate-200'
};

// Kanban board column configuration
export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  color: string;
}

// Task filters
export interface TaskFilters {
  status?: TaskStatus[];
  assignee_id?: string;
  team_id?: string;
  is_request?: boolean;
  search?: string;
}

// Task sorting options
export type TaskSortField = 'created_at' | 'updated_at' | 'due_date' | 'title';
export type TaskSortOrder = 'asc' | 'desc';

export interface TaskSort {
  field: TaskSortField;
  order: TaskSortOrder;
}

// API response types
export interface TasksResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
}

export interface TaskResponse {
  task: Task;
}

// Form validation schemas (to be used with zod)
export interface TaskFormData {
  title: string;
  description_json?: Record<string, unknown>;
  assignee_id?: string;
  due_date?: string;
  team_id?: string;
  is_request: boolean;
}

// Drag and drop types for Kanban
export interface DragEndEvent {
  active: {
    id: string;
    data: {
      current: {
        task: Task;
        columnId: TaskStatus;
      };
    };
  };
  over: {
    id: string;
    data: {
      current: {
        columnId: TaskStatus;
      };
    };
  } | null;
}

// Task activity/history types
export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  action: 'created' | 'updated' | 'status_changed' | 'assigned' | 'commented';
  details: Record<string, unknown>;
  created_at: string;
  user_profile?: Profile;
}

// Task comment types
export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_profile?: Profile;
}

// Assistance request specific types
export interface AssistanceRequest extends Task {
  is_request: true;
  requesting_team?: Team;
  target_team?: Team;
  approval_status: 'pending' | 'approved' | 'rejected';
}

export interface CreateAssistanceRequestData {
  target_team_id: string;
  title: string;
  description_json?: Record<string, unknown>;
  due_date?: string;
}

// Request types for API endpoints
export interface CreateTaskRequest {
  title: string;
  description_json?: Record<string, unknown>;
  status?: TaskStatus;
  assignee_id?: string;
  due_date?: string;
  team_id?: string;
  is_request?: boolean;
}

export interface UpdateTaskRequest {
  title?: string;
  description_json?: Record<string, unknown>;
  status?: TaskStatus;
  assignee_id?: string;
  due_date?: string;
}