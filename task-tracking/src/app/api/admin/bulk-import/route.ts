import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { rateLimiters } from '@/lib/middleware/rateLimiter';
import { bulkUserImportSchema, validateAndSanitize, sanitizeHtml } from '@/lib/validation/schemas';
import { authenticateRequest, createErrorResponse, createSuccessResponse } from '@/lib/api/utils';

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

interface UserData {
  email: string;
  full_name: string;
  title?: string;
  department?: string;
  location?: string;
  role?: string;
  team_id?: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  duplicates: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting for uploads
    const rateLimitResult = rateLimiters.upload(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Authenticate user (only admins should be able to bulk import)
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.error!;
    }
    const { user, supabase } = authResult;

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return await createErrorResponse('Admin access required', 403, undefined, undefined, request, { userId: user.id });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return await createErrorResponse('No file provided', 400, undefined, undefined, request, { userId: user.id });
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      return await createErrorResponse('Invalid file format. Only CSV and Excel files are supported.', 400, undefined, undefined, request, { fileExtension, userId: user.id });
    }

    let userData: UserData[] = [];
    const fileBuffer = await file.arrayBuffer();

    try {
      if (fileExtension === 'csv') {
        const csvText = new TextDecoder().decode(fileBuffer);
        const parseResult = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.toLowerCase().trim()
        });
        userData = parseResult.data as UserData[];
      } else {
        const workbook = XLSX.read(fileBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          return await createErrorResponse('File must contain headers and at least one data row', 400, undefined, undefined, request, { userId: user.id });
        }

        const headers = (jsonData[0] as string[]).map(h => h.toLowerCase().trim());
        const rows = jsonData.slice(1) as any[][];
        
        userData = rows.map(row => {
          const user: any = {};
          headers.forEach((header, index) => {
            user[header] = row[index];
          });
          return user;
        });
      }
    } catch (parseError) {
      return await createErrorResponse('Failed to parse file', 400, undefined, parseError as Error, request, { fileExtension, userId: user.id });
    }

    // Validate and sanitize user data using schema
    const validation = validateAndSanitize(userData, bulkUserImportSchema);
    
    if (!validation.success) {
      return await createErrorResponse('Invalid user data format', 400, validation.errors, undefined, request, { userId: user.id });
    }

    const validUsers = validation.data;
    const errors: string[] = [];
    
    // Additional sanitization for text fields
    validUsers.forEach((user, index) => {
      const rowNum = index + 1;
      
      // Sanitize text fields to prevent XSS
       user.full_name = sanitizeHtml(user.full_name);
       if (user.title) user.title = sanitizeHtml(user.title);
       if (user.department) user.department = sanitizeHtml(user.department);
       if (user.location) user.location = sanitizeHtml(user.location);
     });

    if (validUsers.length === 0) {
      return await createErrorResponse('No valid users found in file', 400, errors, undefined, request, { userId: user.id });
    }

    // Check for existing users
    const emails = validUsers.map(u => u.email);
    const { data: existingUsers } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .in('email', emails);

    const existingEmails = new Set(existingUsers?.map(u => u.email) || []);
    const duplicates: string[] = [];
    const newUsers = validUsers.filter(user => {
      if (existingEmails.has(user.email)) {
        duplicates.push(user.email);
        return false;
      }
      return true;
    });

    // Create users in Supabase Auth and profiles table
    let imported = 0;
    const importErrors: string[] = [];

    for (const user of newUsers) {
      try {
        let authUserId: string;
        
        // First, try to create user in Supabase Auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: Math.random().toString(36).slice(-8), // Temporary password
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name
          }
        });

        if (authError) {
          // If user already exists in auth, try to get their ID
          if (authError.message.includes('already been registered')) {
            console.log(`User ${user.email} already exists in auth, checking for profile...`);
            
            // Get the existing auth user
            const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
            if (listError) {
              console.error(`Error listing users for ${user.email}:`, listError);
              importErrors.push(`${user.email}: Could not verify existing user`);
              continue;
            }
            
            const existingUser = existingUsers.users.find(u => u.email === user.email);
            if (!existingUser) {
              console.error(`Could not find existing user ${user.email}`);
              importErrors.push(`${user.email}: Could not find existing user`);
              continue;
            }
            
            authUserId = existingUser.id;
            
            // Check if profile already exists
            const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('id', authUserId)
              .single();
              
            if (profileCheckError && profileCheckError.code !== 'PGRST116') {
              console.error(`Error checking profile for ${user.email}:`, profileCheckError);
              importErrors.push(`${user.email}: Error checking existing profile`);
              continue;
            }
            
            if (existingProfile) {
              console.log(`Profile already exists for ${user.email}, skipping...`);
              importErrors.push(`${user.email}: User already exists with profile`);
              continue;
            }
          } else {
            console.error(`Auth user creation error for ${user.email}:`, authError);
            importErrors.push(`${user.email}: ${authError.message}`);
            continue;
          }
        } else {
          authUserId = authUser.user.id;
        }

        // Create profile (without team_id as it doesn't exist in profiles table)
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: authUserId,
            full_name: user.full_name,
            title: user.title,
            department: user.department,
            location: user.location,
            role: user.role
          });

        if (profileError) {
          console.error(`Profile creation error for ${user.email}:`, profileError);
          importErrors.push(`${user.email}: Failed to create profile - ${profileError.message}`);
          continue;
        }

        // Create team membership if team_id is provided
        if (user.team_id) {
          const { error: teamMemberError } = await supabaseAdmin
            .from('team_members')
            .insert({
              team_id: user.team_id,
              user_id: authUserId,
              role: 'member' // Default team role
            });

          if (teamMemberError) {
            console.error(`Team membership creation error for ${user.email}:`, teamMemberError);
            // Don't fail the import for team membership errors, just log it
            importErrors.push(`${user.email}: Profile created but failed to add to team - ${teamMemberError.message}`);
          }
        }

        imported++;
      } catch (error) {
        importErrors.push(`${user.email}: Unexpected error`);
      }
    }

    const result: ImportResult = {
      success: imported > 0,
      imported,
      errors: [...errors, ...importErrors],
      duplicates
    };

    return await createSuccessResponse(result, 200, request, { 
      imported, 
      duplicates: duplicates.length, 
      errors: result.errors.length,
      userId: user.id 
    });

  } catch (error) {
    return await createErrorResponse('Internal server error', 500, undefined, error as Error, request, { operation: 'bulk_import' });
  }
}