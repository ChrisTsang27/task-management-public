import { useState, useCallback, useMemo, useEffect } from 'react';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

// Types
interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  pinned: boolean;
  team_id?: string;
  created_by: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  attachments?: Record<string, unknown>[];
  profiles: {
    id: string;
    full_name: string;
    title?: string;
    role: string;
  };
}

interface AnnouncementFilters {
  team_id?: string;
  priority?: 'low' | 'medium' | 'high';
  pinned_only?: boolean;
  include_expired?: boolean;
  search?: string;
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset?: number;
  hasMore: boolean;
  nextCursor?: string;
  currentPage?: number;
  totalPages?: number;
}

interface AnnouncementsResponse {
  announcements: Announcement[];
  pagination: PaginationInfo;
  filters: AnnouncementFilters;
}

// Cache keys
const CACHE_KEYS = {
  announcements: 'announcements',
  announcementStats: 'announcement-stats',
} as const;

// API functions
const fetchAnnouncements = async ({
  filters = {},
  limit = 20,
  offset = 0,
  useCursor = false,
  cursor
}: {
  filters?: AnnouncementFilters;
  limit?: number;
  offset?: number;
  useCursor?: boolean;
  cursor?: string;
}): Promise<AnnouncementsResponse> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    use_cursor: useCursor.toString(),
    ...(offset !== undefined && !useCursor && { offset: offset.toString() }),
    ...(cursor && useCursor && { cursor }),
    ...Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')
    )
  });

  const response = await fetch(`/api/announcements/optimized?${params}`, {
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for authentication
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch announcements' }));
    throw new Error(error.error || 'Failed to fetch announcements');
  }

  return response.json();
};

const createAnnouncement = async (data: Omit<Announcement, 'id' | 'created_at' | 'updated_at' | 'profiles'>): Promise<{ announcement: Announcement }> => {
  const response = await fetch('/api/announcements/optimized', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': data.created_by,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create announcement');
  }

  return response.json();
};

const updateAnnouncements = async ({
  ids,
  updates,
  userId
}: {
  ids: string[];
  updates: Partial<Pick<Announcement, 'title' | 'content' | 'priority' | 'pinned' | 'expires_at'>>;
  userId: string;
}): Promise<{ updated: number; announcements: Announcement[] }> => {
  const response = await fetch('/api/announcements/optimized', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    },
    body: JSON.stringify({ ids, updates }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update announcements');
  }

  return response.json();
};

// Custom hooks
export function useOptimizedAnnouncements({
  filters = {},
  limit = 20,
  enabled = true,
  refetchInterval
}: {
  filters?: AnnouncementFilters;
  limit?: number;
  enabled?: boolean;
  refetchInterval?: number;
} = {}) {
  const [offset, setOffset] = useState(0);

  const queryKey = [CACHE_KEYS.announcements, filters, limit, offset];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchAnnouncements({ filters, limit, offset }),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval,
    refetchOnWindowFocus: false,
  });

  const nextPage = useCallback(() => {
    if (query.data?.pagination.hasMore) {
      setOffset(prev => prev + limit);
    }
  }, [query.data?.pagination.hasMore, limit]);

  const prevPage = useCallback(() => {
    setOffset(prev => Math.max(0, prev - limit));
  }, [limit]);

  const resetPagination = useCallback(() => {
    setOffset(0);
  }, []);

  return {
    ...query,
    announcements: query.data?.announcements || [],
    pagination: query.data?.pagination,
    filters: query.data?.filters,
    nextPage,
    prevPage,
    resetPagination,
    currentPage: query.data?.pagination.currentPage || 1,
    totalPages: query.data?.pagination.totalPages || 1,
  };
}

// Infinite scroll hook with cursor-based pagination
export function useInfiniteAnnouncements({
  filters = {},
  limit = 20,
  enabled = true
}: {
  filters?: AnnouncementFilters;
  limit?: number;
  enabled?: boolean;
} = {}) {
  const queryKey = [CACHE_KEYS.announcements, 'infinite', filters, limit];

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchAnnouncements({
      filters,
      limit,
      useCursor: true,
      cursor: pageParam
    }),
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore ? lastPage.pagination.nextCursor : undefined;
    },
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialPageParam: undefined as string | undefined,
  });

  const announcements = useMemo(() => {
    return query.data?.pages.flatMap(page => page.announcements) || [];
  }, [query.data]);

  return {
    ...query,
    announcements,
    totalCount: query.data?.pages[0]?.pagination.total || 0,
  };
}

// Optimized search hook with debouncing
export function useAnnouncementSearch({
  searchTerm,
  filters = {},
  debounceMs = 300,
  limit = 20
}: {
  searchTerm: string;
  filters?: Omit<AnnouncementFilters, 'search'>;
  debounceMs?: number;
  limit?: number;
}) {
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const searchFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch || undefined
  }), [filters, debouncedSearch]);

  // Always call the hook but conditionally enable it
  const shouldSearch = debouncedSearch.length >= 2;
  
  const result = useOptimizedAnnouncements({
    filters: searchFilters,
    limit,
    enabled: shouldSearch
  });

  // Return empty results when search term is too short to maintain consistent hook calls
  if (!shouldSearch) {
    return {
      ...result,
      announcements: [],
      pagination: undefined,
      filters: undefined,
      data: undefined,
      isLoading: false,
      isFetching: false
    };
  }

  return result;
}

// Mutation hooks
export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      // Invalidate and refetch announcements
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.announcements] });
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.announcementStats] });
      
      toast.success('Announcement created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create announcement');
    },
  });
}

export function useUpdateAnnouncements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAnnouncements,
    onSuccess: (data) => {
      // Invalidate and refetch announcements
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.announcements] });
      
      toast.success(`${data.updated} announcement(s) updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update announcements');
    },
  });
};

// Optimistic updates for better UX
export function useOptimisticAnnouncementUpdate() {
  const queryClient = useQueryClient();

  const updateAnnouncementOptimistically = useCallback((
    announcementId: string,
    updates: Partial<Announcement>
  ) => {
    queryClient.setQueriesData(
      { queryKey: [CACHE_KEYS.announcements] },
      (oldData: AnnouncementsResponse | undefined) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          announcements: oldData.announcements.map(announcement =>
            announcement.id === announcementId
              ? { ...announcement, ...updates }
              : announcement
          )
        };
      }
    );
  }, [queryClient]);

  return { updateAnnouncementOptimistically };
}

// Prefetch hook for better performance
export function usePrefetchAnnouncements() {
  const queryClient = useQueryClient();

  const prefetchAnnouncements = useCallback((filters: AnnouncementFilters = {}) => {
    queryClient.prefetchQuery({
      queryKey: [CACHE_KEYS.announcements, filters, 20, 0],
      queryFn: () => fetchAnnouncements({ filters, limit: 20, offset: 0 }),
      staleTime: 30 * 1000,
    });
  }, [queryClient]);

  return { prefetchAnnouncements };
}

// Stats hook for dashboard
export function useAnnouncementStats(teamId?: string) {
  return useQuery({
    queryKey: [CACHE_KEYS.announcementStats, teamId],
    queryFn: async () => {
      const filters = teamId ? { team_id: teamId } : {};
      
      // Fetch different priority counts in parallel
      const [total, high, active] = await Promise.all([
        fetchAnnouncements({ filters, limit: 1 }),
        fetchAnnouncements({ filters: { ...filters, priority: 'high' }, limit: 1 }),
        fetchAnnouncements({ filters: { ...filters, include_expired: false }, limit: 1 })
      ]);

      return {
        total: total.pagination.total,
        highPriority: high.pagination.total,
        active: active.pagination.total,
        expired: total.pagination.total - active.pagination.total
      };
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}