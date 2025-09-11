import { z } from 'zod';

// Common validation patterns
const emailSchema = z.string().email('Invalid email format').toLowerCase().trim();
const nameSchema = z.string().min(1, 'Name is required').max(100, 'Name too long').trim();
const optionalStringSchema = z.string().trim().optional().nullable();

// User-related schemas
export const userValidationSchema = z.object({
  email: emailSchema,
  full_name: nameSchema,
  title: z.enum([
    'Manager', 'Senior Officer', 'Team Leader', 'Officer', 
    'Assistant', 'Coordinator', 'Specialist', 'Analyst', 
    'Executive', 'Other'
  ]).optional().nullable(),
  department: z.enum([
    'Sales', 'Marketing', 'Administration', 'HR', 
    'IT', 'Finance', 'Operations', 'Customer Service'
  ]).optional().nullable(),
  location: z.enum([
    'SGI Coopers Plains', 'SGI Brendale', 'SGI Gold Coast', 
    'SGI Toowoomba', 'SGI Melbourne', 'KAYO Coopers Plains'
  ]).optional().nullable(),
  role: z.enum(['admin', 'member']).default('member'),
  team_id: z.string().uuid().optional().nullable()
});

export const bulkUserImportSchema = z.array(userValidationSchema).min(1, 'At least one user required').max(1000, 'Too many users (max 1000)');

// Task-related schemas
export const taskValidationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
  description: z.string().max(2000, 'Description too long').trim().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  due_date: z.string().datetime().optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
  team_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().trim().max(50)).max(10, 'Too many tags').optional().default([])
});

// Announcement schemas
export const announcementValidationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
  content: z.string().min(1, 'Content is required').max(5000, 'Content too long').trim(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  target_audience: z.enum(['all', 'admins', 'team']).default('all'),
  team_id: z.string().uuid().optional().nullable(),
  expires_at: z.string().datetime().optional().nullable()
});

// Create schemas for API endpoints
export const announcementCreateSchema = announcementValidationSchema.omit({ expires_at: true }).extend({
  expires_at: z.string().datetime().optional()
});

export const profileCreateSchema = userValidationSchema.omit({ role: true, team_id: true });

export const emailTestSchema = z.object({
  to: emailSchema,
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long').trim(),
  body: z.string().min(1, 'Body is required').max(1000, 'Body too long').trim()
});

export const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user ID format')
});

// File upload schemas
export const fileUploadSchema = z.object({
  file: z.instanceof(File)
    .refine(file => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(
      file => ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type) ||
              ['csv', 'xlsx', 'xls'].includes(file.name.split('.').pop()?.toLowerCase() || ''),
      'File must be CSV or Excel format'
    )
});

// API parameter schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc')
});

export const userIdSchema = z.object({
  id: z.string().uuid('Invalid user ID format')
});

export const teamIdSchema = z.object({
  id: z.string().uuid('Invalid team ID format')
});

// Search and filter schemas
export const searchSchema = z.object({
  q: z.string().trim().max(100, 'Search query too long').optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  role: z.enum(['admin', 'member']).optional(),
  status: z.string().optional()
});

// Password and security schemas
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

// Email schemas
export const emailNotificationSchema = z.object({
  to: z.array(emailSchema).min(1, 'At least one recipient required').max(100, 'Too many recipients'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long').trim(),
  body: z.string().min(1, 'Body is required').max(10000, 'Body too long').trim(),
  priority: z.enum(['low', 'normal', 'high']).default('normal')
});

// Validation helper functions
export function validateAndSanitize<T>(data: unknown, schema: z.ZodSchema<T>) {
  try {
    const result = schema.parse(data);
    return { success: true, data: result, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        data: null,
        errors: error.flatten().fieldErrors
      };
    }
    return {
      success: false,
      data: null,
      errors: { _general: ['Validation failed'] }
    };
  }
}

// Sanitization functions
export function sanitizeHtml(input: string): string {
  // Basic HTML sanitization - remove script tags and dangerous attributes
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

export function sanitizeFileName(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

export function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/[<>"'&]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 100);
}