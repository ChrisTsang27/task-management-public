import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Standardized Supabase client configuration
export const createSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

// Standardized authentication helper
export async function authenticateRequest(request: NextRequest | Request) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createSupabaseClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    };
  }

  return {
    success: true,
    user,
    supabase
  };
}

// Standardized error response helper
export function createErrorResponse(message: string, status: number = 500, details?: unknown) {
  const response: { error: string; details?: unknown } = { error: message };
  if (details) {
    response.details = details;
  }
  return NextResponse.json(response, { status });
}

// Standardized success response helper
export function createSuccessResponse(data: unknown, status: number = 200) {
  return NextResponse.json(data, { status });
}

// Standardized validation helper
export function validateRequestBody<T>(body: unknown, schema: z.ZodSchema<T>) {
  const result = schema.safeParse(body);
  
  if (!result.success) {
    return {
      success: false,
      error: createErrorResponse(
        'Invalid request data',
        400,
        result.error.flatten()
      )
    };
  }

  return {
    success: true,
    data: result.data
  };
}

// Standardized pagination helper
export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Cap at 100
  const offset = (page - 1) * limit;
  
  return {
    page,
    limit,
    offset,
    range: {
      from: offset,
      to: offset + limit - 1
    }
  };
}

// Standardized query parameter parsing
export function parseArrayParam(param: string | null): string[] | undefined {
  return param ? param.split(',').filter(Boolean) : undefined;
}

export function parseBooleanParam(param: string | null): boolean | undefined {
  if (param === null) return undefined;
  return param === 'true';
}

// Standardized database error handling
export function handleDatabaseError(error: { code?: string; message?: string }, operation: string) {
  console.error(`Database error during ${operation}:`, error);
  
  // Handle specific PostgreSQL error codes
  switch (error.code) {
    case 'PGRST116':
      return createErrorResponse('Resource not found', 404);
    case '23505': // Unique violation
      return createErrorResponse('Resource already exists', 409);
    case '23503': // Foreign key violation
      return createErrorResponse('Invalid reference', 400);
    case '23514': // Check violation
      return createErrorResponse('Invalid data format', 400);
    default:
      return createErrorResponse(`Failed to ${operation}`, 500);
  }
}

// Standardized async handler wrapper
export function withErrorHandling<T extends unknown[]>(handler: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('Unexpected API error:', error);
      return createErrorResponse('Internal server error', 500);
    }
  };
}

// Common response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    limit,
    hasMore: page * limit < total
  };
}

// Standard select fields for common entities
export const STANDARD_SELECTS = {
  task: `
    *,
    team:teams!tasks_team_id_fkey(id, name),
    created_by_profile:profiles!tasks_created_by_fkey(id, full_name, title, department),
    assignee_profile:profiles!tasks_assignee_id_fkey(id, full_name, title, department)
  `,
  announcement: `
    id,
    title,
    content,
    priority,
    pinned,
    team_id,
    created_by,
    expires_at,
    created_at,
    updated_at,
    attachments,
    profiles!announcements_created_by_fkey(
      id,
      full_name,
      title,
      role
    )
  `,
  team: `
    *,
    team_members(
      role,
      user_id,
      profiles(id, full_name, title, department)
    )
  `,
  profile: `
    id,
    full_name,
    title,
    role,
    department,
    location
  `
};