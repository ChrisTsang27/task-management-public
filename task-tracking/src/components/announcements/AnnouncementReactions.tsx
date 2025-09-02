import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { useSupabaseProfile } from "@/hooks/useSupabaseProfile";
import { Heart, ThumbsUp, ThumbsDown, Smile, Frown, Star } from 'lucide-react';

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
  profiles: {
    full_name: string;
  };
}

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
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reactionCounts, setReactionCounts] = useState<ReactionCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingEmoji, setSubmittingEmoji] = useState<string | null>(null);

  const fetchReactions = useCallback(async () => {
    try {
      const response = await fetch(`/api/announcements/${announcementId}/reactions`);
      if (response.ok) {
        const data = await response.json();
        setReactions(data.reactions || []);
      }
    } catch (error) {
      console.error('Error fetching reactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [announcementId]);

  const calculateReactionCounts = useCallback(() => {
    const counts: { [emoji: string]: ReactionCount } = {};

    reactions.forEach((reaction) => {
      if (!counts[reaction.emoji]) {
        counts[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
          hasUserReacted: false,
        };
      }
      counts[reaction.emoji].count++;
      counts[reaction.emoji].users.push(reaction.profiles.full_name);
      if (reaction.user_id === profile?.id) {
        counts[reaction.emoji].hasUserReacted = true;
      }
    });

    setReactionCounts(Object.values(counts));
  }, [reactions, profile?.id]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  useEffect(() => {
    calculateReactionCounts();
  }, [calculateReactionCounts]);

  const handleReaction = async (emoji: string) => {
    if (!profile?.id) return;

    setSubmittingEmoji(emoji);
    try {
      const response = await fetch(`/api/announcements/${announcementId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji, user_id: profile.id }),
      });

      if (response.ok) {
        await fetchReactions(); // Refresh reactions
      } else {
        console.error('Failed to toggle reaction');
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    } finally {
      setSubmittingEmoji(null);
    }
  };

  const getReactionCount = (emoji: string) => {
    return reactionCounts.find(r => r.emoji === emoji);
  };

  const hasUserReacted = (emoji: string) => {
    return reactionCounts.find(r => r.emoji === emoji)?.hasUserReacted || false;
  };

  const getTooltipText = (emoji: string) => {
    const reaction = getReactionCount(emoji);
    if (!reaction || reaction.count === 0) return '';
    
    if (reaction.count === 1) {
      return reaction.users[0];
    } else if (reaction.count <= 3) {
      return reaction.users.join(', ');
    } else {
      return `${reaction.users.slice(0, 2).join(', ')} and ${reaction.count - 2} others`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border border-slate-400/30 border-t-slate-400 rounded-full animate-spin"></div>
        <span className="text-slate-400 text-sm">Loading reactions...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Reaction Buttons */}
      <div className="flex items-center gap-1">
        {EMOJI_OPTIONS.map(({ emoji }) => {
          const count = getReactionCount(emoji)?.count || 0;
          const userReacted = hasUserReacted(emoji);
          const isSubmitting = submittingEmoji === emoji;
          
          return (
            <Button
              key={emoji}
              variant="outline"
              size="sm"
              onClick={() => handleReaction(emoji)}
              disabled={!profile || isSubmitting}
              className={`h-8 px-2 border-slate-600 text-slate-300 hover:bg-slate-700 transition-all ${
                userReacted ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : ''
              }`}
              title={getTooltipText(emoji)}
            >
              {isSubmitting ? (
                <div className="w-3 h-3 border border-slate-400/30 border-t-slate-400 rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="text-sm mr-1">{emoji}</span>
                  {count > 0 && (
                    <span className="text-xs font-medium">{count}</span>
                  )}
                </>
              )}
            </Button>
          );
        })}
      </div>

      {/* Reaction Summary */}
      {reactionCounts.length > 0 && (
        <div className="flex items-center gap-1 text-slate-400 text-sm">
          <span>•</span>
          <span>
            {reactionCounts.reduce((total, r) => total + r.count, 0)} reaction{reactionCounts.reduce((total, r) => total + r.count, 0) !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}