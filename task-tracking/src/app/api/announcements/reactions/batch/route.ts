import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// POST /api/announcements/reactions/batch - Fetch reactions for multiple announcements
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { announcementIds } = body;

    if (!announcementIds || !Array.isArray(announcementIds) || announcementIds.length === 0) {
      return NextResponse.json(
        { error: 'Announcement IDs array is required' },
        { status: 400 }
      );
    }

    // Limit to prevent abuse
    if (announcementIds.length > 50) {
      return NextResponse.json(
        { error: 'Too many announcement IDs. Maximum 50 allowed.' },
        { status: 400 }
      );
    }

    // Fetch reactions for all announcements in a single query
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
      .in('announcement_id', announcementIds)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching batch reactions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reactions' },
        { status: 500 }
      );
    }

    // Group reactions by announcement_id and aggregate by emoji
    const groupedReactions: Record<string, { emoji: string; count: number; user_reacted: boolean }[]> = {};
    
    // Initialize empty arrays for all requested announcements
    announcementIds.forEach(id => {
      groupedReactions[id] = [];
    });

    // Group and aggregate reactions by emoji
    reactions?.forEach(reaction => {
      const announcementId = reaction.announcement_id;
      if (!groupedReactions[announcementId]) {
        groupedReactions[announcementId] = [];
      }
      
      // Find existing emoji entry or create new one
      let emojiEntry = groupedReactions[announcementId].find(r => r.emoji === reaction.emoji);
      if (!emojiEntry) {
        emojiEntry = {
          emoji: reaction.emoji,
          count: 0,
          user_reacted: false
        };
        groupedReactions[announcementId].push(emojiEntry);
      }
      
      // Increment count
      emojiEntry.count++;
      
      // Note: user_reacted would need user context to determine properly
      // For now, keeping it as false since we don't have current user info in this endpoint
    });

    return NextResponse.json(
      { 
        reactions: groupedReactions,
        success: true 
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
        }
      }
    );
  } catch (error) {
    console.error('Batch reactions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}