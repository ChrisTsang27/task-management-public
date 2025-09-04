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

// Validation schema for query parameters
const QuerySchema = z.object({
  team_id: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  cursor: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  pinned_only: z.coerce.boolean().default(false),
  include_expired: z.coerce.boolean().default(true),
  search: z.string().optional(),
  use_cursor: z.coerce.boolean().default(false)
});

// GET /api/announcements/optimized - Optimized announcements fetching
export async function GET(request: Request) {
  try {
    // Check authentication
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const parsed = QuerySchema.safeParse(queryParams);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      team_id,
      limit,
      offset,
      cursor,
      priority,
      pinned_only,
      include_expired,
      search,
      use_cursor
    } = parsed.data;

    // Build the base query with optimized select
    let query = supabaseAdmin
      .from('announcements')
      .select(`
        id,
        title,
        content,
        priority,
        pinned,
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
      `, { count: 'exact' }); // Get total count for pagination

    // Apply filters
    if (team_id) {
      query = query.eq('team_id', team_id);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (pinned_only) {
      query = query.eq('pinned', true);
    }

    if (!include_expired) {
      query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
    }

    // Full-text search on title and content
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // Apply ordering - pinned first, then by creation date
    query = query.order('pinned', { ascending: false })
                 .order('created_at', { ascending: false });

    // Apply pagination
    if (use_cursor && cursor) {
      // Cursor-based pagination for better performance with large datasets
      query = query.lt('created_at', cursor);
    } else {
      // Offset-based pagination
      query = query.range(offset, offset + limit - 1);
    }

    // Limit results
    if (use_cursor) {
      query = query.limit(limit);
    }

    const { data: announcements, error, count } = await query;

    if (error) {
      console.error('Error fetching announcements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch announcements' },
        { status: 500 }
      );
    }

    // Calculate pagination metadata
    const totalCount = count || 0;
    const hasMore = use_cursor 
      ? (announcements?.length || 0) === limit
      : offset + limit < totalCount;
    
    const nextCursor = use_cursor && announcements && announcements.length > 0
      ? announcements[announcements.length - 1].created_at
      : null;

    const response = {
      announcements: announcements || [],
      pagination: {
        total: totalCount,
        limit,
        offset: use_cursor ? null : offset,
        hasMore,
        nextCursor: use_cursor ? nextCursor : null,
        currentPage: use_cursor ? null : Math.floor(offset / limit) + 1,
        totalPages: use_cursor ? null : Math.ceil(totalCount / limit)
      },
      filters: {
        team_id,
        priority,
        pinned_only,
        include_expired,
        search
      }
    };

    // Add cache headers for better performance
    const headers = new Headers({
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'Content-Type': 'application/json'
    });

    return new NextResponse(JSON.stringify(response), {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/announcements/optimized - Optimized announcement creation with batch operations
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Support both single announcement and batch creation
    const isArray = Array.isArray(body);
    const announcements = isArray ? body : [body];
    
    if (announcements.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 announcements can be created at once' },
        { status: 400 }
      );
    }

    // Validate each announcement
    const AnnouncementSchema = z.object({
      title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
      content: z.string().min(1, 'Content is required'),
      team_id: z.string().uuid().optional().nullable(),
      priority: z.enum(['low', 'medium', 'high']).default('medium'),
      pinned: z.boolean().default(false),
      expires_at: z.string().datetime().optional().nullable()
    });

    const validatedAnnouncements = [];
    for (const announcement of announcements) {
      const parsed = AnnouncementSchema.safeParse(announcement);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid announcement data', issues: parsed.error.flatten() },
          { status: 400 }
        );
      }
      validatedAnnouncements.push(parsed.data);
    }

    // Get user ID from headers
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    // Prepare data for insertion
    const insertData = validatedAnnouncements.map(announcement => ({
      ...announcement,
      created_by: userId
    }));

    // Batch insert with transaction
    const { data: createdAnnouncements, error } = await supabaseAdmin
      .from('announcements')
      .insert(insertData)
      .select(`
        id,
        title,
        content,
        priority,
        pinned,
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
      `);

    if (error) {
      console.error('Error creating announcements:', error);
      return NextResponse.json(
        { error: 'Failed to create announcements' },
        { status: 500 }
      );
    }

    // Return single announcement or array based on input
    const response = isArray 
      ? { announcements: createdAnnouncements }
      : { announcement: createdAnnouncements?.[0] };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/announcements/optimized - Batch update announcements
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { ids, updates } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Array of announcement IDs is required' },
        { status: 400 }
      );
    }

    if (ids.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 announcements can be updated at once' },
        { status: 400 }
      );
    }

    // Validate updates
    const UpdateSchema = z.object({
      title: z.string().min(1).max(200).optional(),
      content: z.string().min(1).optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      pinned: z.boolean().optional(),
      expires_at: z.string().datetime().nullable().optional()
    });

    const parsed = UpdateSchema.safeParse(updates);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid update data', issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Get user ID for authorization
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    // Check user permissions (admin or creator)
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const isAdmin = userProfile?.role === 'admin';

    // Build update query with authorization
    let updateQuery = supabaseAdmin
      .from('announcements')
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString()
      })
      .in('id', ids);

    // Apply authorization filter
    if (!isAdmin) {
      updateQuery = updateQuery.eq('created_by', userId);
    }

    const { data: updatedAnnouncements, error } = await updateQuery
      .select(`
        id,
        title,
        content,
        priority,
        pinned,
        team_id,
        created_by,
        expires_at,
        created_at,
        updated_at,
        attachments
      `);

    if (error) {
      console.error('Error updating announcements:', error);
      return NextResponse.json(
        { error: 'Failed to update announcements' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      updated: updatedAnnouncements?.length || 0,
      announcements: updatedAnnouncements
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}