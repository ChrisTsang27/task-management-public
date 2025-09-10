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

// Validation schema for reaction creation
const ReactionSchema = z.object({
  emoji: z.string().min(1, 'Emoji is required').max(10, 'Emoji too long'),
  user_id: z.string().uuid('Invalid user ID')
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/announcements/[id]/reactions - Fetch reactions for an announcement
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: announcementId } = await params;

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

    // Fetch reactions with user information and group by emoji
    const { data: reactions, error } = await supabaseAdmin
      .from('announcement_reactions')
      .select(`
        emoji,
        user_id,
        announcement_id,
        created_at,
        profiles!announcement_reactions_user_id_fkey(
          id,
          full_name,
          title
        )
      `)
      .eq('announcement_id', announcementId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching reactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reactions' },
        { status: 500 }
      );
    }

    // Group reactions by emoji and count them
    const reactionGroups = reactions?.reduce((acc, reaction) => {
      const emoji = reaction.emoji;
      if (!acc[emoji]) {
        acc[emoji] = {
          emoji,
          count: 0,
          users: []
        };
      }
      acc[emoji].count++;
      acc[emoji].users.push({
        id: reaction.user_id,
        name: (reaction.profiles as { full_name?: string; title?: string })?.full_name || 'Unknown User',
        title: (reaction.profiles as { full_name?: string; title?: string })?.title
      });
      return acc;
    }, {} as Record<string, { emoji: string; count: number; users: Array<{ id: string; name: string; title?: string }> }>) || {};

    const groupedReactions = Object.values(reactionGroups);

    return NextResponse.json({ 
      reactions: reactions || [], 
      grouped: groupedReactions 
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/announcements/[id]/reactions - Add or toggle reaction
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: announcementId } = await params;
    const body = await request.json();
    
    if (!announcementId) {
      return NextResponse.json(
        { error: 'Announcement ID is required' },
        { status: 400 }
      );
    }

    const parsed = ReactionSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { emoji, user_id } = parsed.data;

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

    // Check if user already reacted with this emoji
    const { data: existingReaction, error: checkError } = await supabaseAdmin
      .from('announcement_reactions')
      .select('announcement_id, user_id, emoji')
      .eq('announcement_id', announcementId)
      .eq('user_id', user_id)
      .eq('emoji', emoji)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing reaction:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing reaction' },
        { status: 500 }
      );
    }

    if (existingReaction) {
      // Remove existing reaction (toggle off)
      const { error: deleteError } = await supabaseAdmin
        .from('announcement_reactions')
        .delete()
        .eq('announcement_id', announcementId)
        .eq('user_id', user_id)
        .eq('emoji', emoji);

      if (deleteError) {
        console.error('Error removing reaction:', deleteError);
        return NextResponse.json(
          { error: 'Failed to remove reaction' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        message: 'Reaction removed',
        action: 'removed'
      });
    } else {
      // Add new reaction
      const { data: reaction, error } = await supabaseAdmin
        .from('announcement_reactions')
        .insert({
          emoji,
          user_id,
          announcement_id: announcementId
        })
        .select(`
          emoji,
          user_id,
          announcement_id,
          created_at,
          profiles!announcement_reactions_user_id_fkey(
            id,
            full_name,
            title
          )
        `)
        .single();

      if (error) {
        console.error('Error creating reaction:', error);
        return NextResponse.json(
          { error: 'Failed to create reaction' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        reaction, 
        action: 'added'
      }, { status: 201 });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}