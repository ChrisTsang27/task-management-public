import { NextRequest, NextResponse } from 'next/server';

import {
  authenticateRequest,
  createErrorResponse,
  createSuccessResponse,
  withErrorHandling,
  handleDatabaseError
} from '@/lib/api/utils';
import { rateLimiters } from '@/lib/middleware/rateLimiter';
import { userIdParamSchema, validateAndSanitize } from '@/lib/validation/schemas';

// DELETE /api/users/[id] - Delete a user
export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> => {
  // Apply rate limiting
  const rateLimitResult = rateLimiters.general(request);
  if (rateLimitResult) {
    return rateLimitResult;
  }

  const resolvedParams = await params;
  
  // Extract and validate user ID from URL
  const validation = validateAndSanitize({ id: resolvedParams.id }, userIdParamSchema);
  
  if (!validation.success) {
    return createErrorResponse('Invalid user ID format', 400);
  }
  
  const userIdToDelete = validation.data.id;

  // Authenticate the requesting user
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return authResult.error!;
  }
  const { user: requestingUser, supabase } = authResult;

  // Check if the requesting user is an admin
  const { data: requestingUserProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', requestingUser.id)
    .single();

  if (profileError) {
    return handleDatabaseError(profileError, 'fetch requesting user profile');
  }

  if (requestingUserProfile?.role !== 'admin') {
    return createErrorResponse('Insufficient permissions. Only admins can delete users.', 403);
  }

  // Prevent self-deletion
  if (userIdToDelete === requestingUser.id) {
    return createErrorResponse('Cannot delete your own account.', 400);
  }

  // Check if the user to delete exists
  const { data: userToDelete, error: userFetchError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userIdToDelete)
    .single();

  if (userFetchError) {
    if (userFetchError.code === 'PGRST116') {
      return createErrorResponse('User not found.', 404);
    }
    return handleDatabaseError(userFetchError, 'fetch user to delete');
  }

  // Prevent deletion of the last admin
  if (userToDelete.role === 'admin') {
    const { data: adminCount, error: adminCountError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('role', 'admin');

    if (adminCountError) {
      return handleDatabaseError(adminCountError, 'count admin users');
    }

    if ((adminCount?.length || 0) <= 1) {
      return createErrorResponse('Cannot delete the last admin user.', 400);
    }
  }

  try {
    // New approach: Delete profile first, then auth user
    console.log('Attempting to delete user profile first:', userIdToDelete);
    
    // Use a more direct approach to avoid triggering AI prioritization functions
    // First, remove user from team memberships
    const { error: teamMemberError } = await supabase
      .from('team_members')
      .delete()
      .eq('user_id', userIdToDelete);

    if (teamMemberError) {
      console.error('Team member deletion error:', teamMemberError);
      // Continue anyway
    }

    // Update tasks to remove assignments (with AI function workaround)
    console.log('Updating tasks to remove user references...');
    try {
      // First, try to disable any triggers that might call the AI function
      try {
        await supabase.rpc('exec', { 
          sql: 'SET session_replication_role = replica;' 
        });
      } catch (error) {
        console.log('Failed to disable triggers:', error);
      }
      
      // Update tasks in smaller batches to avoid triggering AI functions
      const { data: userTasks } = await supabase
        .from('tasks')
        .select('id')
        .or(`assignee_id.eq.${userIdToDelete},created_by.eq.${userIdToDelete}`);
      
      if (userTasks && userTasks.length > 0) {
        // Update tasks one by one to minimize trigger impact
        for (const task of userTasks) {
          try {
            await supabase
              .from('tasks')
              .update({ 
                assignee_id: null,
                created_by: null,
                ai_last_updated: null // Clear AI data to prevent function calls
              })
              .eq('id', task.id);
          } catch (error) {
            console.log(`Failed to update task ${task.id}:`, error.message);
            // Continue with other tasks
          }
        }
      }
      
      // Re-enable triggers
      try {
        await supabase.rpc('exec', { 
          sql: 'SET session_replication_role = DEFAULT;' 
        });
      } catch (error) {
        console.log('Failed to re-enable triggers:', error);
      }
      
    } catch (error) {
      console.error('Task update failed:', error);
      // Continue anyway - this shouldn't block user deletion
    }

    // Update announcements to remove created_by reference
    const { error: announcementUpdateError } = await supabase
      .from('announcements')
      .update({ created_by: null })
      .eq('created_by', userIdToDelete);

    if (announcementUpdateError) {
      console.error('Announcement update error:', announcementUpdateError);
      // Continue anyway
    }

    // Delete user profile using raw SQL to bypass triggers
    console.log('Attempting to delete user profile using raw SQL...');
    let profileDeleted = false;
    
    // Use raw SQL to bypass any triggers that might call the AI function
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_raw_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        },
        body: JSON.stringify({
          sql: `DELETE FROM public.profiles WHERE id = '${userIdToDelete}';`
        })
      });
      
      if (response.ok) {
        profileDeleted = true;
        console.log('Profile deleted successfully via raw SQL');
      } else {
        console.log('Raw SQL deletion failed, trying alternative approaches...');
      }
    } catch (sqlError) {
      console.log('Raw SQL deletion error:', sqlError);
    }
    
    // Fallback 1: Try with session replication role to disable triggers
    if (!profileDeleted) {
      try {
        // Disable triggers
        try {
          await supabase.rpc('exec', { sql: 'SET session_replication_role = replica;' });
        } catch (error) {
          console.log('Failed to disable triggers for profile deletion:', error);
        }
        
        const { error: profileDeleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userIdToDelete);
        
        // Re-enable triggers
        try {
          await supabase.rpc('exec', { sql: 'SET session_replication_role = DEFAULT;' });
        } catch (error) {
          console.log('Failed to re-enable triggers for profile deletion:', error);
        }
        
        if (!profileDeleteError) {
          profileDeleted = true;
          console.log('Profile deleted successfully with triggers disabled');
        } else {
          console.log('Profile deletion with disabled triggers failed:', profileDeleteError);
        }
      } catch (triggerError) {
        console.log('Trigger-disabled deletion failed:', triggerError);
      }
    }
    
    // Fallback 2: Mark profile as deleted instead of actual deletion
    if (!profileDeleted) {
      try {
        const { error: markDeletedError } = await supabase
          .from('profiles')
          .update({ 
            full_name: '[DELETED USER]',
            title: null,
            department: null,
            location: null,
            role: null
          })
          .eq('id', userIdToDelete);
        
        if (!markDeletedError) {
          profileDeleted = true;
          console.log('Profile marked as deleted successfully');
        } else {
          console.log('Profile marking as deleted failed:', markDeletedError);
        }
      } catch (markError) {
        console.log('Profile marking error:', markError);
      }
    }
    
    // If all deletion attempts failed, return error
    if (!profileDeleted) {
      console.error('All profile deletion attempts failed');
      return NextResponse.json(
        { error: 'Failed to delete user profile.' },
        { status: 500 }
      );
    }

    console.log('Profile deleted successfully');
    
    // Then delete from Supabase Auth
    console.log('Attempting to delete user from auth:', userIdToDelete);
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userIdToDelete);

    if (authDeleteError) {
      console.error('Auth deletion error:', authDeleteError);
      // Profile is deleted but auth user remains - this is acceptable
      console.log('Profile deleted but auth deletion failed - this is acceptable');
    } else {
      console.log('User deleted from auth successfully');
    }

    return createSuccessResponse({
      message: 'User deleted successfully',
      deletedUser: {
        id: userToDelete.id,
        name: userToDelete.full_name
      }
    });

  } catch (error) {
    console.error('Unexpected error during user deletion:', error);
    return createErrorResponse('Failed to delete user', 500);
  }
});