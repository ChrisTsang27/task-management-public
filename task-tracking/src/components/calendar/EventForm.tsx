'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CalendarEvent, EventCategory } from '../../types/calendar';
import { format } from 'date-fns';

interface EventFormProps {
  event: CalendarEvent;
  categories: EventCategory[];
  onSave: (eventData: Partial<CalendarEvent>) => Promise<void>;
  onCancel: () => void;
}

export function EventForm({ event, categories, onSave, onCancel }: EventFormProps) {
  const [formData, setFormData] = useState({
    title: event.title || '',
    description: event.description || '',
    start_date: event.start_date ? format(new Date(event.start_date), "yyyy-MM-dd'T'HH:mm") : '',
    end_date: event.end_date ? format(new Date(event.end_date), "yyyy-MM-dd'T'HH:mm") : '',
    all_day: event.all_day || false,
    category_id: event.category_id || ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Update end date when all_day changes
    if (formData.all_day && formData.start_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(0, 0, 0, 0);
      
      setFormData(prev => ({
        ...prev,
        end_date: format(endDate, "yyyy-MM-dd'T'HH:mm")
      }));
    }
  }, [formData.all_day, formData.start_date]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }
    
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (endDate <= startDate) {
        newErrors.end_date = 'End date must be after start date';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const eventData: Partial<CalendarEvent> = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        all_day: formData.all_day,
        category_id: formData.category_id || null
      };
      
      await onSave(eventData);
    } catch (error) {
      console.error('Failed to save event:', error);
      setErrors({ submit: 'Failed to save event. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {event.id ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter event title"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter event description (optional)"
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => handleInputChange('category_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="all_day"
              checked={formData.all_day}
              onChange={(e) => handleInputChange('all_day', e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="all_day">All day event</Label>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date *</Label>
            <Input
              id="start_date"
              type={formData.all_day ? 'date' : 'datetime-local'}
              value={formData.all_day ? formData.start_date.split('T')[0] : formData.start_date}
              onChange={(e) => {
                let value = e.target.value;
                if (formData.all_day) {
                  value += 'T00:00';
                }
                handleInputChange('start_date', value);
              }}
              className={errors.start_date ? 'border-red-500' : ''}
            />
            {errors.start_date && (
              <p className="text-sm text-red-500">{errors.start_date}</p>
            )}
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="end_date">End Date *</Label>
            <Input
              id="end_date"
              type={formData.all_day ? 'date' : 'datetime-local'}
              value={formData.all_day ? formData.end_date.split('T')[0] : formData.end_date}
              onChange={(e) => {
                let value = e.target.value;
                if (formData.all_day) {
                  value += 'T23:59';
                }
                handleInputChange('end_date', value);
              }}
              className={errors.end_date ? 'border-red-500' : ''}
            />
            {errors.end_date && (
              <p className="text-sm text-red-500">{errors.end_date}</p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <p className="text-sm text-red-500">{errors.submit}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[100px]"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                event.id ? 'Update Event' : 'Create Event'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}