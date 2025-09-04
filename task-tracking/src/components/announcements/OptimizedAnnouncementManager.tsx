'use client';

import React, { useState, useCallback, useMemo, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Filter, 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle, 
  Clock,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { useSupabaseProfile } from '@/hooks/useSupabaseProfile';
import { 
  useOptimizedAnnouncements,
  useInfiniteAnnouncements,
  useAnnouncementSearch,
  useAnnouncementStats,
  usePrefetchAnnouncements
} from '@/hooks/useOptimizedAnnouncements';
import AnnouncementList from './AnnouncementList';
import AnnouncementForm from './AnnouncementForm';

// Types
interface AnnouncementFilters {
  team_id?: string;
  priority?: 'low' | 'medium' | 'high';
  pinned_only?: boolean;
  include_expired?: boolean;
  search?: string;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: number;
  loading?: boolean;
}

// Memoized components for better performance
const StatCard = React.memo<StatCardProps>(({ title, value, icon, trend, loading }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          </CardTitle>
          <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-16 mb-1 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {trend !== undefined && (
          <p className="text-xs text-muted-foreground">
            {trend > 0 ? '+' : ''}{trend}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

// Memoized filter component
const FilterPanel = React.memo<{
  filters: AnnouncementFilters;
  onFiltersChange: (filters: AnnouncementFilters) => void;
  teams?: Array<{ id: string; name: string }>;
}>(({ filters, onFiltersChange, teams = [] }) => {
  const handleFilterChange = useCallback((key: keyof AnnouncementFilters, value: string | boolean | string[]) => {
    onFiltersChange({ ...filters, [key]: value });
  }, [filters, onFiltersChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team Filter */}
        {teams.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Team</label>
            <Select
              value={filters.team_id || 'all'}
              onValueChange={(value) => handleFilterChange('team_id', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Priority Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Priority</label>
          <Select
            value={filters.priority || 'all'}
            onValueChange={(value) => handleFilterChange('priority', value === 'all' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggle Filters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="pinned-only" className="text-sm font-medium">Pinned only</label>
            <input
              type="checkbox"
              id="pinned-only"
              checked={filters.pinned_only || false}
              onChange={(e) => handleFilterChange('pinned_only', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor="include-expired" className="text-sm font-medium">Include expired</label>
            <input
              type="checkbox"
              id="include-expired"
              checked={filters.include_expired !== false}
              onChange={(e) => handleFilterChange('include_expired', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

FilterPanel.displayName = 'FilterPanel';

// Main component
export const OptimizedAnnouncementManager: React.FC = () => {
  const { profile, loading: profileLoading } = useSupabaseProfile();
  const { prefetchAnnouncements } = usePrefetchAnnouncements();
  
  // State
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<object | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<AnnouncementFilters>({
    include_expired: true
  });
  const [viewMode, setViewMode] = useState<'paginated' | 'infinite'>('paginated');

  // Memoized filter object to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => filters, [filters]);

  // Data fetching hooks
  const stats = useAnnouncementStats(filters.team_id);
  
  const paginatedQuery = useOptimizedAnnouncements({
    filters: memoizedFilters,
    limit: 20,
    enabled: viewMode === 'paginated',
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const infiniteQuery = useInfiniteAnnouncements({
    filters: memoizedFilters,
    limit: 20,
    enabled: viewMode === 'infinite'
  });

  const searchQuery = useAnnouncementSearch({
    searchTerm,
    filters: memoizedFilters,
    limit: 20
  });

  // Determine which query to use
  const activeQuery = searchTerm.length >= 2 ? searchQuery : 
                     viewMode === 'infinite' ? infiniteQuery : paginatedQuery;

  // Memoized handlers
  const handleCreateNew = useCallback(() => {
    setView('create');
    setSelectedAnnouncement(null);
  }, []);

  const handleEdit = useCallback((announcement: object) => {
    setSelectedAnnouncement(announcement);
    setView('edit');
  }, []);

  const handleBackToList = useCallback(() => {
    setView('list');
    setSelectedAnnouncement(null);
  }, []);

  const handleFiltersChange = useCallback((newFilters: AnnouncementFilters) => {
    setFilters(newFilters);
    // Prefetch data for new filters
    prefetchAnnouncements(newFilters);
  }, [prefetchAnnouncements]);

  const handleRefresh = useCallback(() => {
    activeQuery.refetch();
    stats.refetch();
    toast.success('Data refreshed');
  }, [activeQuery, stats]);

  // Memoized stats data
  const statsData = useMemo(() => [
    {
      title: 'Total Announcements',
      value: stats.data?.total || 0,
      icon: <BarChart3 className="h-4 w-4 text-muted-foreground" />,
      loading: stats.isLoading
    },
    {
      title: 'High Priority',
      value: stats.data?.highPriority || 0,
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
      loading: stats.isLoading
    },
    {
      title: 'Active',
      value: stats.data?.active || 0,
      icon: <TrendingUp className="h-4 w-4 text-green-500" />,
      loading: stats.isLoading
    },
    {
      title: 'Expired',
      value: stats.data?.expired || 0,
      icon: <Clock className="h-4 w-4 text-orange-500" />,
      loading: stats.isLoading
    }
  ], [stats.data, stats.isLoading]);

  // Loading state
  if (profileLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  // Render different views
  if (view === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Create Announcement</h1>
          <Button variant="outline" onClick={handleBackToList}>
            Back to List
          </Button>
        </div>
        <Suspense fallback={<div className="h-96 bg-gray-200 rounded animate-pulse" />}>
          <AnnouncementForm
            onSuccess={handleBackToList}
            onCancel={handleBackToList}
          />
        </Suspense>
      </div>
    );
  }

  if (view === 'edit' && selectedAnnouncement) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Edit Announcement</h1>
          <Button variant="outline" onClick={handleBackToList}>
            Back to List
          </Button>
        </div>
        <Suspense fallback={<div className="h-96 bg-gray-200 rounded animate-pulse" />}>
          <AnnouncementForm
            onSuccess={handleBackToList}
            onCancel={handleBackToList}
          />
        </Suspense>
      </div>
    );
  }

  // Main list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Announcements</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={activeQuery.isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${activeQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {isAdmin && (
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <FilterPanel
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </div>

        {/* Announcements List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search and View Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search announcements..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setViewMode('paginated')}
                    className={`px-4 py-2 text-sm font-medium ${
                      viewMode === 'paginated'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Paginated
                  </button>
                  <button
                    onClick={() => setViewMode('infinite')}
                    className={`px-4 py-2 text-sm font-medium ${
                      viewMode === 'infinite'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Infinite Scroll
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Suspense fallback={<div className="h-96 bg-gray-200 rounded animate-pulse" />}>
            <AnnouncementList
              onEdit={handleEdit}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default OptimizedAnnouncementManager;