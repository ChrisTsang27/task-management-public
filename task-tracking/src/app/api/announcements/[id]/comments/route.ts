import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Create a Supabase client with service role key
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

// Validation schema for comment creation
const CommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(1000, 'Comment too long')
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/announcements/[id]/comments - Fetch comments for an announcement
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: announcementId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!announcementId) {
      return NextResponse.json(
        { error: 'Announcement ID is required' },
        { status: 400 }
      );
    }

    // First check if announcement exists
    const { error: announcementError } = await supabaseAdmin
      .from('announcements')
      .select('id')
      .eq('id', announcementId)
      .single();

    if (announcementError) {
      if (announcementError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Announcement not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching announcement:', announcementError);
      return NextResponse.json(
        { error: 'Failed to verify announcement' },
        { status: 500 }
      );
    }

    // Fetch comments with user information
    const { data: comments, error } = await supabaseAdmin
      .from('announcement_comments')
      .select(`
        id,
        body,
        user_id,
        announcement_id,
        created_at,
        profiles!announcement_comments_user_id_fkey(
          id,
          full_name,
          title,
          role
        )
      `)
      .eq('announcement_id', announcementId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/announcements/[id]/comments - Create new comment
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: announcementId } = await params;
    const body = await request.json();
    console.log('POST request body:', body);
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    
    if (!announcementId) {
      return NextResponse.json(
        { error: 'Announcement ID is required' },
        { status: 400 }
      );
    }

    const parsed = CommentSchema.safeParse(body);
    
    if (!parsed.success) {
      console.error('Validation failed:', parsed.error.flatten());
      return NextResponse.json(
        { error: 'Invalid data', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { content } = parsed.data;
    const user_id = request.headers.get('x-user-id');
    
    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    // First check if announcement exists
    const { error: announcementError } = await supabaseAdmin
      .from('announcements')
      .select('id')
      .eq('id', announcementId)
      .single();

    if (announcementError) {
      if (announcementError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Announcement not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching announcement:', announcementError);
      return NextResponse.json(
        { error: 'Failed to verify announcement' },
        { status: 500 }
      );
    }

    // Create the comment
    const { data: comment, error } = await supabaseAdmin
      .from('announcement_comments')
      .insert({
        body: content,
        user_id,
        announcement_id: announcementId
      })
      .select(`
        id,
        body,
        user_id,
        announcement_id,
        created_at,
        profiles!announcement_comments_user_id_fkey(
          id,
          full_name,
          title,
          role
        )
      `)
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}