import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as Papa from 'papaparse';
import * as ExcelJS from 'exceljs';
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
  console.log('🚀 Bulk import API called');
  try {
    // Apply rate limiting for uploads
    const rateLimitResult = rateLimiters.upload(request);
    if (rateLimitResult) {
      console.log('❌ Rate limit exceeded');
      return rateLimitResult;
    }
    console.log('✅ Rate limit check passed');

    // Authenticate user (only admins should be able to bulk import)
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      console.log('❌ Authentication failed:', authResult.error);
      return authResult.error!;
    }
    const { user, supabase } = authResult;
    
    if (!user) {
      console.log('❌ User object is null');
      return await createErrorResponse('Authentication failed - no user', 401, undefined, undefined, request);
    }
    
    console.log('✅ User authenticated:', user.id);

    // Ensure supabase client is available
    if (!supabase) {
      console.log('❌ Supabase client unavailable');
      return await createErrorResponse('Authentication service unavailable', 500, undefined, undefined, request);
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      console.log('❌ Admin access denied. Profile:', profile);
      return await createErrorResponse('Admin access required', 403, undefined, undefined, request, { userId: user.id });
    }
    console.log('✅ Admin access confirmed');

    const formData = await request.formData();
    console.log('📄 FormData received');
    const file = formData.get('file') as File;
    
    if (!file) {
      console.log('❌ No file in formData');
      return await createErrorResponse('No file provided', 400, undefined, undefined, request, { userId: user.id });
    }
    console.log('📁 File received:', file.name, 'Size:', file.size, 'Type:', file.type);

    // Validate file type and size
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const allowedExtensions = ['csv', 'xlsx', 'xls'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
      console.log('❌ Invalid file type:', file.type, 'Extension:', fileExtension);
      return await createErrorResponse('Invalid file format. Only CSV and Excel files are supported.', 400, undefined, undefined, request, { fileExtension, userId: user.id });
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      console.log('❌ File too large:', file.size);
      return await createErrorResponse('File too large. Maximum size is 10MB.', 400, undefined, undefined, request, { fileSize: file.size, userId: user.id });
    }
    console.log('✅ File validation passed');

    let userData: UserData[] = [];
    const fileBuffer = await file.arrayBuffer();
    console.log('📊 File buffer size:', fileBuffer.byteLength);

    try {
      if (fileExtension === 'csv') {
        console.log('📄 Parsing CSV file');
        const csvText = new TextDecoder().decode(fileBuffer);
        console.log('📝 CSV text length:', csvText.length);
        const parseResult = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.toLowerCase().trim()
        });
        userData = parseResult.data as UserData[];
        console.log('✅ CSV parsed, rows:', userData.length);
      } else {
        console.log('📊 Parsing Excel file');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(fileBuffer);
        const worksheet = workbook.getWorksheet(1);
        
        if (!worksheet || worksheet.rowCount < 2) {
          console.log('❌ Excel file too short');
          return await createErrorResponse('File must contain headers and at least one data row', 400, undefined, undefined, request, { userId: user.id });
        }

        // Extract headers from first row
        const headerRow = worksheet.getRow(1);
        const headers: string[] = [];
        headerRow.eachCell((cell, colNumber) => {
          headers[colNumber - 1] = String(cell.value || '').toLowerCase().trim();
        });
        console.log('📋 Headers:', headers);
        
        // Extract data rows
        userData = [];
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
          const row = worksheet.getRow(rowNumber);
          const user: any = {};
          
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            if (header) {
              // Convert cell value to string and handle null/undefined/empty values
              let cellValue = cell.value;
              if (cellValue === null || cellValue === undefined) {
                user[header] = '';
              } else if (typeof cellValue === 'object') {
                // Handle Excel formula objects or other complex types
                user[header] = String(cellValue).trim();
              } else {
                user[header] = String(cellValue).trim();
              }
              
              // Convert empty strings to null for optional fields
              if (user[header] === '' && header !== 'email' && header !== 'full_name') {
                user[header] = null;
              }
            }
          });
          
          // Only add row if it has at least an email and is not completely empty
          const hasValidEmail = user.email && user.email.trim() && user.email.includes('@');
          const hasAnyData = Object.values(user).some(value => value && String(value).trim());
          
          if (hasValidEmail && hasAnyData) {
            userData.push(user);
          } else if (hasAnyData) {
            console.log('⚠️ Skipping row with invalid email:', user);
          }
        }
        console.log('✅ Excel parsed, rows:', userData.length);
      }
    } catch (parseError) {
      console.error('❌ File parsing error:', parseError);
      return await createErrorResponse('Failed to parse file', 400, undefined, parseError as Error, request, { fileExtension, userId: user.id });
    }

    // Validate and sanitize user data using schema
    console.log('🔍 Starting validation for', userData.length, 'users');
    console.log('📋 Sample user data:', userData[0]);
    console.log('📋 All user data:', JSON.stringify(userData, null, 2));
    const validation = validateAndSanitize(userData, bulkUserImportSchema);
    
    if (!validation.success) {
      console.log('❌ Validation failed:', validation.errors);
      console.error('❌ Raw validation errors:', JSON.stringify(validation.errors, null, 2));
      console.error('❌ User data that failed validation:', JSON.stringify(userData, null, 2));
      
      // Create more detailed error response
      const errorDetails = {
        validationErrors: validation.errors,
        userData: userData,
        userCount: userData.length
      };
      
      return await createErrorResponse('Invalid user data format', 400, errorDetails, undefined, request, { userId: user.id });
    }
    console.log('✅ Validation passed');

    const validUsers = validation.data;
    const errors: string[] = [];
    
    // Ensure validUsers is not null
    if (!validUsers) {
      return await createErrorResponse('No valid user data found', 400, undefined, undefined, request, { userId: user.id });
    }
    
    // Additional sanitization for text fields
    validUsers.forEach((user, index) => {
      const rowNum = index + 1;
      
      // Sanitize text fields to prevent XSS
      user.full_name = sanitizeHtml(user.full_name);
      
      // For enum fields, sanitize but preserve the original value if it's valid
      if (user.title) {
        const sanitizedTitle = sanitizeHtml(user.title);
        // Only update if sanitization didn't change the value (meaning it was clean)
        if (sanitizedTitle === user.title) {
          user.title = sanitizedTitle as typeof user.title;
        }
      }
      
      if (user.department) {
        const sanitizedDept = sanitizeHtml(user.department);
        if (sanitizedDept === user.department) {
          user.department = sanitizedDept as typeof user.department;
        }
      }
      
      if (user.location) {
        const sanitizedLocation = sanitizeHtml(user.location);
        if (sanitizedLocation === user.location) {
          user.location = sanitizedLocation as typeof user.location;
        }
      }
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
            
            const existingUser = existingUsers?.users?.find((u: any) => u.email === user.email);
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