import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest, createErrorResponse, createSuccessResponse } from '@/lib/api/utils';
import { rateLimiters } from '@/lib/middleware/rateLimiter';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/teams - Fetch teams with members
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimiters.general(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.error!;
    }
    const { user, supabase: userSupabase } = authResult;

    const { searchParams } = new URL(request.url);
    const include_members = searchParams.get('include_members') === 'true';
    
    let query = supabase
      .from('teams')
      .select('*');

    if (include_members) {
      query = supabase
        .from('teams')
        .select(`
          *,
          team_members(
            role,
            user_id,
            profiles(id, full_name, title, department)
          )
        `);
    }

    const { data: teams, error } = await query.order('name');

    if (error) {
      console.error('Error fetching teams:', error);
      return NextResponse.json(
        { error: 'Failed to fetch teams' },
        { status: 500 }
      );
    }

    return NextResponse.json({ teams: teams || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimiters.general(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.error!;
    }
    const { user, supabase: userSupabase } = authResult;

    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return createErrorResponse('Team name is required', 400);
    }

    // Create team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert([{ name: body.name }])
      .select()
      .single();

    if (teamError) {
      console.error('Error creating team:', teamError);
      return createErrorResponse('Failed to create team', 500);
    }

    // Add creator as team admin
    const { error: memberError } = await supabase
      .from('team_members')
      .insert([{
        team_id: team.id,
        user_id: user.id,
        role: 'admin'
      }]);

    if (memberError) {
      console.error('Error adding team member:', memberError);
      // Note: In production, you might want to rollback the team creation
    }

    return createSuccessResponse({ team }, 201);
  } catch (error) {
    console.error('Unexpected error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}