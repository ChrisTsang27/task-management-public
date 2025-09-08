import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateRequest,
  createSuccessResponse,
  validateRequestBody,
  parsePaginationParams,
  parseArrayParam,
  parseBooleanParam,
  handleDatabaseError,
  withErrorHandling,
  createPaginatedResponse,
  STANDARD_SELECTS
} from '@/lib/api/utils';
import { CreateTaskSchema, TaskFiltersSchema } from '@/lib/api/schemas';

// GET /api/tasks - Fetch tasks with filtering and sorting
export const GET = withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
  // Authenticate user
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return authResult.error!;
  }
  const { user, supabase } = authResult;

  const { searchParams } = new URL(request.url);
  
  // Parse and validate query parameters
  const pagination = parsePaginationParams(searchParams);
  const filters = {
    status: searchParams.get('status') || undefined,
    priority: searchParams.get('priority') || undefined,
    assignee_id: searchParams.get('assignee_id') || undefined,
    team_id: searchParams.get('team_id') || undefined,
    is_request: parseBooleanParam(searchParams.get('is_request')),
    search: searchParams.get('search') || undefined,
    sort_field: searchParams.get('sort_field') || 'created_at',
    sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc'
  };

  // Parse array parameters separately for filtering
  const statusArray = parseArrayParam(searchParams.get('status'));
  const priorityArray = parseArrayParam(searchParams.get('priority'));

  // Validate filters
  const filterValidation = validateRequestBody(filters, TaskFiltersSchema);
  if (!filterValidation.success) {
    return filterValidation.error!;
  }

  // Build query with standardized select
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }
  
  let query = supabase
    .from('tasks')
    .select(STANDARD_SELECTS.task, { count: 'exact' });

  // Apply filters
  if (statusArray && statusArray.length > 0) {
    query = query.in('status', statusArray);
  }
  
  if (priorityArray && priorityArray.length > 0) {
    query = query.in('priority', priorityArray);
  }
  
  if (filters.assignee_id) {
    query = query.eq('assignee_id', filters.assignee_id);
  }
  
  if (filters.team_id) {
    query = query.eq('team_id', filters.team_id);
  }
  
  if (filters.is_request !== undefined) {
    query = query.eq('is_request', filters.is_request);
  }
  
  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description_json->"content".ilike.%${filters.search}%`);
  }

  // Apply sorting
  query = query.order(filters.sort_field, { ascending: filters.sort_order === 'asc' });

  // Apply pagination
  query = query.range(pagination.range.from, pagination.range.to);

  const { data: tasks, error, count } = await query;

  if (error) {
    return handleDatabaseError(error, 'fetch tasks');
  }

  const response = createPaginatedResponse(
    tasks || [],
    count || 0,
    pagination.page,
    pagination.limit
  );

  return createSuccessResponse({ tasks: response.data, ...response });
});

// POST /api/tasks - Create a new task
export const POST = withErrorHandling(async (request: NextRequest): Promise<NextResponse> => {
  // Authenticate user
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return authResult.error!;
  }
  const { user, supabase } = authResult;

  const body = await request.json();
  
  // Validate request body
  const validation = validateRequestBody(body, CreateTaskSchema);
  if (!validation.success) {
    return validation.error!;
  }

  const taskData = validation.data;
  
  if (!user) {
    return NextResponse.json({ error: 'User authentication failed' }, { status: 401 });
  }
  
  if (!taskData) {
    return NextResponse.json({ error: 'Invalid task data' }, { status: 400 });
  }

  // Create task data with user context
  let finalTaskData = {
    ...taskData,
    created_by: user.id,
    // Preserve the status from the form, only override for assistance requests
    status: taskData.is_request ? 'awaiting_approval' : (taskData.status || 'awaiting_approval')
  };

  // For assistance requests, store target_team_id in description_json metadata
  // and set team_id to the target team so it appears in their view
  if (taskData.is_request && taskData.target_team_id) {
    const originalDescription = finalTaskData.description_json || {};
    // Use the team_id from the request body as the requesting team ID
    const requestingTeamId = taskData.team_id; // This comes from the frontend
    finalTaskData = {
      ...finalTaskData,
      team_id: taskData.target_team_id, // Set to target team so it appears in their view
      description_json: {
        ...originalDescription,
        _metadata: {
          ...(originalDescription && typeof originalDescription === 'object' && '_metadata' in originalDescription ? originalDescription._metadata : {}),
          requesting_team_id: requestingTeamId, // Store the requesting team ID
          target_team_id: taskData.target_team_id,
          is_assistance_request: true
        }
      }
    };
  }

  // Remove target_team_id from top level since column doesn't exist
  const { target_team_id: _target_team_id, ...taskDataWithoutTargetTeam } = finalTaskData;
  
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }
  
  const { data: task, error } = await supabase
    .from('tasks')
    .insert([taskDataWithoutTargetTeam])
    .select(STANDARD_SELECTS.task)
    .single();

  if (error) {
    return handleDatabaseError(error, 'create task');
  }

  return createSuccessResponse({ task }, 201);
});