'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { CalendarEvent, EventCategory } from '../../types/calendar';
import { format } from 'date-fns';
import { Calendar, Clock, User, Edit, Trash2, X } from 'lucide-react';

interface EventCardProps {
  event: CalendarEvent;
  categories: EventCategory[];
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  canEdit: boolean;
}

export function EventCard({ event, categories, onEdit, onDelete, onClose, canEdit }: EventCardProps) {
  const category = categories.find(cat => cat.id === event.category_id);
  
  const formatEventDate = (startDate: string, endDate: string, allDay: boolean) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (allDay) {
      const isSameDay = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd');
      if (isSameDay) {
        return format(start, 'MMMM d, yyyy');
      } else {
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
      }
    } else {
      const isSameDay = format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd');
      if (isSameDay) {
        return `${format(start, 'MMMM d, yyyy')} • ${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
      } else {
        return `${format(start, 'MMM d, h:mm a')} - ${format(end, 'MMM d, h:mm a yyyy')}`;
      }
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      onDelete();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {event.title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Category Badge */}
          {category && (
            <div className="flex items-center space-x-2">
              <Badge
                className="text-white"
                style={{ backgroundColor: category.color }}
              >
                {category.name}
              </Badge>
            </div>
          )}

          {/* Date and Time */}
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {event.all_day ? (
                <Calendar className="h-4 w-4 text-gray-500" />
              ) : (
                <Clock className="h-4 w-4 text-gray-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {formatEventDate(event.start_date, event.end_date, event.all_day)}
              </p>
              {event.all_day && (
                <p className="text-xs text-gray-500 mt-1">All day event</p>
              )}
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Description</h4>
              <Card className="p-3 bg-gray-50">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {event.description}
                </p>
              </Card>
            </div>
          )}

          {/* Created By */}
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <User className="h-3 w-3" />
            <span>
              Created {format(new Date(event.created_at), 'MMM d, yyyy')}
              {event.updated_at !== event.created_at && (
                <span> • Updated {format(new Date(event.updated_at), 'MMM d, yyyy')}</span>
              )}
            </span>
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}