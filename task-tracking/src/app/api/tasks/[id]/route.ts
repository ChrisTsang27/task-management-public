import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { UpdateTaskData, TaskStatus } from '@/types/tasks';
import { isValidStatusTransition } from '@/utils/workflow';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/tasks/[id] - Fetch a single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        team:teams!tasks_team_id_fkey(id, name),
        created_by_profile:profiles!tasks_created_by_fkey(id, full_name, title, department),
        assignee_profile:profiles!tasks_assignee_id_fkey(id, full_name, title, department)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching task:', error);
      return NextResponse.json(
        { error: 'Failed to fetch task' },
        { status: 500 }
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Update a task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body: UpdateTaskData = await request.json();
    
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

    // First, get the current task to validate status transitions
    const { data: currentTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch task' },
        { status: 500 }
      );
    }

    // Validate status transition if status is being updated
    if (body.status && body.status !== currentTask.status) {
      if (!isValidStatusTransition(currentTask.status as TaskStatus, body.status)) {
        return NextResponse.json(
          { 
            error: `Invalid status transition from ${currentTask.status} to ${body.status}`
          },
          { status: 400 }
        );
      }
    }

    // Check permissions (simplified - in production, implement proper role-based access)
    // Allow rejecting tasks for any authenticated user, but restrict other edits
    const canEdit = 
      currentTask.created_by === user.id || 
      currentTask.assignee_id === user.id ||
      (body.status === 'done' && currentTask.status === 'awaiting_approval'); // Allow anyone to reject pending requests
    
    if (!canEdit) {
      return NextResponse.json(
        { error: 'Insufficient permissions to edit this task' },
        { status: 403 }
      );
    }

    // Update the task
    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    };

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    // First, get the current task to check permissions
    const { data: currentTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch task' },
        { status: 500 }
      );
    }

    // Get user profile to check role
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userProfile?.role === 'admin';

    // Check permissions (creator, assignee, or admin can delete)
    const canDelete = 
      currentTask.created_by === user.id || 
      currentTask.assignee_id === user.id ||
      isAdmin;
    
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete this task' },
        { status: 403 }
      );
    }

    // Delete the task
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json(
        { error: 'Failed to delete task' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}