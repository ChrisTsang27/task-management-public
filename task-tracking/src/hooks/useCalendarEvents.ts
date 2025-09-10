'use client';

import { useState, useEffect, useCallback } from 'react';
import supabase from '@/lib/supabaseBrowserClient';
import { CalendarEvent, EventCategory, CreateEventData, UpdateEventData } from '../types/calendar';
import { useSupabaseProfile } from './useSupabaseProfile';

export function useCalendarEvents(teamId?: string) {
  const { user, profile } = useSupabaseProfile();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('event_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
    }
  }, []);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    try {
      let query = supabase
        .from('calendar_events')
        .select('*')
        .order('start_date');

      // Filter by team if specified
      if (teamId) {
        query = query.or(`team_id.eq.${teamId},team_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
    }
  }, [teamId]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchCategories(),
        fetchEvents()
      ]);
      
      setLoading(false);
    };

    loadData();
  }, [fetchCategories, fetchEvents]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to calendar events changes
    const eventsSubscription = supabase
      .channel('calendar_events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events'
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    // Subscribe to categories changes
    const categoriesSubscription = supabase
      .channel('event_categories_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_categories'
        },
        () => {
          fetchCategories();
        }
      )
      .subscribe();

    return () => {
      eventsSubscription.unsubscribe();
      categoriesSubscription.unsubscribe();
    };
  }, [user, fetchEvents, fetchCategories]);

  // Create event
  const createEvent = useCallback(async (eventData: Partial<CalendarEvent>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          ...eventData,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      // Optimistically update local state
      setEvents(prev => [...prev, data]);
      
      return data;
    } catch (err) {
      console.error('Error creating event:', err);
      throw new Error('Failed to create event');
    }
  }, [user]);

  // Update event
  const updateEvent = useCallback(async (eventId: string, eventData: UpdateEventData) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .update(eventData)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      
      // Optimistically update local state
      setEvents(prev => prev.map(event => 
        event.id === eventId ? data : event
      ));
      
      return data;
    } catch (err) {
      console.error('Error updating event:', err);
      throw new Error('Failed to update event');
    }
  }, [user]);

  // Delete event
  const deleteEvent = useCallback(async (eventId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      
      // Optimistically update local state
      setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (err) {
      console.error('Error deleting event:', err);
      throw new Error('Failed to delete event');
    }
  }, [user]);

  // Create category (admin only)
  const createCategory = useCallback(async (categoryData: Partial<EventCategory>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('event_categories')
        .insert({
          ...categoryData,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      // Optimistically update local state
      setCategories(prev => [...prev, data]);
      
      return data;
    } catch (err) {
      console.error('Error creating category:', err);
      throw new Error('Failed to create category');
    }
  }, [user]);

  // Update category (admin only)
  const updateCategory = useCallback(async (categoryId: string, categoryData: Partial<EventCategory>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('event_categories')
        .update(categoryData)
        .eq('id', categoryId)
        .select()
        .single();

      if (error) throw error;
      
      // Optimistically update local state
      setCategories(prev => prev.map(category => 
        category.id === categoryId ? data : category
      ));
      
      return data;
    } catch (err) {
      console.error('Error updating category:', err);
      throw new Error('Failed to update category');
    }
  }, [user]);

  // Delete category (admin only)
  const deleteCategory = useCallback(async (categoryId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('event_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      
      // Optimistically update local state
      setCategories(prev => prev.filter(category => category.id !== categoryId));
    } catch (err) {
      console.error('Error deleting category:', err);
      throw new Error('Failed to delete category');
    }
  }, [user]);

  return {
    events,
    categories,
    loading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch: () => {
      fetchEvents();
      fetchCategories();
    }
  };
}