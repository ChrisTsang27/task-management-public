import { NextResponse } from 'next/server'

import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: Request) {
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
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Note: Using service role key to bypass RLS for team statistics
    // This is safe as we're only returning aggregated statistics, not sensitive data
    // Get all teams
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('id, name')
      .order('name')

    if (teamsError) {
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
    }

    // Get task statistics for each team
    const teamStats = await Promise.all(
      teams.map(async (team) => {
        const { data: tasks, error } = await supabaseAdmin
          .from('tasks')
          .select('status')
          .eq('team_id', team.id)

        if (error) {
          console.error(`Error fetching tasks for team ${team.name}:`, error)
          return {
            id: team.id,
            name: team.name,
            total: 0,
            todo: 0,
            in_progress: 0,
            done: 0
          }
        }

        const stats = {
          id: team.id,
          name: team.name,
          total: tasks.length,
          todo: tasks.filter(task => task.status === 'todo').length,
          in_progress: tasks.filter(task => task.status === 'in_progress').length,
          done: tasks.filter(task => task.status === 'done').length,
          awaiting_approval: tasks.filter(task => task.status === 'awaiting_approval').length,
          pending_review: tasks.filter(task => task.status === 'pending_review').length,
          approved: tasks.filter(task => task.status === 'approved').length
        }

        return stats
      })
    )

    return NextResponse.json(teamStats)
  } catch (error) {
    console.error('Error in teams stats API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}