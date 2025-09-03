import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSupabaseProfile } from "@/hooks/useSupabaseProfile";
import { MessageCircle, Send, User, Calendar, Trash2 } from 'lucide-react';

interface Comment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

interface AnnouncementCommentsProps {
  announcementId: string;
  onClose?: () => void;
}

export default function AnnouncementComments({ announcementId, onClose }: AnnouncementCommentsProps) {
  const { profile } = useSupabaseProfile();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/announcements/${announcementId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [announcementId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !profile?.id) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/announcements/${announcementId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': profile.id,
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (response.ok) {
        setNewComment('');
        await fetchComments(); // Refresh comments
      } else {
        console.error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!profile?.id) return;

    setDeletingId(commentId);
    try {
      const response = await fetch(`/api/announcements/${announcementId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': profile.id,
        },
      });

      if (response.ok) {
        await fetchComments(); // Refresh comments
      } else {
        console.error('Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canDeleteComment = (comment: Comment) => {
    return profile?.role === 'admin' || comment.user_id === profile?.id;
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comments ({comments.length})
          </CardTitle>
          {onClose && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment Form */}
        {profile && (
          <form onSubmit={handleSubmitComment} className="space-y-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 resize-none"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </form>
        )}

        {/* Comments List */}
        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">No comments yet</p>
              <p className="text-slate-500 text-sm">Be the first to comment on this announcement</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-slate-300 font-medium text-sm">
                        {Array.isArray(comment.profiles) ? comment.profiles[0]?.full_name || 'Unknown User' : comment.profiles?.full_name || 'Unknown User'}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(comment.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  {canDeleteComment(comment) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deletingId === comment.id}
                          className="h-8 w-8 p-0 border-red-600/50 text-red-400 hover:bg-red-600/20 hover:text-red-300"
                        >
                          {deletingId === comment.id ? (
                            <div className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete comment</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {comment.body}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}