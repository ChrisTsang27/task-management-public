import { z } from 'zod';

// Common field validations
export const emailSchema = z.string().email('Please enter a valid email address');
export const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
export const requiredStringSchema = z.string().min(1, 'This field is required');
export const optionalStringSchema = z.string().optional();

// User profile schemas
export const userProfileSchema = z.object({
  email: emailSchema,
  full_name: requiredStringSchema,
  title: requiredStringSchema,
  department: requiredStringSchema,
  location: requiredStringSchema,
  role: z.enum(['admin', 'user']).default('user')
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: passwordSchema,
  fullName: requiredStringSchema,
  title: requiredStringSchema,
  department: requiredStringSchema,
  location: requiredStringSchema
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

// Announcement schemas
export const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().min(1, 'Content is required'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  team_id: optionalStringSchema,
  expires_at: z.string().datetime().optional().or(z.literal('')),
  pinned: z.boolean().default(false),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    size: z.number().optional()
  })).optional()
});

export const announcementUpdateSchema = announcementSchema.partial();

export const announcementCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment must be less than 1000 characters'),
  announcement_id: z.string().uuid()
});

// Email schemas
export const emailSchema_composer = z.object({
  recipients: z.array(z.object({
    id: z.string(),
    email: emailSchema,
    full_name: requiredStringSchema
  })).min(1, 'At least one recipient is required'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject must be less than 200 characters'),
  content: z.string().min(1, 'Email content is required'),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  send_immediately: z.boolean().default(true),
  scheduled_at: z.string().datetime().optional()
});

// Task schemas
export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: optionalStringSchema,
  status: z.enum(['todo', 'in_progress', 'review', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assigned_to: optionalStringSchema,
  due_date: z.string().datetime().optional().or(z.literal('')),
  team_id: optionalStringSchema,
  tags: z.array(z.string()).optional()
});

export const taskUpdateSchema = taskSchema.partial();

// Filter schemas
export const announcementFiltersSchema = z.object({
  team_id: optionalStringSchema,
  priority: z.enum(['low', 'medium', 'high']).optional(),
  pinned_only: z.boolean().optional(),
  include_expired: z.boolean().optional(),
  search: optionalStringSchema
});

export const taskFiltersSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assigned_to: optionalStringSchema,
  team_id: optionalStringSchema,
  search: optionalStringSchema
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  cursor: optionalStringSchema
});

// API response schemas
export const apiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => z.object({
  data: dataSchema,
  success: z.boolean(),
  message: optionalStringSchema,
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    hasMore: z.boolean(),
    nextCursor: optionalStringSchema
  }).optional()
});

// Export types
export type UserProfile = z.infer<typeof userProfileSchema>;
export type SignUpData = z.infer<typeof signUpSchema>;
export type SignInData = z.infer<typeof signInSchema>;
export type AnnouncementData = z.infer<typeof announcementSchema>;
export type AnnouncementUpdateData = z.infer<typeof announcementUpdateSchema>;
export type AnnouncementCommentData = z.infer<typeof announcementCommentSchema>;
export type EmailData = z.infer<typeof emailSchema_composer>;
export type TaskData = z.infer<typeof taskSchema>;
export type TaskUpdateData = z.infer<typeof taskUpdateSchema>;
export type AnnouncementFilters = z.infer<typeof announcementFiltersSchema>;
export type TaskFilters = z.infer<typeof taskFiltersSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;

// Validation helper functions
export const validateEmail = (email: string) => {
  try {
    emailSchema.parse(email);
    return { isValid: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message };
    }
    return { isValid: false, error: 'Invalid email' };
  }
};

export const validatePassword = (password: string) => {
  try {
    passwordSchema.parse(password);
    return { isValid: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0].message };
    }
    return { isValid: false, error: 'Invalid password' };
  }
};

export const validateForm = <T>(schema: z.ZodSchema<T>, data: unknown) => {
  try {
    const validatedData = schema.parse(data);
    return { isValid: true, data: validatedData, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = error.errors.reduce((acc, err) => {
        const path = err.path.join('.');
        acc[path] = err.message;
        return acc;
      }, {} as Record<string, string>);
      return { isValid: false, data: null, errors: fieldErrors };
    }
    return { isValid: false, data: null, errors: { general: 'Validation failed' } };
  }
};