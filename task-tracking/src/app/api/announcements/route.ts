import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { announcementCreateSchema, validateAndSanitize, sanitizeHtml } from '@/lib/validation/schemas';
import { rateLimiters } from '@/lib/middleware/rateLimiter';
import { authenticateRequest, createErrorResponse, createSuccessResponse } from '@/lib/api/utils';

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



// GET /api/announcements - Fetch all announcements
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
      `)
      .order('pinned', { ascending: false })
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
    return createErrorResponse('Internal server error', 500);
  }
}

// POST /api/announcements - Create new announcement
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
    const { user } = authResult;

    // Ensure user is defined
    if (!user) {
      return createErrorResponse('User not authenticated', 401);
    }

    const body = await request.json();
    
    // Validate and sanitize input data
    const validation = validateAndSanitize(body, announcementCreateSchema);
    if (!validation.success) {
      return createErrorResponse('Invalid announcement data', 400, validation.errors);
    }

    // Ensure validation data is not null
    if (!validation.data) {
      return createErrorResponse('No valid announcement data provided', 400);
    }

    const { title, content, team_id, priority, expires_at } = validation.data;
    
    // Sanitize text content to prevent XSS
    const sanitizedTitle = sanitizeHtml(title);
    const sanitizedContent = sanitizeHtml(content);

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .insert({
        title: sanitizedTitle,
        content: sanitizedContent,
        team_id,
        priority,
        expires_at,
        created_by: user.id
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
        profiles!announcements_created_by_fkey(
          id,
          full_name,
          title,
          role
        )
      `)
      .single();

    if (error) {
      console.error('Error creating announcement:', error);
      return createErrorResponse('Failed to create announcement', 500);
    }

    return createSuccessResponse({ announcement }, 201);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}