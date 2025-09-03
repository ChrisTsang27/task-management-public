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

// Validation schema for announcement updates
const UpdateAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  team_id: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  expires_at: z.string().datetime().optional().nullable()
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/announcements/[id] - Fetch single announcement
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Announcement ID is required' },
        { status: 400 }
      );
    }

    const { data: announcement, error } = await supabaseAdmin
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
        attachments,
        profiles!announcements_created_by_fkey(
          id,
          full_name,
          title,
          role
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Announcement not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching announcement:', error);
      return NextResponse.json(
        { error: 'Failed to fetch announcement' },
        { status: 500 }
      );
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/announcements/[id] - Update announcement
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Announcement ID is required' },
        { status: 400 }
      );
    }

    const parsed = UpdateAnnouncementSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updateData = parsed.data;
    
    // Check if announcement exists and get current data
    const { error: fetchError } = await supabaseAdmin
      .from('announcements')
      .select('id, created_by')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Announcement not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching announcement:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch announcement' },
        { status: 500 }
      );
    }

    // Update the announcement
    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
        attachments,
        profiles!announcements_created_by_fkey(
          id,
          full_name,
          title,
          role
        )
      `)
      .single();

    if (error) {
      console.error('Error updating announcement:', error);
      return NextResponse.json(
        { error: 'Failed to update announcement' },
        { status: 500 }
      );
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/announcements/[id] - Delete announcement
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Announcement ID is required' },
        { status: 400 }
      );
    }

    // Check if announcement exists
    const { error: fetchError } = await supabaseAdmin
      .from('announcements')
      .select('id, created_by')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Announcement not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching announcement:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch announcement' },
        { status: 500 }
      );
    }

    // Delete the announcement (this will cascade delete comments and reactions)
    const { error } = await supabaseAdmin
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting announcement:', error);
      return NextResponse.json(
        { error: 'Failed to delete announcement' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}