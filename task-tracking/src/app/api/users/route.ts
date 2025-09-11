import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest, createErrorResponse, createSuccessResponse } from '@/lib/api/utils';
import { rateLimiters } from '@/lib/middleware/rateLimiter';

interface Profile {
  id: string;
  full_name?: string;
  role?: string;
  title?: string;
  department?: string;
  location?: string;
}

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

    // First, get all profiles (excluding deleted users)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, title, role, department, location')
      .not('full_name', 'like', '%[DELETED USER]%')
      .order('full_name', { ascending: true });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return createErrorResponse('Failed to fetch profiles', 500);
    }

    // Then, get all auth users to get their emails
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return createErrorResponse('Failed to fetch user emails', 500);
    }

    // Create a map of user ID to email
    const emailMap = new Map();
    authUsers.users.forEach(user => {
      emailMap.set(user.id, user.email);
    });

    // Combine profiles with their actual emails
    const usersWithEmails = (profiles || []).map((profile: Profile) => {
      const email = emailMap.get(profile.id) || 'No email';
      
      return {
        id: profile.id,
        name: profile.full_name || 'Unknown User',
        email: email,
        occupation: profile.title || profile.role || 'member',
        department: profile.department || 'Not specified',
        location: profile.location || 'Not specified'
      };
    });

    return createSuccessResponse({ users: usersWithEmails });
  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}