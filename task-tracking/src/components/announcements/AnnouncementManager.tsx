"use client";

import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingCard } from "@/components/ui/LoadingSpinner";
import { ReactionsProvider } from '@/contexts/ReactionsContext';
import { useSupabaseProfile } from "@/hooks/useSupabaseProfile";
import { getAnnouncements } from "@/lib/actions/announcements";

// Lazy load heavy components
const AnnouncementForm = lazy(() => import("./AnnouncementForm"));
const AnnouncementList = lazy(() => import("./AnnouncementList"));

type View = "list" | "create" | "edit";

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  pinned?: boolean;
  created_at: string;
  expires_at: string | null;
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

interface AnnouncementStats {
  total: number;
  highPriority: number;
  active: number;
}

const AnnouncementManager = React.memo(function AnnouncementManager() {
  const { profile } = useSupabaseProfile();
  const [currentView, setCurrentView] = useState<View>("list");
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Memoize admin status to prevent unnecessary re-renders
  const isAdmin = useMemo(() => profile?.role === 'admin', [profile?.role]);

  // Memoize expiry check function
  const isExpired = useCallback((expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }, []);

  // Memoize statistics calculation
  const stats: AnnouncementStats = useMemo(() => {
    return {
      total: announcements.length,
      highPriority: announcements.filter(a => a.priority === 'high').length,
      active: announcements.filter(a => !isExpired(a.expires_at)).length
    };
  }, [announcements, isExpired]);

  const fetchAnnouncementsData = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const result = await getAnnouncements();
      setAnnouncements(result.announcements || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncementsData();
  }, [fetchAnnouncementsData, refreshTrigger]);

  const handleCreateSuccess = useCallback(() => {
    setCurrentView("list");
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleEditAnnouncement = useCallback((announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setCurrentView("edit");
  }, []);

  const handleCancel = useCallback(() => {
    setCurrentView("list");
    setEditingAnnouncement(null);
  }, []);

  const handleBackToList = useCallback(() => {
    setCurrentView("list");
  }, []);

  const handleCreateNew = useCallback(() => {
    setCurrentView("create");
  }, []);

  if (currentView === "create") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            onClick={handleBackToList}
            variant="outline"
            className="border-slate-600/70 bg-slate-800/40 text-slate-300 hover:bg-gradient-to-r hover:from-slate-700/60 hover:to-slate-600/60 hover:border-slate-500/80 hover:text-white transition-all duration-300 backdrop-blur-sm rounded-xl"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Announcements
          </Button>
        </div>
        <Suspense fallback={<LoadingCard />}>
          <AnnouncementForm onSuccess={handleCreateSuccess} onCancel={handleCancel} />
        </Suspense>
      </div>
    );
  }

  if (currentView === "edit" && editingAnnouncement) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            onClick={handleBackToList}
            variant="outline"
            className="border-slate-600/70 bg-slate-800/40 text-slate-300 hover:bg-gradient-to-r hover:from-slate-700/60 hover:to-slate-600/60 hover:border-slate-500/80 hover:text-white transition-all duration-300 backdrop-blur-sm rounded-xl"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Announcements
          </Button>
        </div>
        {/* Edit functionality can be added here if needed */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <p className="text-slate-400">Edit functionality coming soon...</p>
            <Button onClick={handleCancel} className="mt-4">
              Back to List
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Team Announcements</h2>
          <p className="text-slate-400">Stay updated with important team communications</p>
        </div>
        {isAdmin && (
          <Button
            onClick={handleCreateNew}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg shadow-lg transition-all duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Announcement
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Announcements</p>
                <p className="text-xl font-semibold text-white">
                  {isLoadingStats ? (
                    <span className="animate-pulse">-</span>
                  ) : (
                    stats.total
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-400">High Priority</p>
                <p className="text-xl font-semibold text-white">
                  {isLoadingStats ? (
                    <span className="animate-pulse">-</span>
                  ) : (
                    stats.highPriority
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-400">Active</p>
                <p className="text-xl font-semibold text-white">
                  {isLoadingStats ? (
                    <span className="animate-pulse">-</span>
                  ) : (
                    stats.active
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Announcements List */}
      <ReactionsProvider>
        <Suspense fallback={<LoadingCard />}>
          <AnnouncementList 
            onEdit={isAdmin ? handleEditAnnouncement : undefined}
            refreshTrigger={refreshTrigger}
          />
        </Suspense>
      </ReactionsProvider>
    </div>
  );
});

export default AnnouncementManager;