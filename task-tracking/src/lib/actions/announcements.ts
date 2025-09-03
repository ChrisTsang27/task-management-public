'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

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

// Validation schemas
const CreateAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  team_id: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  pinned: z.boolean().default(false),
  expires_at: z.string().datetime().optional().nullable(),
  created_by: z.string().uuid(),
  attachments: z.array(z.object({
    url: z.string().url(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
    path: z.string()
  })).optional().default([])
});

const UpdateAnnouncementSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  team_id: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  pinned: z.boolean().optional(),
  expires_at: z.string().datetime().optional().nullable()
});

const CreateCommentSchema = z.object({
  announcement_id: z.string().uuid(),
  content: z.string().min(1, 'Comment content is required').max(1000, 'Comment too long'),
  user_id: z.string().uuid()
});

const CreateReactionSchema = z.object({
  announcement_id: z.string().uuid(),
  emoji: z.string().min(1, 'Emoji is required').max(10, 'Emoji too long'),
  user_id: z.string().uuid()
});

// Types
export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  pinned: boolean;
  team_id: string | null;
  created_by: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  attachments?: Array<{
    url: string;
    name: string;
    size: number;
    type: string;
    path: string;
  }>;
  profiles?: {
    id: string;
    full_name: string | null;
    title: string | null;
    role: string;
  } | {
    id: string;
    full_name: string | null;
    title: string | null;
    role: string;
  }[];
}

export interface AnnouncementComment {
  id: string;
  body: string;
  user_id: string;
  announcement_id: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    title: string | null;
    role: string;
  } | {
    id: string;
    full_name: string | null;
    title: string | null;
    role: string;
  }[];
}

export interface AnnouncementReaction {
  id: string;
  emoji: string;
  user_id: string;
  announcement_id: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    title: string | null;
  };
}

// Server Actions

/**
 * Fetch all announcements with optional filtering
 */
export async function getAnnouncements({
  teamId,
  limit = 50,
  offset = 0
}: {
  teamId?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ announcements: Announcement[]; error?: string }> {
  try {
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

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data: announcements, error } = await query;

    if (error) {
      console.error('Error fetching announcements:', error);
      return { announcements: [], error: 'Failed to fetch announcements' };
    }

    return { announcements: announcements || [] };
  } catch (error) {
    console.error('Server action error:', error);
    return { announcements: [], error: 'Internal server error' };
  }
}

/**
 * Create a new announcement
 */
export async function createAnnouncement(
  data: z.infer<typeof CreateAnnouncementSchema>
): Promise<{ announcement?: Announcement; error?: string }> {
  try {
    const parsed = CreateAnnouncementSchema.safeParse(data);
    
    if (!parsed.success) {
      console.error('Validation errors:', parsed.error.issues);
      return { error: `Invalid data provided: ${parsed.error.issues.map(i => i.message).join(', ')}` };
    }

    const { title, content, team_id, priority, expires_at, created_by, attachments } = parsed.data;

    // Sanitize HTML content for security
    const sanitizedContent = sanitizeHtml(content, {
      allowedTags: [
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'table', 'thead', 'tbody',
        'tr', 'th', 'td', 'hr', 'mark', 'code', 'pre'
      ],
      allowedAttributes: {
        'a': ['href', 'target', 'rel'],
        'img': ['src', 'alt', 'width', 'height'],
        'table': ['style'],
        'th': ['style', 'colspan', 'rowspan'],
        'td': ['style', 'colspan', 'rowspan'],
        'p': ['style'],
        'h1': ['style'],
        'h2': ['style'],
        'h3': ['style'],
        'h4': ['style'],
        'h5': ['style'],
        'h6': ['style']
      },

      transformTags: {
        'a': function(tagName, attribs) {
          return {
            tagName: 'a',
            attribs: {
              ...attribs,
              rel: 'noopener noreferrer',
              target: '_blank'
            }
          };
        }
      }
    });

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .insert({
        title,
        content: sanitizedContent,
        team_id,
        priority,
        expires_at,
        created_by,
        attachments
      })
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
      .single();

    if (error) {
      console.error('Error creating announcement:', error);
      return { error: 'Failed to create announcement' };
    }

    // Revalidate the announcements page
    revalidatePath('/dashboard');
    revalidatePath('/announcements');

    return { announcement };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'Internal server error' };
  }
}

/**
 * Update an existing announcement
 */
export async function updateAnnouncement(
  data: z.infer<typeof UpdateAnnouncementSchema>
): Promise<{ announcement?: Announcement; error?: string }> {
  try {
    const parsed = UpdateAnnouncementSchema.safeParse(data);
    
    if (!parsed.success) {
      return { error: 'Invalid data provided' };
    }

    const { id, ...updateData } = parsed.data;

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
      .single();

    if (error) {
      console.error('Error updating announcement:', error);
      return { error: 'Failed to update announcement' };
    }

    // Revalidate the announcements page
    revalidatePath('/dashboard');
    revalidatePath('/announcements');

    return { announcement };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'Internal server error' };
  }
}

/**
 * Delete an announcement
 */
export async function deleteAnnouncement(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!id) {
      return { error: 'Announcement ID is required' };
    }

    const { error } = await supabaseAdmin
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting announcement:', error);
      return { error: 'Failed to delete announcement' };
    }

    // Revalidate the announcements page
    revalidatePath('/dashboard');
    revalidatePath('/announcements');

    return { success: true };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'Internal server error' };
  }
}

/**
 * Toggle pin status of an announcement
 */
export async function toggleAnnouncementPin(
  id: string
): Promise<{ announcement?: Announcement; error?: string }> {
  try {
    if (!id) {
      return { error: 'Announcement ID is required' };
    }

    // First get the current pinned status
    const { data: currentAnnouncement, error: fetchError } = await supabaseAdmin
      .from('announcements')
      .select('pinned')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching announcement:', fetchError);
      return { error: 'Failed to fetch announcement' };
    }

    // Toggle the pinned status
    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .update({ 
        pinned: !currentAnnouncement.pinned,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
        profiles!announcements_created_by_fkey(
          id,
          full_name,
          title,
          role
        )
      `)
      .single();

    if (error) {
      console.error('Error toggling pin status:', error);
      return { error: 'Failed to toggle pin status' };
    }

    // Revalidate the announcements page
    revalidatePath('/dashboard');
    revalidatePath('/announcements');

    return { announcement };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'Internal server error' };
  }
}

/**
 * Add a comment to an announcement
 */
export async function addComment(
  data: z.infer<typeof CreateCommentSchema>
): Promise<{ comment?: AnnouncementComment; error?: string }> {
  try {
    const parsed = CreateCommentSchema.safeParse(data);
    
    if (!parsed.success) {
      return { error: 'Invalid data provided' };
    }

    const { announcement_id, content, user_id } = parsed.data;

    const { data: comment, error } = await supabaseAdmin
      .from('announcement_comments')
      .insert({
        body: content,
        user_id,
        announcement_id
      })
      .select(`
        id,
        body,
        user_id,
        announcement_id,
        created_at,
        profiles!announcement_comments_user_id_fkey(
          id,
          full_name,
          title,
          role
        )
      `)
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return { error: 'Failed to create comment' };
    }

    // Revalidate the announcements page
    revalidatePath('/dashboard');
    revalidatePath('/announcements');

    return { comment };
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'Internal server error' };
  }
}

/**
 * Toggle a reaction on an announcement
 */
export async function toggleReaction(
  data: z.infer<typeof CreateReactionSchema>
): Promise<{ action?: 'added' | 'removed'; error?: string }> {
  try {
    const parsed = CreateReactionSchema.safeParse(data);
    
    if (!parsed.success) {
      return { error: 'Invalid data provided' };
    }

    const { announcement_id, emoji, user_id } = parsed.data;

    // Check if user already reacted with this emoji
    const { data: existingReaction, error: checkError } = await supabaseAdmin
      .from('announcement_reactions')
      .select('id')
      .eq('announcement_id', announcement_id)
      .eq('user_id', user_id)
      .eq('emoji', emoji)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing reaction:', checkError);
      return { error: 'Failed to check existing reaction' };
    }

    if (existingReaction) {
      // Remove existing reaction
      const { error: deleteError } = await supabaseAdmin
        .from('announcement_reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (deleteError) {
        console.error('Error removing reaction:', deleteError);
        return { error: 'Failed to remove reaction' };
      }

      // Revalidate the announcements page
      revalidatePath('/dashboard');
      revalidatePath('/announcements');

      return { action: 'removed' };
    } else {
      // Add new reaction
      const { error } = await supabaseAdmin
        .from('announcement_reactions')
        .insert({
          emoji,
          user_id,
          announcement_id
        });

      if (error) {
        console.error('Error creating reaction:', error);
        return { error: 'Failed to create reaction' };
      }

      // Revalidate the announcements page
      revalidatePath('/dashboard');
      revalidatePath('/announcements');

      return { action: 'added' };
    }
  } catch (error) {
    console.error('Server action error:', error);
    return { error: 'Internal server error' };
  }
}