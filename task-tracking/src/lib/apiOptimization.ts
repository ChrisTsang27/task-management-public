// API Optimization Utilities
// This file contains optimized API functions with caching and performance improvements

import { QueryClient } from '@tanstack/react-query';

// ===== QUERY CLIENT CONFIGURATION =====
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: unknown) => {
        // Don't retry on 4xx errors
        const errorWithStatus = error as { status?: number };
        if (errorWithStatus?.status && errorWithStatus.status >= 400 && errorWithStatus.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// ===== CACHE KEYS =====
export const CACHE_KEYS = {
  announcements: (teamId?: string, limit?: number, offset?: number) => 
    ['announcements', { teamId, limit, offset }],
  announcementStats: (teamId?: string) => ['announcement-stats', { teamId }],
  comments: (announcementId: string, limit?: number, offset?: number) => 
    ['comments', announcementId, { limit, offset }],
  reactions: (announcementId: string) => ['reactions', announcementId],
  users: () => ['users'],
  userProfile: (userId: string) => ['user-profile', userId],
  userStats: () => ['user-stats'],
} as const;

// ===== OPTIMIZED API FUNCTIONS =====

// Optimized announcements fetcher with cursor-based pagination option
export async function fetchAnnouncements({
  teamId,
  limit = 20,
  offset = 0,
  cursor,
  useCursor = false
}: {
  teamId?: string;
  limit?: number;
  offset?: number;
  cursor?: string;
  useCursor?: boolean;
}) {
  const params = new URLSearchParams();
  
  if (teamId) params.set('team_id', teamId);
  params.set('limit', limit.toString());
  
  if (useCursor && cursor) {
    params.set('cursor', cursor);
  } else {
    params.set('offset', offset.toString());
  }
  
  const response = await fetch(`/api/announcements?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch announcements: ${response.statusText}`);
  }
  
  return response.json();
}

// Optimized comments fetcher with pagination
export async function fetchComments({
  announcementId,
  limit = 50,
  offset = 0
}: {
  announcementId: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString()
  });
  
  const response = await fetch(`/api/announcements/${announcementId}/comments?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch comments: ${response.statusText}`);
  }
  
  return response.json();
}

// Optimized reactions fetcher
export async function fetchReactions(announcementId: string) {
  const response = await fetch(`/api/announcements/${announcementId}/reactions`);
  if (!response.ok) {
    throw new Error(`Failed to fetch reactions: ${response.statusText}`);
  }
  
  return response.json();
}

// Batch user fetcher with filtering
export async function fetchUsers({
  department,
  location,
  role,
  search,
  token
}: {
  department?: string;
  location?: string;
  role?: string;
  search?: string;
  token?: string;
} = {}) {
  const params = new URLSearchParams();
  
  if (department) params.set('department', department);
  if (location) params.set('location', location);
  if (role) params.set('role', role);
  if (search) params.set('search', search);
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`/api/users?${params}`, {
    headers
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`);
  }
  
  return response.json();
}

// ===== MUTATION OPTIMIZATIONS =====

// Optimistic update helper for announcements
export function updateAnnouncementCache(
  queryClient: QueryClient,
  announcementId: string,
  updates: Partial<Record<string, unknown>>
) {
  queryClient.setQueriesData(
    { queryKey: ['announcements'] },
    (oldData: unknown) => {
      const typedOldData = oldData as { announcements?: Record<string, unknown>[] };
      if (!typedOldData?.announcements) return oldData;
      
      return {
        ...typedOldData,
        announcements: typedOldData.announcements.map((announcement: Record<string, unknown>) =>
          announcement.id === announcementId
            ? { ...announcement, ...updates }
            : announcement
        )
      };
    }
  );
}

// Optimistic update helper for comments
export function addCommentToCache(
  queryClient: QueryClient,
  announcementId: string,
  newComment: Record<string, unknown>
) {
  queryClient.setQueryData(
    CACHE_KEYS.comments(announcementId),
    (oldData: unknown) => {
      const typedOldData = oldData as { comments?: Record<string, unknown>[] };
      if (!typedOldData?.comments) return { comments: [newComment] };
      
      return {
        ...typedOldData,
        comments: [...typedOldData.comments, newComment]
      };
    }
  );
}

// Optimistic update helper for reactions
export function updateReactionCache(
  queryClient: QueryClient,
  announcementId: string,
  emoji: string,
  userId: string,
  action: 'added' | 'removed'
) {
  queryClient.setQueryData(
    CACHE_KEYS.reactions(announcementId),
    (oldData: unknown) => {
      const typedOldData = oldData as { reactions?: Record<string, unknown>[] };
      if (!typedOldData?.reactions) return oldData;
      
      let updatedReactions = [...typedOldData.reactions];
      
      if (action === 'added') {
        updatedReactions.push({
          emoji,
          user_id: userId,
          announcement_id: announcementId,
          created_at: new Date().toISOString()
        });
      } else {
        updatedReactions = updatedReactions.filter(
          (reaction: Record<string, unknown>) => 
            !(reaction.emoji === emoji && reaction.user_id === userId)
        );
      }
      
      return {
        ...typedOldData,
        reactions: updatedReactions
      };
    }
  );
}

// ===== DEBOUNCED SEARCH =====
// Debounced search function removed - not being used

// ===== PREFETCHING UTILITIES =====

// Prefetch related data when viewing an announcement
export async function prefetchAnnouncementData(
  queryClient: QueryClient,
  announcementId: string
) {
  // Prefetch comments and reactions in parallel
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: CACHE_KEYS.comments(announcementId),
      queryFn: () => fetchComments({ announcementId }),
      staleTime: 2 * 60 * 1000, // 2 minutes
    }),
    queryClient.prefetchQuery({
      queryKey: CACHE_KEYS.reactions(announcementId),
      queryFn: () => fetchReactions(announcementId),
      staleTime: 1 * 60 * 1000, // 1 minute
    })
  ]);
}

// ===== BACKGROUND SYNC =====

// Background sync function removed - not being used

// ===== ERROR HANDLING =====

export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleAPIError(error: unknown): APIError {
  if (error instanceof APIError) {
    return error;
  }
  
  const errorWithResponse = error as { response?: { data?: { message?: string; code?: string }; status?: number } };
  if (errorWithResponse?.response) {
    return new APIError(
      errorWithResponse.response.data?.message || 'API request failed',
      errorWithResponse.response.status || 500,
      errorWithResponse.response.data?.code
    );
  }
  
  const errorWithMessage = error as { message?: string };
  return new APIError(
    errorWithMessage?.message || 'Unknown error occurred',
    undefined,
    'UNKNOWN_ERROR'
  );
}

// ===== PERFORMANCE MONITORING =====

// API performance measurement function removed - not being used

// ===== EXPORT OPTIMIZED HOOKS =====

export { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';