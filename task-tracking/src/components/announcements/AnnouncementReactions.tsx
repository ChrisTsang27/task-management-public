import React, { useState, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { useSupabaseProfile } from "@/hooks/useSupabaseProfile";
import { useReactions } from "@/contexts/ReactionsContext";
import { Heart, ThumbsUp, ThumbsDown, Smile, Frown, Star } from 'lucide-react';

interface ReactionCount {
  emoji: string;
  count: number;
  users: string[];
  hasUserReacted: boolean;
}

interface AnnouncementReactionsProps {
  announcementId: string;
}

const EMOJI_OPTIONS = [
  { emoji: '👍', icon: ThumbsUp, label: 'Like' },
  { emoji: '👎', icon: ThumbsDown, label: 'Dislike' },
  { emoji: '❤️', icon: Heart, label: 'Love' },
  { emoji: '😊', icon: Smile, label: 'Happy' },
  { emoji: '😢', icon: Frown, label: 'Sad' },
  { emoji: '⭐', icon: Star, label: 'Star' },
];

export default function AnnouncementReactions({ announcementId }: AnnouncementReactionsProps) {
  const { profile } = useSupabaseProfile();
  const { 
    getReactionCountsForAnnouncement, 
    addReaction, 
    removeReaction,
    isLoading: reactionsLoading 
  } = useReactions();
  const [submittingEmoji, setSubmittingEmoji] = useState<string | null>(null);

  // Get reaction counts from context
  const reactionCounts = getReactionCountsForAnnouncement(announcementId);

  const handleReaction = useCallback(async (emoji: string) => {
    if (!profile?.id) return;

    setSubmittingEmoji(emoji);
    try {
      const hasReacted = reactionCounts.find(r => r.emoji === emoji)?.hasUserReacted || false;
      
      const response = await fetch(`/api/announcements/${announcementId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji, user_id: profile.id }),
      });

      if (response.ok) {
        // Optimistically update the context
        if (hasReacted) {
          removeReaction(announcementId, emoji, profile.id);
        } else {
          addReaction(announcementId, emoji, profile.id);
        }
      } else {
        console.error('Failed to toggle reaction');
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    } finally {
      setSubmittingEmoji(null);
    }
  }, [profile?.id, announcementId, reactionCounts, addReaction, removeReaction]);

  const getReactionCount = useCallback((emoji: string) => {
    return reactionCounts.find(r => r.emoji === emoji);
  }, [reactionCounts]);

  const hasUserReacted = useCallback((emoji: string) => {
    return reactionCounts.find(r => r.emoji === emoji)?.hasUserReacted || false;
  }, [reactionCounts]);

  const getTooltipText = useCallback((emoji: string) => {
    const reaction = getReactionCount(emoji);
    if (!reaction || reaction.count === 0) return '';
    
    if (reaction.count === 1) {
      return reaction.users[0];
    } else if (reaction.count <= 3) {
      return reaction.users.join(', ');
    } else {
      return `${reaction.users.slice(0, 2).join(', ')} and ${reaction.count - 2} others`;
    }
  }, [getReactionCount]);

  // Memoized computed values
  const totalReactions = useMemo(() => {
    return reactionCounts.reduce((total, r) => total + r.count, 0);
  }, [reactionCounts]);

  const hasReactions = useMemo(() => {
    return reactionCounts.length > 0;
  }, [reactionCounts.length]);

  const canReact = useMemo(() => {
    return !!profile;
  }, [profile]);

  if (reactionsLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border border-slate-400/30 border-t-slate-400 rounded-full animate-spin"></div>
        <span className="text-slate-400 text-sm">Loading reactions...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Reaction Buttons */}
      <div className="flex items-center gap-2">
        {EMOJI_OPTIONS.map(({ emoji, icon: Icon }) => {
          const count = getReactionCount(emoji)?.count || 0;
          const userReacted = hasUserReacted(emoji);
          const isSubmitting = submittingEmoji === emoji;
          
          return (
            <Button
              key={emoji}
              variant="outline"
              size="sm"
              onClick={() => handleReaction(emoji)}
              disabled={!canReact || isSubmitting}
              className={`h-9 px-2.5 rounded-lg border transition-all duration-200 flex items-center justify-center ${
                userReacted 
                  ? 'bg-blue-500/15 border-blue-400/50 text-blue-300' 
                  : 'border-slate-600/60 bg-slate-800/40 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500/70'
              }`}
              title={getTooltipText(emoji)}
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border border-slate-400/30 border-t-slate-400 rounded-full animate-spin"></div>
              ) : (
                <div className="flex items-center justify-center gap-1.5">
                  <Icon className="w-4 h-4" />
                  {count > 0 && (
                    <span className="text-xs font-medium bg-slate-600/40 px-1.5 py-0.5 rounded min-w-[16px] text-center leading-none">{count}</span>
                  )}
                </div>
              )}
            </Button>
          );
        })}
      </div>

      {/* Reaction Summary */}
      {hasReactions && (
        <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-600/30">
          <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
          <span className="font-medium">
            {totalReactions} reaction{totalReactions !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}