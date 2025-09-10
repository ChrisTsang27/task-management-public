import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

// Type definitions
interface Profile {
  id: string;
  full_name: string;
  title?: string;
}

interface ReactionData {
  emoji: string;
  user_id: string;
  announcement_id: string;
  created_at: string;
  profiles: Profile[] | Profile | null;
}

interface FormattedReaction {
  id: string;
  emoji: string;
  user_id: string;
  announcement_id: string;
  created_at: string;
  profiles: Profile;
}

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
    // Handle empty request body gracefully
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('Invalid JSON in request body:', jsonError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { announcementIds } = body || {};

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

    // Group reactions by announcement_id
    const groupedReactions: Record<string, FormattedReaction[]> = {};
    
    // Initialize empty arrays for all requested announcements
    announcementIds.forEach(id => {
      groupedReactions[id] = [];
    });

    // Group reactions by announcement_id
    reactions?.forEach((reaction: ReactionData) => {
      const announcementId = reaction.announcement_id;
      if (!groupedReactions[announcementId]) {
        groupedReactions[announcementId] = [];
      }
      
      // Add the reaction with proper structure
      const formattedReaction: FormattedReaction = {
        id: `${reaction.announcement_id}-${reaction.user_id}-${reaction.emoji}`,
        emoji: reaction.emoji,
        user_id: reaction.user_id,
        announcement_id: reaction.announcement_id,
        created_at: reaction.created_at,
        profiles: Array.isArray(reaction.profiles) 
          ? reaction.profiles[0] || {
              id: reaction.user_id,
              full_name: 'Unknown User',
              title: undefined
            }
          : reaction.profiles || {
              id: reaction.user_id,
              full_name: 'Unknown User',
              title: undefined
            }
      };
      
      groupedReactions[announcementId].push(formattedReaction);
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