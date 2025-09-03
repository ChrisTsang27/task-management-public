"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getAnnouncements, deleteAnnouncement, toggleAnnouncementPin } from "@/lib/actions/announcements";
import { useSupabaseProfile } from "@/hooks/useSupabaseProfile";
import { Trash2, Edit, Calendar, User, Clock, AlertCircle, MessageCircle, Paperclip, Download, FileText, Image, Eye, X, Maximize2, Pin, PinOff } from 'lucide-react';
import AnnouncementComments from './AnnouncementComments';
import AnnouncementReactions from './AnnouncementReactions';

interface Attachment {
  url: string;
  name: string;
  size: number;
  type: string;
  path: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  pinned?: boolean;
  created_at: string;
  expires_at: string | null;
  attachments?: Attachment[];
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

interface AnnouncementListProps {
  onEdit?: (announcement: Announcement) => void;
  refreshTrigger?: number;
}

export default function AnnouncementList({ onEdit, refreshTrigger }: AnnouncementListProps) {
  const { profile } = useSupabaseProfile();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCommentsFor, setShowCommentsFor] = useState<string | null>(null);
  const [previewAnnouncement, setPreviewAnnouncement] = useState<Announcement | null>(null);
  const [displayCount, setDisplayCount] = useState(5); // Show 5 announcements initially
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getAnnouncements();
      if (result.announcements && !result.error) {
        // Parse attachments JSON string to array for each announcement
        const processedAnnouncements = result.announcements.map(announcement => ({
          ...announcement,
          attachments: typeof announcement.attachments === 'string' 
            ? JSON.parse(announcement.attachments || '[]')
            : announcement.attachments || []
        }));
        setAnnouncements(processedAnnouncements);
        // Reset display count when fetching new announcements
        setDisplayCount(5);
      } else {
        console.error("Failed to fetch announcements:", result.error);
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements, refreshTrigger]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    setDeletingId(id);
    try {
      const result = await deleteAnnouncement(id);
      if (result.success) {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
      } else {
        console.error("Failed to delete announcement:", result.error);
        alert("Failed to delete announcement. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting announcement:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleTogglePin = useCallback(async (id: string) => {
    try {
      const result = await toggleAnnouncementPin(id);
      if (result.announcement) {
        setAnnouncements(prev => 
          prev.map(a => 
            a.id === id ? { ...a, pinned: result.announcement!.pinned } : a
          )
        );
      } else {
        console.error("Failed to toggle pin:", result.error);
        alert("Failed to toggle pin. Please try again.");
      }
    } catch (error) {
      console.error("Error toggling pin:", error);
      alert("An error occurred. Please try again.");
    }
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case "high": return "bg-gradient-to-r from-red-500/30 to-red-600/30 text-red-300 border-red-400/50 shadow-lg shadow-red-500/20";
      case "medium": return "bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300 border-amber-400/50 shadow-lg shadow-amber-500/20";
      case "low": return "bg-gradient-to-r from-emerald-500/30 to-green-500/30 text-emerald-300 border-emerald-400/50 shadow-lg shadow-emerald-500/20";
      default: return "bg-gradient-to-r from-slate-500/30 to-slate-600/30 text-slate-300 border-slate-400/50 shadow-lg shadow-slate-500/20";
    }
  }, []);

  const getPriorityIcon = useCallback((priority: string) => {
    switch (priority) {
      case "high": return "🔴";
      case "medium": return "🟡";
      case "low": return "🟢";
      default: return "⚪";
    }
  }, []);

  const formatContent = useCallback((content: string) => {
    // Content is already sanitized HTML from TipTap editor
    // Just return it as-is since server-side sanitization is applied
    return content;
  }, []);

  const getFileIcon = useCallback((fileType: string) => {
    if (fileType.startsWith('image/')) {
      // eslint-disable-next-line jsx-a11y/alt-text
      return <Image className="h-4 w-4" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    } else {
      return <Paperclip className="h-4 w-4" />;
    }
  }, []);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }, []);

  const isExpired = useCallback((expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }, []);

  // Memoize sorted announcements for better performance
  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => {
      // Sort by pinned first, then by creation date (newest first)
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [announcements]);

  // Get displayed announcements based on current display count
  const displayedAnnouncements = useMemo(() => {
    return sortedAnnouncements.slice(0, displayCount);
  }, [sortedAnnouncements, displayCount]);

  // Check if there are more announcements to load
  const hasMoreAnnouncements = useMemo(() => {
    return sortedAnnouncements.length > displayCount;
  }, [sortedAnnouncements.length, displayCount]);

  // Load more announcements function
  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true);
    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));
    setDisplayCount(prev => prev + 5);
    setIsLoadingMore(false);
  }, []);

  // Memoize admin status
  const isAdmin = useMemo(() => profile?.role === 'admin', [profile?.role]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
           <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500/30 border-t-blue-500"></div>
            <p className="text-slate-400 text-sm">Loading announcements...</p>
          </div>
        </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-8 max-w-md mx-auto">
          <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-300 mb-2">No announcements yet</h3>
          <p className="text-slate-400 text-sm">Check back later for important updates and announcements.</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-12">
      {displayedAnnouncements.map((announcement, index) => {
        const expired = isExpired(announcement.expires_at);
        const isEven = index % 2 === 0;
        const isLast = index === displayedAnnouncements.length - 1;
        return (
          <React.Fragment key={announcement.id}>
          <Card className={`group relative overflow-visible transition-all duration-500 cursor-pointer ${
             announcement.pinned 
               ? 'border-blue-400/70 bg-gradient-to-br from-blue-900/40 via-slate-800/90 to-slate-900/95 border-2' 
               : expired 
                 ? 'border-red-400/60 bg-gradient-to-br from-red-900/30 via-slate-800/90 to-slate-900/95 border-2'
                 : isEven 
                    ? 'border-cyan-400/70 hover:border-cyan-300/90 bg-gradient-to-br from-slate-800/95 via-slate-700/90 to-slate-900/95 border-2'
                    : 'border-purple-400/70 hover:border-purple-300/90 bg-gradient-to-br from-purple-900/25 via-slate-800/85 to-slate-900/95 border-2'
           } ${expired ? 'opacity-70 grayscale-[0.3]' : ''}`}
            onClick={() => setPreviewAnnouncement(announcement)}>
            {announcement.pinned && (
               <div className="absolute top-6 left-6 z-10">
                 <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500/40 to-blue-600/40 border border-blue-300/70 text-blue-200 px-4 py-2 rounded-full text-xs font-bold backdrop-blur-md">
                   <Pin className="h-4 w-4 fill-current" />
                   <span className="tracking-wide">PINNED</span>
                 </div>
               </div>
             )}
            
            {/* Enhanced Priority indicator stripe */}
            <div className="absolute top-0 left-0 w-full h-2 overflow-hidden rounded-t-lg">
              <div className={`w-full h-full bg-gradient-to-r relative ${
                announcement.priority === 'high' ? 'from-red-400 via-red-500 to-red-600' :
                announcement.priority === 'medium' ? 'from-amber-400 via-orange-500 to-orange-600' :
                'from-emerald-400 via-green-500 to-green-600'
              }`}>
                {/* Animated shimmer effect */}
                <div className={`absolute inset-0 bg-gradient-to-r opacity-60 animate-pulse ${
                  announcement.priority === 'high' ? 'from-transparent via-red-300/40 to-transparent' :
                  announcement.priority === 'medium' ? 'from-transparent via-amber-300/40 to-transparent' :
                  'from-transparent via-emerald-300/40 to-transparent'
                }`} />
                {/* Subtle glow effect */}
                <div className={`absolute inset-0 shadow-inner ${
                  announcement.priority === 'high' ? 'shadow-red-900/50' :
                  announcement.priority === 'medium' ? 'shadow-orange-900/50' :
                  'shadow-green-900/50'
                }`} />
              </div>
            </div>
            {/* Priority badges positioned absolutely relative to card */}
            <div className="flex items-center gap-3 flex-shrink-0 absolute top-6 right-6 z-10">
              <Badge className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${getPriorityColor(announcement.priority)} backdrop-blur-sm`}>
                <span className="mr-1.5">{getPriorityIcon(announcement.priority)}</span>
                {announcement.priority.toUpperCase()}
              </Badge>
              {expired && (
                <Badge className="bg-gradient-to-r from-red-500/30 to-red-600/30 text-red-300 border-red-400/50 text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg shadow-red-500/20 backdrop-blur-sm">

                  EXPIRED
                </Badge>
              )}
            </div>
            
            {/* Action buttons positioned absolutely under priority tags */}
            <div className="absolute top-20 right-6 z-10 flex items-center gap-2">
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button
                     onClick={(e) => {
                       e.stopPropagation();
                       setPreviewAnnouncement(announcement);
                     }}
                     variant="outline"
                     size="sm"
                     className="border-slate-600/60 bg-slate-700/30 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500/80 hover:text-white transition-all duration-200 backdrop-blur-sm"
                   >
                     <Eye className="h-4 w-4" />
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>Preview announcement</p>
                 </TooltipContent>
               </Tooltip>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button
                     onClick={(e) => {
                       e.stopPropagation();
                       setShowCommentsFor(showCommentsFor === announcement.id ? null : announcement.id);
                     }}
                     variant="outline"
                     size="sm"
                     className="border-slate-600/60 bg-slate-700/30 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500/80 hover:text-white transition-all duration-200 backdrop-blur-sm"
                   >
                     <MessageCircle className="h-4 w-4" />
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>{showCommentsFor === announcement.id ? 'Hide comments' : 'Show comments'}</p>
                 </TooltipContent>
               </Tooltip>
               {isAdmin && (
                   <>
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <Button
                           onClick={(e) => {
                             e.stopPropagation();
                             handleTogglePin(announcement.id);
                           }}
                           variant="outline"
                           size="sm"
                           className={`border-slate-600/60 bg-slate-700/30 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500/80 hover:text-white transition-all duration-200 backdrop-blur-sm ${
                             announcement.pinned ? 'bg-blue-500/30 border-blue-400/60 text-blue-300 hover:bg-blue-500/40' : ''
                           }`}
                         >
                           {announcement.pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                         </Button>
                       </TooltipTrigger>
                       <TooltipContent>
                         <p>{announcement.pinned ? 'Unpin announcement' : 'Pin announcement'}</p>
                       </TooltipContent>
                     </Tooltip>
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <Button
                           onClick={(e) => {
                             e.stopPropagation();
                             onEdit?.(announcement);
                           }}
                           variant="outline"
                           size="sm"
                           className="border-slate-600/60 bg-slate-700/30 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500/80 hover:text-white transition-all duration-200 backdrop-blur-sm"
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                       </TooltipTrigger>
                       <TooltipContent>
                         <p>Edit announcement</p>
                       </TooltipContent>
                     </Tooltip>
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <Button
                           onClick={(e) => {
                             e.stopPropagation();
                             handleDelete(announcement.id);
                           }}
                           variant="outline"
                           size="sm"
                           disabled={deletingId === announcement.id}
                           className="border-red-500/60 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-400/80 hover:text-red-300 transition-all duration-200 backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-50"
                         >
                           {deletingId === announcement.id ? (
                             <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                           ) : (
                             <Trash2 className="h-4 w-4" />
                           )}
                         </Button>
                       </TooltipTrigger>
                       <TooltipContent>
                         <p>Delete announcement</p>
                       </TooltipContent>
                     </Tooltip>
                   </>
                 )}
             </div>
            
            <CardHeader className={`pb-6 ${announcement.pinned ? 'pt-20' : 'pt-6'}`}>
              <div className="relative">
                <div className="flex-1">
                  <div className="mb-4">
                    <CardTitle className="text-white text-xl font-bold flex items-center gap-4 tracking-tight leading-tight group">
                      {/* Enhanced announcement icon with hover effects */}
                      <div className="relative flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500/40 via-indigo-500/30 to-purple-500/20 rounded-xl border border-blue-400/50 shadow-xl shadow-blue-500/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-blue-500/30 group-hover:border-blue-300/70">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <span className="text-xl relative z-10 filter drop-shadow-sm">📢</span>
                        {/* Subtle pulse animation */}
                        <div className="absolute inset-0 bg-blue-400/20 rounded-xl animate-ping opacity-20" />
                      </div>
                      
                      {/* Enhanced title with better typography */}
                      <div className="flex-1 min-w-0">
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-indigo-100 font-extrabold text-xl leading-tight tracking-wide drop-shadow-sm hover:from-blue-100 hover:via-white hover:to-blue-100 transition-all duration-300">
                          {announcement.title}
                        </span>
                      </div>
                      
                      {/* Enhanced expired indicator */}
                      {expired && (
                        <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-br from-red-500/40 to-red-600/30 rounded-xl border border-red-400/50 shadow-lg shadow-red-500/20 animate-pulse">
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-xl" />
                          <AlertCircle className="h-5 w-5 text-red-300 relative z-10 filter drop-shadow-sm" />
                        </div>
                      )}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-300 flex-wrap">
                     <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 px-4 py-2.5 rounded-xl border border-blue-500/30 backdrop-blur-sm shadow-lg">
                       <div className="flex items-center justify-center w-8 h-8 bg-blue-500/30 rounded-full border border-blue-400/40">
                         <User className="h-4 w-4 text-blue-300" />
                       </div>
                       <div className="flex flex-col">
                         <span className="font-bold text-blue-100 text-sm">{Array.isArray(announcement.profiles) ? announcement.profiles[0]?.full_name || 'Unknown User' : announcement.profiles?.full_name || 'Unknown User'}</span>
                         {(Array.isArray(announcement.profiles) ? announcement.profiles[0]?.title : announcement.profiles?.title) && (
                           <span className="text-xs text-blue-300/80 font-medium">{Array.isArray(announcement.profiles) ? announcement.profiles[0]?.title : announcement.profiles?.title}</span>
                         )}
                       </div>
                     </div>
                     <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 px-4 py-2.5 rounded-xl border border-emerald-500/30 backdrop-blur-sm shadow-lg">
                       <div className="flex items-center justify-center w-8 h-8 bg-emerald-500/30 rounded-full border border-emerald-400/40">
                         <Calendar className="h-4 w-4 text-emerald-300" />
                       </div>
                       <div className="flex flex-col">
                         <span className="font-bold text-emerald-100 text-sm">Published</span>
                         <span className="text-xs text-emerald-300/80 font-medium">{formatDate(announcement.created_at)}</span>
                       </div>
                     </div>
                     {announcement.expires_at && (
                       <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border backdrop-blur-sm shadow-lg ${
                         expired 
                           ? 'bg-gradient-to-r from-red-600/20 to-rose-600/20 border-red-500/30' 
                           : 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-500/30'
                       }`}>
                         <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${
                           expired 
                             ? 'bg-red-500/30 border-red-400/40' 
                             : 'bg-amber-500/30 border-amber-400/40'
                         }`}>
                           <Clock className={`h-4 w-4 ${
                             expired ? 'text-red-300' : 'text-amber-300'
                           }`} />
                         </div>
                         <div className="flex flex-col">
                           <span className={`font-bold text-sm ${
                             expired ? 'text-red-100' : 'text-amber-100'
                           }`}>
                             {expired ? 'Expired' : 'Expires'}
                           </span>
                           <span className={`text-xs font-medium ${
                             expired ? 'text-red-300/80' : 'text-amber-300/80'
                           }`}>
                             {formatDate(announcement.expires_at)}
                           </span>
                         </div>
                       </div>
                     )}
                   </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 px-6 pb-6">
              <div 
                className="relative text-white leading-relaxed max-w-none text-base mb-6 rounded-2xl p-8 border-2 border-blue-400/40 backdrop-blur-md shadow-2xl shadow-blue-500/20 ring-2 ring-blue-300/20 hover:border-blue-300/60 hover:shadow-blue-400/30 hover:ring-blue-200/30 transition-all duration-500 transform hover:scale-[1.01] before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:via-transparent before:to-blue-500/5 before:rounded-2xl before:pointer-events-none [&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:text-transparent [&_h1]:bg-clip-text [&_h1]:bg-gradient-to-r [&_h1]:from-white [&_h1]:to-blue-100 [&_h1]:mb-6 [&_h1]:drop-shadow-sm [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-blue-50 [&_h2]:mb-4 [&_h2]:drop-shadow-sm [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-blue-100 [&_h3]:mb-3 [&_strong]:text-blue-50 [&_strong]:font-bold [&_strong]:drop-shadow-sm [&_em]:text-blue-200 [&_em]:italic [&_a]:text-blue-300 [&_a]:font-medium [&_a]:no-underline hover:[&_a]:underline hover:[&_a]:text-blue-200 [&_a]:transition-colors [&_blockquote]:border-l-4 [&_blockquote]:border-blue-400/60 [&_blockquote]:pl-6 [&_blockquote]:italic [&_blockquote]:bg-blue-900/20 [&_blockquote]:py-4 [&_blockquote]:rounded-r-lg [&_blockquote]:shadow-inner [&_code]:text-blue-100 [&_code]:bg-slate-800/80 [&_code]:px-3 [&_code]:py-1.5 [&_code]:rounded-md [&_code]:border [&_code]:border-slate-600/50 [&_code]:shadow-sm [&_pre]:bg-slate-900/80 [&_pre]:p-6 [&_pre]:rounded-xl [&_pre]:border-2 [&_pre]:border-slate-600/40 [&_pre]:shadow-xl [&_pre]:backdrop-blur-sm [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-1 [&_li]:mb-2 [&_li]:text-blue-50 [&_p]:mb-4 [&_p]:text-blue-50 [&_p]:leading-7 [&_img]:max-w-full [&_img]:max-h-[500px] [&_img]:object-contain [&_img]:rounded-xl [&_img]:shadow-lg [&_img]:border [&_img]:border-slate-600/30"
                dangerouslySetInnerHTML={{ __html: formatContent(announcement.content) }}
              />

              {/* Attachments Section */}
              {announcement.attachments && announcement.attachments.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4 bg-gradient-to-r from-purple-600/20 to-violet-600/20 px-4 py-3 rounded-xl border border-purple-500/30 backdrop-blur-sm shadow-lg">
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-500/30 rounded-full border border-purple-400/40">
                      <Paperclip className="h-4 w-4 text-purple-300" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-purple-100 text-sm">📎 Attachments</span>
                      <span className="text-xs text-purple-300/80 font-medium">{announcement.attachments.length} file{announcement.attachments.length !== 1 ? 's' : ''} attached</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {announcement.attachments.map((attachment, index) => (
                      <div key={index} className="group flex items-center justify-between p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl border border-slate-600/40 hover:border-slate-500/60 hover:bg-gradient-to-r hover:from-slate-700/60 hover:to-slate-600/60 transition-all duration-300 backdrop-blur-sm shadow-lg">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="p-2 bg-slate-700/50 rounded-lg border border-slate-600/30">
                            {getFileIcon(attachment.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-white transition-colors">{attachment.name}</p>
                            <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">{formatFileSize(attachment.size)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(attachment.url, '_blank');
                          }}
                          className="ml-3 h-9 px-3 text-slate-400 hover:text-white hover:bg-blue-600/20 hover:border-blue-500/50 border border-transparent rounded-lg transition-all duration-200 cursor-pointer"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              

             {/* Reactions Section */}
               <div className="mt-6 pt-5 border-t border-slate-600/40">
                 <AnnouncementReactions announcementId={announcement.id} />
               </div>
              </CardContent>
             {showCommentsFor === announcement.id && (
               <div 
                 className="border-t border-slate-600/50 bg-slate-900/30 p-6"
                 onClick={(e) => e.stopPropagation()}
               >
                 <AnnouncementComments 
                   announcementId={announcement.id}
                   onClose={() => setShowCommentsFor(null)}
                 />
               </div>
             )}
           </Card>
           
           {/* Visual separator between announcements */}
           {!isLast && (
             <div className="flex items-center justify-center py-4">
               <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600/40 to-transparent"></div>
               <div className="mx-4 w-2 h-2 rounded-full bg-slate-600/60"></div>
               <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600/40 to-transparent"></div>
             </div>
           )}
           </React.Fragment>
         );
       })}    
    </div>

    {/* Load More Button */}
    {hasMoreAnnouncements && (
      <div className="flex justify-center pt-8">
        <Button
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          variant="outline"
          className="border-slate-600/60 bg-slate-700/30 text-slate-300 hover:bg-slate-600/50 hover:border-slate-500/80 hover:text-white transition-all duration-200 backdrop-blur-sm px-8 py-3"
        >
          {isLoadingMore ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin mr-2"></div>
              Loading more...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Load More Announcements ({sortedAnnouncements.length - displayCount} remaining)
            </>
          )}
        </Button>
      </div>
    )}

    {/* Preview Modal */}
    {previewAnnouncement && (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 cursor-pointer"
           onClick={() => setPreviewAnnouncement(null)}>
        <div className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-800/95 border-2 border-slate-600/60 rounded-2xl shadow-2xl shadow-black/50 max-w-4xl w-full max-h-[90vh] overflow-y-auto cursor-default backdrop-blur-xl"
             onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-gradient-to-r from-slate-800/95 to-slate-900/95 border-b border-slate-600/60 p-6 flex items-center justify-between backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-500/30">
                <Maximize2 className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white">📋 Announcement Preview</h2>
            </div>
            <Button
              onClick={() => setPreviewAnnouncement(null)}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-red-600/20 hover:border-red-500/50 border border-transparent rounded-lg transition-all duration-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-2xl font-bold text-white leading-tight">{previewAnnouncement.title}</h1>
                <div className="flex items-center gap-3 ml-4">
                  <Badge 
                    className={`text-sm font-bold px-4 py-2 rounded-xl border ${getPriorityColor(previewAnnouncement.priority)} backdrop-blur-sm`}
                  >
                    <span className="mr-2">{getPriorityIcon(previewAnnouncement.priority)}</span>
                    {previewAnnouncement.priority.toUpperCase()}
                  </Badge>
                  {isExpired(previewAnnouncement.expires_at) && (
                    <Badge className="bg-gradient-to-r from-red-500/30 to-red-600/30 text-red-300 border-red-400/50 text-sm font-bold px-4 py-2 rounded-xl shadow-lg shadow-red-500/20 backdrop-blur-sm">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      EXPIRED
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-slate-400 mb-6">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{Array.isArray(previewAnnouncement.profiles) ? previewAnnouncement.profiles[0]?.full_name : previewAnnouncement.profiles?.full_name || 'Unknown User'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Created {formatDate(previewAnnouncement.created_at)}</span>
                </div>
                {previewAnnouncement.expires_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Expires {formatDate(previewAnnouncement.expires_at)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="prose prose-invert max-w-none mb-6">
              <div 
                className="relative text-white leading-relaxed text-base rounded-2xl p-8 border-2 border-blue-400/40 backdrop-blur-md shadow-2xl shadow-blue-500/20 ring-2 ring-blue-300/20 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:via-transparent before:to-blue-500/5 before:rounded-2xl before:pointer-events-none [&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:text-transparent [&_h1]:bg-clip-text [&_h1]:bg-gradient-to-r [&_h1]:from-white [&_h1]:to-blue-100 [&_h1]:mb-6 [&_h1]:drop-shadow-sm [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-blue-50 [&_h2]:mb-4 [&_h2]:drop-shadow-sm [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-blue-100 [&_h3]:mb-3 [&_strong]:text-blue-50 [&_strong]:font-bold [&_strong]:drop-shadow-sm [&_em]:text-blue-200 [&_em]:italic [&_a]:text-blue-300 [&_a]:font-medium [&_a]:no-underline hover:[&_a]:underline hover:[&_a]:text-blue-200 [&_a]:transition-colors [&_blockquote]:border-l-4 [&_blockquote]:border-blue-400/60 [&_blockquote]:pl-6 [&_blockquote]:italic [&_blockquote]:bg-blue-900/20 [&_blockquote]:py-4 [&_blockquote]:rounded-r-lg [&_blockquote]:shadow-inner [&_code]:text-blue-100 [&_code]:bg-slate-800/80 [&_code]:px-3 [&_code]:py-1.5 [&_code]:rounded-md [&_code]:border [&_code]:border-slate-600/50 [&_code]:shadow-sm [&_pre]:bg-slate-900/80 [&_pre]:p-6 [&_pre]:rounded-xl [&_pre]:border-2 [&_pre]:border-slate-600/40 [&_pre]:shadow-xl [&_pre]:backdrop-blur-sm [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-1 [&_li]:mb-2 [&_li]:text-blue-50 [&_p]:mb-4 [&_p]:text-blue-50 [&_p]:leading-7 [&_img]:max-w-full [&_img]:max-h-[500px] [&_img]:object-contain [&_img]:rounded-xl [&_img]:shadow-lg [&_img]:border [&_img]:border-slate-600/30"
                dangerouslySetInnerHTML={{ __html: formatContent(previewAnnouncement.content) }}
              />
            </div>
            
            {previewAnnouncement.attachments && previewAnnouncement.attachments.length > 0 && (
              <div className="border-t border-slate-600/50 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Paperclip className="h-5 w-5 text-slate-400" />
                  <span className="text-slate-300 font-medium">Attachments ({previewAnnouncement.attachments.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {previewAnnouncement.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-600/30">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {getFileIcon(attachment.name)}
                        <div className="min-w-0 flex-1">
                          <p className="text-slate-200 font-medium truncate">{attachment.name}</p>
                          <p className="text-slate-400 text-sm">{formatFileSize(attachment.size)}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(attachment.url, '_blank')}
                        className="ml-3 text-slate-400 hover:text-slate-200 hover:bg-slate-600 cursor-pointer"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="border-t border-slate-600/50 pt-6 mt-6">
              <AnnouncementReactions announcementId={previewAnnouncement.id} />
            </div>
          </div>
        </div>
      </div>
    )}
    </TooltipProvider>
  );
}