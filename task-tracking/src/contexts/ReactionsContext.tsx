'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface Reaction {
  id?: string;
  emoji: string;
  user_id: string;
  announcement_id: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
    title?: string;
  };
}

interface ReactionCount {
  emoji: string;
  count: number;
  users: string[];
  hasUserReacted: boolean;
}

interface ReactionsContextType {
  reactions: Record<string, Reaction[]>;
  reactionCounts: Record<string, ReactionCount[]>;
  isLoading: boolean;
  fetchReactionsForAnnouncements: (announcementIds: string[]) => Promise<void>;
  addReaction: (announcementId: string, emoji: string, userId: string) => void;
  removeReaction: (announcementId: string, emoji: string, userId: string) => void;
  getReactionsForAnnouncement: (announcementId: string) => Reaction[];
  getReactionCountsForAnnouncement: (announcementId: string) => ReactionCount[];
}

const ReactionsContext = createContext<ReactionsContextType | undefined>(undefined);

export function ReactionsProvider({ children }: { children: React.ReactNode }) {
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [reactionCounts, setReactionCounts] = useState<Record<string, ReactionCount[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  const calculateReactionCounts = useCallback((announcementReactions: Reaction[], userId?: string) => {
    const counts: { [emoji: string]: ReactionCount } = {};

    announcementReactions.forEach((reaction) => {
      if (!counts[reaction.emoji]) {
        counts[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
          hasUserReacted: false,
        };
      }
      counts[reaction.emoji].count++;
      counts[reaction.emoji].users.push(reaction.profiles?.full_name || 'Unknown User');
      if (reaction.user_id === userId) {
        counts[reaction.emoji].hasUserReacted = true;
      }
    });

    return Object.values(counts);
  }, []);

  const fetchReactionsForAnnouncements = useCallback(async (announcementIds: string[]) => {
    if (announcementIds.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/announcements/reactions/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ announcementIds }),
      });

      if (response.ok) {
        const data = await response.json();
        setReactions(prev => ({ ...prev, ...data.reactions }));
        
        // Calculate reaction counts for each announcement
        const newCounts: Record<string, ReactionCount[]> = {};
        Object.entries(data.reactions).forEach(([announcementId, announcementReactions]) => {
          newCounts[announcementId] = calculateReactionCounts(announcementReactions as Reaction[]);
        });
        setReactionCounts(prev => ({ ...prev, ...newCounts }));
      } else {
        console.error('Failed to fetch batch reactions');
      }
    } catch (error) {
      console.error('Error fetching batch reactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [calculateReactionCounts]);

  const addReaction = useCallback((announcementId: string, emoji: string, userId: string) => {
    const newReaction: Reaction = {
      emoji,
      user_id: userId,
      announcement_id: announcementId,
      created_at: new Date().toISOString(),
      profiles: {
        id: userId,
        full_name: 'You', // Placeholder, will be updated when refetched
      },
    };

    setReactions(prev => ({
      ...prev,
      [announcementId]: [...(prev[announcementId] || []), newReaction]
    }));

    // Recalculate counts
    setReactionCounts(prev => {
      const announcementReactions = [...(reactions[announcementId] || []), newReaction];
      return {
        ...prev,
        [announcementId]: calculateReactionCounts(announcementReactions, userId)
      };
    });
  }, [reactions, calculateReactionCounts]);

  const removeReaction = useCallback((announcementId: string, emoji: string, userId: string) => {
    setReactions(prev => ({
      ...prev,
      [announcementId]: (prev[announcementId] || []).filter(
        reaction => !(reaction.emoji === emoji && reaction.user_id === userId)
      )
    }));

    // Recalculate counts
    setReactionCounts(prev => {
      const announcementReactions = (reactions[announcementId] || []).filter(
        reaction => !(reaction.emoji === emoji && reaction.user_id === userId)
      );
      return {
        ...prev,
        [announcementId]: calculateReactionCounts(announcementReactions, userId)
      };
    });
  }, [reactions, calculateReactionCounts]);

  const getReactionsForAnnouncement = useCallback((announcementId: string) => {
    return reactions[announcementId] || [];
  }, [reactions]);

  const getReactionCountsForAnnouncement = useCallback((announcementId: string) => {
    return reactionCounts[announcementId] || [];
  }, [reactionCounts]);

  const value: ReactionsContextType = {
    reactions,
    reactionCounts,
    isLoading,
    fetchReactionsForAnnouncements,
    addReaction,
    removeReaction,
    getReactionsForAnnouncement,
    getReactionCountsForAnnouncement,
  };

  return (
    <ReactionsContext.Provider value={value}>
      {children}
    </ReactionsContext.Provider>
  );
}

export function useReactions() {
  const context = useContext(ReactionsContext);
  if (context === undefined) {
    throw new Error('useReactions must be used within a ReactionsProvider');
  }
  return context;
}