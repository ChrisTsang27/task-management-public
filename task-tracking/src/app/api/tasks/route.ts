import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CreateTaskData } from '@/types/tasks';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/tasks - Fetch tasks with filtering and sorting
export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status')?.split(',');
    const priority = searchParams.get('priority')?.split(',');
    const assignee_id = searchParams.get('assignee_id');
    const team_id = searchParams.get('team_id');
    const is_request_param = searchParams.get('is_request');
    const search = searchParams.get('search');
    const sort_field = searchParams.get('sort_field') || 'created_at';
    const sort_order = searchParams.get('sort_order') || 'desc';

    // Build query
    let query = supabase
      .from('tasks')
      .select(`
        *,
        team:teams(id, name),
        created_by_profile:profiles!tasks_created_by_fkey(id, full_name, title, department),
        assignee_profile:profiles!tasks_assignee_id_fkey(id, full_name, title, department)
      `);

    // Apply filters
    if (status && status.length > 0) {
      query = query.in('status', status);
    }
    
    if (priority && priority.length > 0) {
      query = query.in('priority', priority);
    }
    
    if (assignee_id) {
      query = query.eq('assignee_id', assignee_id);
    }
    
    if (team_id) {
      query = query.eq('team_id', team_id);
    }
    
    if (is_request_param !== null) {
      query = query.eq('is_request', is_request_param === 'true');
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,description_json->>"content".ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sort_field, { ascending: sort_order === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: tasks, error, count } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tasks: tasks || [],
      total: count || 0,
      page,
      limit
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body: CreateTaskData = await request.json();
    
    // Get user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    // Extract user ID from auth header or session
    // This is a simplified version - in production, you'd validate the JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Create task data
    const taskData = {
      ...body,
      created_by: user.id,
      // Preserve the status from the form, only override for assistance requests
      status: body.is_request ? 'awaiting_approval' : (body.status || 'awaiting_approval')
    };

    const { data: task, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select(`
        *,
        team:teams(id, name),
        created_by_profile:profiles!tasks_created_by_fkey(id, full_name, title, department),
        assignee_profile:profiles!tasks_assignee_id_fkey(id, full_name, title, department)
      `)
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      );
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}