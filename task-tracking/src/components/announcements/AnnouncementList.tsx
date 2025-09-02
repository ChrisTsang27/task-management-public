"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAnnouncements, deleteAnnouncement } from "@/lib/actions/announcements";
import { useSupabaseProfile } from "@/hooks/useSupabaseProfile";
import { Trash2, Edit, Calendar, User, Clock, AlertCircle, MessageCircle, Paperclip, Download, FileText, Image } from 'lucide-react';
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

  const fetchAnnouncements = async () => {
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
      } else {
        console.error("Failed to fetch announcements:", result.error);
      }
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
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
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const formatContent = (content: string) => {
    // Content is already sanitized HTML from TipTap editor
    // Just return it as-is since server-side sanitization is applied
    return content;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    } else {
      return <Paperclip className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            <span className="ml-3 text-slate-400">Loading announcements...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (announcements.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-8">
          <div className="text-center text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <p className="text-lg font-medium mb-2">No announcements yet</p>
            <p className="text-sm">Create your first announcement to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => {
        const expired = isExpired(announcement.expires_at);
        return (
          <Card key={announcement.id} className={`bg-slate-800/50 border-slate-700 transition-all duration-200 hover:bg-slate-800/70 ${expired ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <span>{announcement.title}</span>
                      {expired && <AlertCircle className="h-4 w-4 text-gray-400" />}
                    </CardTitle>
                    <Badge className={`text-xs font-medium ${getPriorityColor(announcement.priority)}`}>
                      {announcement.priority.toUpperCase()}
                    </Badge>
                    {expired && (
                      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">
                        EXPIRED
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{Array.isArray(announcement.profiles) ? announcement.profiles[0]?.full_name || 'Unknown User' : announcement.profiles?.full_name || 'Unknown User'}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(announcement.created_at)}</span>
                    </div>
                    {announcement.expires_at && (
                      <>
                        <span>•</span>
                        <div className={`flex items-center gap-1 ${expired ? 'text-red-400' : 'text-orange-400'}`}>
                          <Clock className="h-4 w-4" />
                          <span>
                            {expired ? 'Expired' : 'Expires'}: {formatDate(announcement.expires_at)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <Button
                     onClick={() => setShowCommentsFor(showCommentsFor === announcement.id ? null : announcement.id)}
                     variant="outline"
                     size="sm"
                     className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                   >
                     <MessageCircle className="h-4 w-4" />
                   </Button>
                   {profile?.role === 'admin' && (
                     <>
                       <Button
                         onClick={() => onEdit?.(announcement)}
                         variant="outline"
                         size="sm"
                         className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                       >
                         <Edit className="h-4 w-4" />
                       </Button>
                       <Button
                         onClick={() => handleDelete(announcement.id)}
                         variant="outline"
                         size="sm"
                         disabled={deletingId === announcement.id}
                         className="border-red-600/50 text-red-400 hover:bg-red-600/20 hover:text-red-300"
                       >
                         {deletingId === announcement.id ? (
                           <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                         ) : (
                           <Trash2 className="h-4 w-4" />
                         )}
                       </Button>
                     </>
                   )}
                 </div>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className="text-slate-300 leading-relaxed max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-white [&_h3]:mb-2 [&_strong]:text-white [&_em]:text-slate-200 [&_a]:text-blue-400 [&_a]:no-underline hover:[&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:text-slate-200 [&_code]:bg-slate-700 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-slate-800 [&_pre]:p-4 [&_pre]:rounded [&_ul]:list-disc [&_ul]:list-inside [&_ol]:list-decimal [&_ol]:list-inside [&_li]:mb-1"
                dangerouslySetInnerHTML={{ __html: formatContent(announcement.content) }}
              />

              {/* Attachments Section */}
              {announcement.attachments && announcement.attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments ({announcement.attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {announcement.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-700/30 rounded border border-slate-600">
                        <div className="flex items-center gap-2 min-w-0">
                          {getFileIcon(attachment.type)}
                          <div className="min-w-0">
                            <p className="text-sm text-slate-300 truncate">{attachment.name}</p>
                            <p className="text-xs text-slate-400">{formatFileSize(attachment.size)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(attachment.url, '_blank')}
                          className="h-8 px-2 text-slate-400 hover:text-slate-200 hover:bg-slate-600"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Reactions Section */}
              <div className="mt-4 pt-3 border-t border-slate-600">
                <AnnouncementReactions announcementId={announcement.id} />
              </div>
             </CardContent>
             {showCommentsFor === announcement.id && (
               <div className="border-t border-slate-600 p-4">
                 <AnnouncementComments 
                   announcementId={announcement.id}
                   onClose={() => setShowCommentsFor(null)}
                 />
               </div>
             )}
           </Card>
         );
       })}
    </div>
  );
}