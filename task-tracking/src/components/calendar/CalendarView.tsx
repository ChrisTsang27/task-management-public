'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CalendarIcon, Plus, Filter, Calendar as CalendarSelectIcon } from 'lucide-react';
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
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-slate-800/90 to-slate-700/80 backdrop-blur-xl border border-cyan-200/20 rounded-2xl shadow-2xl mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-xl border border-cyan-300/30 shadow-lg">
            <CalendarIcon className="h-7 w-7 text-cyan-300 drop-shadow-lg" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-sm">Calendar</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Category Filters */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-slate-600/30 to-slate-700/20 rounded-lg border border-slate-500/30">
              <Filter className="h-4 w-4 text-cyan-300" />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <Badge
                  key={category.id}
                  variant={selectedCategories.includes(category.id) ? "default" : "outline"}
                  className="cursor-pointer transition-all duration-300 hover:scale-105 backdrop-blur-sm border-2 font-medium px-3 py-1.5"
                  style={{
                    backgroundColor: selectedCategories.includes(category.id) 
                      ? `${category.color}CC` 
                      : 'rgba(15, 23, 42, 0.6)',
                    borderColor: category.color,
                    color: selectedCategories.includes(category.id) ? 'white' : category.color,
                    boxShadow: selectedCategories.includes(category.id) 
                      ? `0 4px 12px ${category.color}40` 
                      : `0 2px 8px ${category.color}20`
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
              className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500/80 to-blue-600/70 hover:from-cyan-400/90 hover:to-blue-500/80 border border-cyan-400/50 backdrop-blur-sm shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 hover:scale-105 text-white font-medium px-4 py-2.5 rounded-xl"
            >
              <Plus className="h-5 w-5" />
              <span>Add Event</span>
            </Button>
          )}
        </div>
      </div>

      {/* Calendar */}
      <Card className="p-8 bg-gradient-to-br from-slate-800/95 to-slate-900/90 backdrop-blur-2xl border border-cyan-200/20 rounded-3xl shadow-2xl overflow-hidden">
        <div className="relative">
          {/* Decorative background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-600/5 rounded-2xl"></div>
          <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-cyan-400/10 to-transparent rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-blue-500/10 to-transparent rounded-full blur-2xl"></div>
        </div>
        <div className="relative z-10" style={{ height: '650px' }}>
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
                <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-slate-700/60 to-slate-800/50 backdrop-blur-xl border border-cyan-200/20 rounded-2xl shadow-xl">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => props.onNavigate('PREV')}
                      className="bg-slate-600/40 border-cyan-300/30 text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-400/50 hover:text-cyan-100 transition-all duration-300 backdrop-blur-sm"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => props.onNavigate('TODAY')}
                      className="bg-gradient-to-r from-cyan-500/30 to-blue-600/25 border-cyan-400/40 text-white hover:from-cyan-400/40 hover:to-blue-500/35 hover:border-cyan-300/60 transition-all duration-300 backdrop-blur-sm font-medium"
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => props.onNavigate('NEXT')}
                      className="bg-slate-600/40 border-cyan-300/30 text-cyan-200 hover:bg-cyan-500/20 hover:border-cyan-400/50 hover:text-cyan-100 transition-all duration-300 backdrop-blur-sm"
                    >
                      Next
                    </Button>
                    
                    {/* Modern Date Picker for Quick Navigation */}
                     <div className="flex items-center space-x-2 ml-6">
                       <div className="relative group month-picker-container">
                         <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-xl blur-sm group-hover:blur-md transition-all duration-300"></div>
                         <div className="relative flex items-center space-x-2 bg-gradient-to-r from-slate-700/80 to-slate-800/70 backdrop-blur-xl border border-cyan-300/30 rounded-xl px-4 py-2.5 shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 group-hover:border-cyan-400/50 group-hover:shadow-xl">
                           <CalendarSelectIcon className="h-4 w-4 text-cyan-300 group-hover:text-cyan-200 transition-colors duration-300" />
                           <input
                             type="month"
                             value={moment(props.date).format('YYYY-MM')}
                             onChange={(e) => {
                               const newDate = moment(e.target.value + '-01').toDate();
                               props.onNavigate('DATE', newDate);
                             }}
                             className="bg-transparent border-none text-cyan-100 text-sm font-medium focus:outline-none cursor-pointer min-w-[120px] placeholder-cyan-300/60 hover:text-white transition-colors duration-300"
                             style={{
                               colorScheme: 'dark'
                             }}
                           />
                           <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-600/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                         </div>
                       </div>
                     </div>
                  </div>
                  
                  <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent drop-shadow-sm">
                    {moment(props.date).format('MMMM YYYY')}
                  </h3>
                  
                  <div className="flex items-center space-x-2">
                    {[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA].map(viewName => (
                      <Button
                        key={viewName}
                        variant={props.view === viewName ? "default" : "outline"}
                        size="sm"
                        onClick={() => props.onView(viewName)}
                        className={props.view === viewName 
                          ? "bg-gradient-to-r from-cyan-500/70 to-blue-600/60 border-cyan-400/50 text-white shadow-lg shadow-cyan-500/25 backdrop-blur-sm font-medium" 
                          : "bg-slate-600/30 border-slate-400/40 text-slate-200 hover:bg-cyan-500/15 hover:border-cyan-400/40 hover:text-cyan-200 transition-all duration-300 backdrop-blur-sm"
                        }
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