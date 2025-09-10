'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CalendarIcon, Plus, Filter } from 'lucide-react';
import { EventForm } from './EventForm';
import { EventCard } from './EventCard';
import { useCalendarEvents } from '../../hooks/useCalendarEvents';
import { useSupabaseProfile } from '../../hooks/useSupabaseProfile';
import { CalendarEvent, EventCategory, UpdateEventData } from '../../types/calendar';

const localizer = momentLocalizer(moment);

interface CalendarViewProps {
  teamId?: string;
}

export function CalendarView({ teamId }: CalendarViewProps) {
  const { user, profile } = useSupabaseProfile();
  const { events, categories, loading, createEvent, updateEvent, deleteEvent } = useCalendarEvents(teamId);
  
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Transform events for React Big Calendar
  const calendarEvents = useMemo(() => {
    return events
      .filter(event => {
        if (selectedCategories.length === 0) return true;
        return event.category_id && selectedCategories.includes(event.category_id);
      })
      .map(event => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start_date),
        end: new Date(event.end_date),
        allDay: event.all_day,
        resource: event,
      }));
  }, [events, selectedCategories]);

  // Event style getter for color coding
  const eventStyleGetter = useCallback((event: any) => {
    const calendarEvent = event.resource as CalendarEvent;
    const category = categories.find(cat => cat.id === calendarEvent.category_id);
    
    return {
      style: {
        backgroundColor: category?.color || '#3174ad',
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  }, [categories]);

  const handleSelectEvent = useCallback((event: any) => {
    setSelectedEvent(event.resource);
    setShowEventDetails(true);
  }, []);

  const handleSelectSlot = useCallback((slotInfo: any) => {
    if (profile?.role === 'admin') {
      setSelectedEvent({
        id: '',
        title: '',
        description: '',
        start_date: slotInfo.start.toISOString(),
        end_date: slotInfo.end.toISOString(),
        all_day: slotInfo.start.getHours() === 0 && slotInfo.end.getHours() === 0,
        category_id: null,
        team_id: teamId || null,
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setShowEventForm(true);
    }
  }, [profile?.role, teamId, user?.id]);

  const handleCreateEvent = async (eventData: Partial<CalendarEvent>) => {
    try {
      await createEvent(eventData);
      setShowEventForm(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const handleUpdateEvent = async (eventData: Partial<CalendarEvent>) => {
    if (!selectedEvent?.id) return;
    
    try {
      const updateData: UpdateEventData = {
        title: eventData.title,
        description: eventData.description || undefined,
        start_date: eventData.start_date,
        end_date: eventData.end_date,
        all_day: eventData.all_day,
        category_id: eventData.category_id || undefined,
        team_id: eventData.team_id || undefined
      };
      await updateEvent(selectedEvent.id, updateData);
      setShowEventForm(false);
      setShowEventDetails(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      setShowEventDetails(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const toggleCategoryFilter = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Calendar</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Category Filters */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <Badge
                  key={category.id}
                  variant={selectedCategories.includes(category.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  style={{
                    backgroundColor: selectedCategories.includes(category.id) ? category.color : 'transparent',
                    borderColor: category.color,
                    color: selectedCategories.includes(category.id) ? 'white' : category.color
                  }}
                  onClick={() => toggleCategoryFilter(category.id)}
                >
                  {category.name}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Add Event Button */}
          {profile?.role === 'admin' && (
            <Button
              onClick={() => {
                setSelectedEvent({
                  id: '',
                  title: '',
                  description: '',
                  start_date: new Date().toISOString(),
                  end_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                  all_day: false,
                  category_id: null,
                  team_id: teamId || null,
                  created_by: user?.id || null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
                setShowEventForm(true);
              }}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Event</span>
            </Button>
          )}
        </div>
      </div>

      {/* Calendar */}
      <Card className="p-6">
        <div style={{ height: '600px' }}>
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable={profile?.role === 'admin'}
            eventPropGetter={eventStyleGetter}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            step={60}
            showMultiDayTimes
            components={{
              toolbar: (props) => (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => props.onNavigate('PREV')}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => props.onNavigate('TODAY')}
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => props.onNavigate('NEXT')}
                    >
                      Next
                    </Button>
                  </div>
                  
                  <h3 className="text-lg font-semibold">
                    {moment(props.date).format('MMMM YYYY')}
                  </h3>
                  
                  <div className="flex items-center space-x-1">
                    {[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA].map(viewName => (
                      <Button
                        key={viewName}
                        variant={props.view === viewName ? "default" : "outline"}
                        size="sm"
                        onClick={() => props.onView(viewName)}
                      >
                        {viewName.charAt(0).toUpperCase() + viewName.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              )
            }}
          />
        </div>
      </Card>

      {/* Event Form Modal */}
      {showEventForm && selectedEvent && (
        <EventForm
          event={selectedEvent}
          categories={categories}
          onSave={selectedEvent.id ? handleUpdateEvent : handleCreateEvent}
          onCancel={() => {
            setShowEventForm(false);
            setSelectedEvent(null);
          }}
        />
      )}

      {/* Event Details Modal */}
      {showEventDetails && selectedEvent && (
        <EventCard
          event={selectedEvent}
          categories={categories}
          onEdit={() => {
            setShowEventDetails(false);
            setShowEventForm(true);
          }}
          onDelete={() => handleDeleteEvent(selectedEvent.id)}
          onClose={() => {
            setShowEventDetails(false);
            setSelectedEvent(null);
          }}
          canEdit={profile?.role === 'admin' || selectedEvent.created_by === user?.id}
        />
      )}
    </div>
  );
}