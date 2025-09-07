import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import AIPrioritizationService from '@/lib/services/aiPrioritization';
import { headers } from 'next/headers';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/ai/prioritize
 * Calculate and update AI priority scores for tasks
 */
export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const headersList = await headers();
    const authorization = headersList.get('authorization');
    
    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Verify user authentication
    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { task_id, team_id, action } = body;

    // Validate request
    if (!action || !['single', 'team', 'all'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "single", "team", or "all"' },
        { status: 400 }
      );
    }

    if (action === 'single' && !task_id) {
      return NextResponse.json(
        { error: 'task_id required for single task prioritization' },
        { status: 400 }
      );
    }

    if (action === 'team' && !team_id) {
      return NextResponse.json(
        { error: 'team_id required for team prioritization' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'single':
        result = await prioritizeSingleTask(task_id, user.id);
        break;
      case 'team':
        result = await prioritizeTeamTasks(team_id, user.id);
        break;
      case 'all':
        result = await prioritizeAllUserTasks(user.id);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('AI prioritization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/prioritize?team_id=xxx
 * Get AI-prioritized tasks for a team
 */
export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const headersList = await headers();
    const authorization = headersList.get('authorization');
    
    if (!authorization) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Verify user authentication
    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const team_id = searchParams.get('team_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!team_id) {
      return NextResponse.json(
        { error: 'team_id parameter required' },
        { status: 400 }
      );
    }

    // Verify user has access to this team
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', team_id)
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      return NextResponse.json(
        { error: 'Access denied to this team' },
        { status: 403 }
      );
    }

    // Get AI-prioritized tasks
    const tasks = await AIPrioritizationService.getAIPrioritizedTasks(team_id, limit);

    return NextResponse.json({
      tasks,
      total: tasks.length,
      team_id,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching AI-prioritized tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Prioritize a single task
 */
async function prioritizeSingleTask(taskId: string, userId: string) {
  // Fetch the task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    throw new Error('Task not found');
  }

  // Verify user has access to this task
  if (task.created_by !== userId && task.assignee_id !== userId) {
    // Check if user is in the same team
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', task.team_id)
      .eq('user_id', userId)
      .single();

    if (!teamMember) {
      throw new Error('Access denied to this task');
    }
  }

  // Get team tasks for context
  const { data: teamTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('team_id', task.team_id)
    .not('status', 'eq', 'done');

  // Calculate priority score
  const teamWorkload = teamTasks?.filter(t => 
    ['approved', 'in_progress', 'pending_review'].includes(t.status)
  ).length || 0;

  const { score, insights } = await AIPrioritizationService.calculatePriorityScore(
    task,
    teamTasks || [],
    teamWorkload
  );

  // Update task with new priority score
  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      priority_score: score,
      ai_insights: insights,
      ai_last_updated: new Date().toISOString()
    })
    .eq('id', taskId);

  if (updateError) {
    throw new Error('Failed to update task priority');
  }

  return {
    task_id: taskId,
    priority_score: score,
    insights,
    updated_at: new Date().toISOString()
  };
}

/**
 * Prioritize all tasks for a team
 */
async function prioritizeTeamTasks(teamId: string, userId: string) {
  // Verify user has access to this team
  const { data: teamMember, error: teamError } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (teamError || !teamMember) {
    throw new Error('Access denied to this team');
  }

  // Update all tasks for the team
  await AIPrioritizationService.updateTasksPriorityScores(teamId);

  // Get updated task count
  const { count } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .not('status', 'eq', 'done');

  return {
    team_id: teamId,
    tasks_updated: count || 0,
    updated_at: new Date().toISOString()
  };
}

/**
 * Prioritize all tasks for all teams the user belongs to
 */
async function prioritizeAllUserTasks(userId: string) {
  // Get all teams the user belongs to
  const { data: userTeams, error: teamsError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId);

  if (teamsError || !userTeams) {
    throw new Error('Failed to fetch user teams');
  }

  let totalUpdated = 0;
  const results = [];

  // Update tasks for each team
  for (const { team_id } of userTeams) {
    try {
      await AIPrioritizationService.updateTasksPriorityScores(team_id);
      
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team_id)
        .not('status', 'eq', 'done');

      const teamCount = count || 0;
      totalUpdated += teamCount;
      
      results.push({
        team_id,
        tasks_updated: teamCount
      });
    } catch (error) {
      console.error(`Error updating team ${team_id}:`, error);
      results.push({
        team_id,
        error: 'Failed to update'
      });
    }
  }

  return {
    total_tasks_updated: totalUpdated,
    teams_processed: userTeams.length,
    results,
    updated_at: new Date().toISOString()
  };
}