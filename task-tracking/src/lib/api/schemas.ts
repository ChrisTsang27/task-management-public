import { z } from 'zod';

// Common validation schemas
export const IdSchema = z.string().uuid('Invalid ID format');

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).optional()
});

// Task schemas
export const TaskStatusSchema = z.enum([
  'awaiting_approval',
  'approved',
  'in_progress',
  'completed',
  'rejected'
]);

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description_json: z.record(z.any()).optional(),
  priority: TaskPrioritySchema.default('medium'),
  status: TaskStatusSchema.default('awaiting_approval'),
  assignee_id: IdSchema.optional().nullable(),
  team_id: IdSchema.optional().nullable(),
  target_team_id: IdSchema.optional().nullable(),
  is_request: z.boolean().default(false),
  due_date: z.string().datetime().optional().nullable(),
  estimated_hours: z.number().min(0).optional().nullable()
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  id: IdSchema
});

export const TaskFiltersSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  assignee_id: IdSchema.optional(),
  team_id: IdSchema.optional(),
  is_request: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sort_field: z.string().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// Announcement schemas
export const AnnouncementPrioritySchema = z.enum(['low', 'medium', 'high']);

export const CreateAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  team_id: IdSchema.optional().nullable(),
  priority: AnnouncementPrioritySchema.default('medium'),
  pinned: z.boolean().default(false),
  expires_at: z.string().datetime().optional().nullable(),
  attachments: z.array(z.string()).optional()
});

export const UpdateAnnouncementSchema = CreateAnnouncementSchema.partial().extend({
  id: IdSchema
});

export const AnnouncementFiltersSchema = z.object({
  team_id: IdSchema.optional(),
  priority: z.string().optional(),
  pinned: z.coerce.boolean().optional(),
  search: z.string().optional()
});

// Team schemas
export const TeamRoleSchema = z.enum(['admin', 'member', 'viewer']);

export const CreateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Team name too long'),
  description: z.string().optional().nullable(),
  is_public: z.boolean().default(false)
});

export const UpdateTeamSchema = CreateTeamSchema.partial().extend({
  id: IdSchema
});

export const TeamMemberSchema = z.object({
  user_id: IdSchema,
  team_id: IdSchema,
  role: TeamRoleSchema.default('member')
});

// User/Profile schemas
export const UpdateProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Name too long'),
  title: z.string().max(100, 'Title too long').optional().nullable(),
  department: z.string().max(100, 'Department too long').optional().nullable(),
  location: z.string().max(100, 'Location too long').optional().nullable(),
  role: z.string().max(50, 'Role too long').optional().nullable()
});

// Comment schemas
export const CreateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
  parent_id: IdSchema.optional().nullable()
});

export const UpdateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required')
});

// Reaction schemas
export const ReactionTypeSchema = z.enum(['like', 'love', 'laugh', 'wow', 'sad', 'angry']);

export const CreateReactionSchema = z.object({
  type: ReactionTypeSchema
});

// AI Prioritization schemas
export const AIPrioritizationActionSchema = z.enum(['single', 'team', 'all']);

export const AIPrioritizationRequestSchema = z.object({
  action: AIPrioritizationActionSchema,
  task_id: IdSchema.optional(),
  team_id: IdSchema.optional()
}).refine(
  (data) => {
    if (data.action === 'single' && !data.task_id) {
      return false;
    }
    if (data.action === 'team' && !data.team_id) {
      return false;
    }
    return true;
  },
  {
    message: 'task_id required for single action, team_id required for team action'
  }
);

// Email schemas
export const SendEmailSchema = z.object({
  to: z.array(z.string().email()).min(1, 'At least one recipient required'),
  subject: z.string().min(1, 'Subject is required'),
  content: z.string().min(1, 'Content is required'),
  template: z.string().optional(),
  variables: z.record(z.any()).optional()
});

// File upload schemas
export const FileUploadSchema = z.object({
  file: z.instanceof(File),
  folder: z.string().optional(),
  public: z.boolean().default(false)
});

// Search schemas
export const SearchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  type: z.enum(['tasks', 'announcements', 'users', 'teams']).optional(),
  filters: z.record(z.any()).optional()
});

// Export all schemas for easy importing
export const schemas = {
  // Common
  Id: IdSchema,
  Pagination: PaginationSchema,
  
  // Tasks
  CreateTask: CreateTaskSchema,
  UpdateTask: UpdateTaskSchema,
  TaskFilters: TaskFiltersSchema,
  TaskStatus: TaskStatusSchema,
  TaskPriority: TaskPrioritySchema,
  
  // Announcements
  CreateAnnouncement: CreateAnnouncementSchema,
  UpdateAnnouncement: UpdateAnnouncementSchema,
  AnnouncementFilters: AnnouncementFiltersSchema,
  AnnouncementPriority: AnnouncementPrioritySchema,
  
  // Teams
  CreateTeam: CreateTeamSchema,
  UpdateTeam: UpdateTeamSchema,
  TeamMember: TeamMemberSchema,
  TeamRole: TeamRoleSchema,
  
  // Users/Profiles
  UpdateProfile: UpdateProfileSchema,
  
  // Comments
  CreateComment: CreateCommentSchema,
  UpdateComment: UpdateCommentSchema,
  
  // Reactions
  CreateReaction: CreateReactionSchema,
  ReactionType: ReactionTypeSchema,
  
  // AI
  AIPrioritizationRequest: AIPrioritizationRequestSchema,
  AIPrioritizationAction: AIPrioritizationActionSchema,
  
  // Email
  SendEmail: SendEmailSchema,
  
  // Files
  FileUpload: FileUploadSchema,
  
  // Search
  Search: SearchSchema
};