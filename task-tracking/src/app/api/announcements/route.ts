import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Create a Supabase client with service role key to bypass RLS for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Validation schema for announcement creation/update
const AnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  team_id: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  expires_at: z.string().datetime().optional().nullable()
});

// GET /api/announcements - Fetch all announcements
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('team_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('announcements')
      .select(`
        id,
        title,
        content,
        priority,
        team_id,
        created_by,
        expires_at,
        created_at,
        updated_at,
        profiles(
          id,
          full_name,
          title,
          role
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by team if specified
    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data: announcements, error } = await query;

    if (error) {
      console.error('Error fetching announcements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch announcements' },
        { status: 500 }
      );
    }

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/announcements - Create new announcement
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = AnnouncementSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, content, team_id, priority, expires_at } = parsed.data;
    
    // Get the user ID from the request headers (set by middleware)
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // For now, we'll need to get the user ID from the session
    // This is a simplified approach - in production you'd want proper auth middleware
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .insert({
        title,
        content,
        team_id,
        priority,
        expires_at,
        created_by: userId
      })
      .select(`
        id,
        title,
        content,
        priority,
        team_id,
        created_by,
        expires_at,
        created_at,
        updated_at,
        profiles(
          id,
          full_name,
          title,
          role
        )
      `)
      .single();

    if (error) {
      console.error('Error creating announcement:', error);
      return NextResponse.json(
        { error: 'Failed to create announcement' },
        { status: 500 }
      );
    }

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}