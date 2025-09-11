import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { profileCreateSchema, validateAndSanitize, sanitizeHtml } from '@/lib/validation/schemas';
import { rateLimiters } from '@/lib/middleware/rateLimiter';

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
);

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = rateLimiters.auth(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

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

    const body = await request.json();
    
    // Validate and sanitize input data
    const validation = validateAndSanitize(body, profileCreateSchema);
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid profile data', 
        details: validation.errors 
      }, { status: 400 });
    }

    // Add null check for validation data
    if (!validation.data) {
      return NextResponse.json({ error: 'No valid profile data provided' }, { status: 400 });
    }

    const userData = validation.data;
    const userId = user.id; // Use authenticated user's ID

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json({ 
        message: 'Profile already exists',
        profile: existingProfile 
      });
    }

    // Create the profile using admin client with sanitized data
    const profileData = {
      id: userId,
      full_name: sanitizeHtml(userData.full_name),
      title: userData.title ? sanitizeHtml(userData.title) : null,
      role: 'member',
      department: userData.department ? sanitizeHtml(userData.department) : null,
      location: userData.location ? sanitizeHtml(userData.location) : null
    };

    const { data: newProfile, error } = await supabaseAdmin
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) {
      console.error('Profile creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create profile', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Profile created successfully',
      profile: newProfile 
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}