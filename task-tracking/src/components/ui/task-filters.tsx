"use client";

import React, { useState, useMemo, useCallback } from 'react';

import { X, SortAsc, SortDesc, Filter, Sparkles, Zap, Target } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { typography, TYPOGRAPHY_PRESETS, getContextualTypography } from '@/lib/typography';
import { TaskStatus } from '@/types/tasks';

export interface TaskFilters {
  status?: TaskStatus[];
  assignee?: string[];
  team?: string[];
  isRequest?: boolean;
  sortBy?: 'title' | 'created_at' | 'due_date' | 'status';
  sortOrder?: 'asc' | 'desc';
}

interface TaskFiltersProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  availableAssignees?: { id: string; name: string }[];
  availableTeams?: { id: string; name: string }[];
  className?: string;
}



const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'awaiting_approval', label: 'Awaiting Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'rework', label: 'Rework' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
];

const SORT_OPTIONS = [
  { value: 'title', label: 'Title' },
  { value: 'created_at', label: 'Created Date' },
  { value: 'due_date', label: 'Due Date' },
  { value: 'status', label: 'Status' },
];

export const TaskFiltersPanel = React.memo(function TaskFiltersPanel({
  filters,
  onFiltersChange,
  availableAssignees = [],
  availableTeams = [],
  className = ''
}: TaskFiltersProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [hoveredFilter, setHoveredFilter] = useState<string | null>(null);
  const [ripplePosition, setRipplePosition] = useState<{ x: number; y: number } | null>(null);
  const updateFilter = useCallback((key: keyof TaskFilters, value: string | string[] | boolean | undefined) => {
    setIsAnimating(true);
    onFiltersChange({ ...filters, [key]: value });
    setTimeout(() => setIsAnimating(false), 300);
  }, [filters, onFiltersChange]);

  const toggleArrayFilter = useCallback((key: 'status' | 'assignee' | 'team', value: string) => {
    const currentArray = filters[key] || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    updateFilter(key, newArray.length > 0 ? newArray : undefined);
  }, [filters, updateFilter]);

  const clearAllFilters = useCallback(() => {
    setIsAnimating(true);
    onFiltersChange({
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    });
    setTimeout(() => setIsAnimating(false), 500);
  }, [filters.sortBy, filters.sortOrder, onFiltersChange]);

  const handleRippleClick = useCallback((event: React.MouseEvent, callback: () => void) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setRipplePosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
    callback();
    setTimeout(() => setRipplePosition(null), 600);
  }, []);

  // Memoize expensive calculations
  const hasActiveFilters = useMemo(() => !!(filters.status?.length || 
    filters.assignee?.length || filters.team?.length || filters.isRequest !== undefined), [filters]);

  const activeFilterCount = useMemo(() => (
    (filters.status?.length || 0) +
    (filters.assignee?.length || 0) +
    (filters.team?.length || 0) +
    (filters.isRequest !== undefined ? 1 : 0)
  ), [filters]);

  return (
    <Card className={`relative overflow-hidden backdrop-blur-xl border shadow-2xl transition-all duration-500 transform ${isAnimating ? 'scale-[1.02]' : 'scale-100'} ${hasActiveFilters ? 'bg-gradient-to-br from-slate-800/80 via-slate-700/60 to-slate-800/80 border-blue-500/30 shadow-blue-500/20' : 'bg-gradient-to-br from-slate-800/60 via-slate-900/60 to-slate-800/60 border-slate-700/50'} ${className}`}>
      {/* Animated Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Ripple Effect */}
      {ripplePosition && (
        <div 
          className="absolute pointer-events-none"
          style={{
            left: ripplePosition.x - 50,
            top: ripplePosition.y - 50,
            width: 100,
            height: 100
          }}
        >
          <div className="w-full h-full bg-blue-400/30 rounded-full animate-ping" />
        </div>
      )}
      
      {/* Floating Particles */}
      {hasActiveFilters && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/40 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + Math.random()}s`
              }}
            />
          ))}
        </div>
      )}
      
      <CardContent className="relative p-6 space-y-6">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`absolute inset-0 rounded-xl blur-md transition-all duration-300 ${hasActiveFilters ? 'bg-blue-400 opacity-60' : 'bg-slate-600 opacity-30'}`} />
              <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${hasActiveFilters ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30' : 'bg-gradient-to-br from-slate-600 to-slate-700'}`}>
                <Filter className={`w-4 h-4 transition-all duration-300 ${hasActiveFilters ? 'text-white animate-pulse' : 'text-slate-300'}`} />
              </div>
            </div>
            <div>
              <h3 className={`${TYPOGRAPHY_PRESETS.heading.h3} ${typography().setEffect('gradient').setAnimation('fade-in').build()}`}>
                Filters & Sorting
              </h3>
              {hasActiveFilters && (
                <p className={`${getContextualTypography('accent', 'caption-sm')} flex items-center gap-1 animate-fade-in`}>
                  <Sparkles className="w-3 h-3" />
                  {activeFilterCount} active filter{activeFilterCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleRippleClick(e, clearAllFilters)}
              className="relative overflow-hidden group bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-red-200 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/25"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <X className="w-4 h-4 mr-2 relative z-10 group-hover:animate-spin" />
              <span className={`relative z-10 ${getContextualTypography('secondary', 'body-sm')}`}>Clear All</span>
            </Button>
          )}
        </div>

        {/* Enhanced Sorting Section */}
        <div className="relative p-4 rounded-2xl bg-gradient-to-br from-slate-700/40 via-slate-800/40 to-slate-700/40 border border-slate-600/50 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl" />
          
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className={`${TYPOGRAPHY_PRESETS.ui.label} ${typography().setAnimation('fade-in').build()} flex items-center gap-2`}>
                <Target className="w-4 h-4 text-blue-400" />
                Sort By
              </label>
              <Select
                value={filters.sortBy || 'created_at'}
                onValueChange={(value) => updateFilter('sortBy', value)}
              >
                <SelectTrigger className="bg-slate-800/60 border-slate-600/50 text-white backdrop-blur-sm hover:bg-slate-700/60 transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800/95 border-slate-600/50 backdrop-blur-xl">
                  {SORT_OPTIONS.map(option => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value} 
                      className="text-white hover:bg-slate-700/60 focus:bg-blue-600/20 transition-all duration-200"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className={`${TYPOGRAPHY_PRESETS.ui.label} ${typography().setAnimation('fade-in').build()} flex items-center gap-2`}>
                <Zap className="w-4 h-4 text-purple-400" />
                Sort Order
              </label>
              <div className="flex gap-3">
                <Button
                  variant={filters.sortOrder === 'asc' ? 'default' : 'outline'}
                  size="sm"
                  onClick={(e) => handleRippleClick(e, () => updateFilter('sortOrder', 'asc'))}
                  className={`relative overflow-hidden flex-1 transition-all duration-300 transform hover:scale-105 ${
                    filters.sortOrder === 'asc' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30 text-white' 
                      : 'bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50 hover:border-blue-500/30'
                  }`}
                >
                  <SortAsc className="w-4 h-4 mr-2" />
                  Ascending
                </Button>
                <Button
                  variant={filters.sortOrder === 'desc' ? 'default' : 'outline'}
                  size="sm"
                  onClick={(e) => handleRippleClick(e, () => updateFilter('sortOrder', 'desc'))}
                  className={`relative overflow-hidden flex-1 transition-all duration-300 transform hover:scale-105 ${
                    filters.sortOrder === 'desc' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30 text-white' 
                      : 'bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50 hover:border-purple-500/30'
                  }`}
                >
                  <SortDesc className="w-4 h-4 mr-2" />
                  Descending
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Status Filters */}
        <div className="relative p-4 rounded-2xl bg-gradient-to-br from-slate-700/30 via-slate-800/30 to-slate-700/30 border border-slate-600/40 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-blue-500/5 rounded-2xl" />
          
          <div className="relative space-y-4">
            <label className={`${TYPOGRAPHY_PRESETS.ui.label} ${typography().setAnimation('fade-in').build()} flex items-center gap-2`}>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Status Filters
              {filters.status?.length && (
                <Badge className={`bg-green-500/20 text-green-300 border-green-500/30 ${TYPOGRAPHY_PRESETS.ui.badge}`}>
                  {filters.status.length}
                </Badge>
              )}
            </label>
            <div className="flex flex-wrap gap-3">
              {STATUS_OPTIONS.map((option, index) => {
                const isSelected = filters.status?.includes(option.value);
                return (
                  <Badge
                    key={option.value}
                    variant={isSelected ? 'default' : 'outline'}
                    className={`relative overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 ${
                      isSelected 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-500 shadow-lg shadow-green-500/30 animate-pulse' 
                        : 'bg-slate-700/60 text-slate-300 border-slate-600/50 hover:bg-slate-600/60 hover:border-green-500/30 hover:text-green-300'
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={(e) => handleRippleClick(e, () => toggleArrayFilter('status', option.value))}
                    onMouseEnter={() => setHoveredFilter(`status-${option.value}`)}
                    onMouseLeave={() => setHoveredFilter(null)}
                  >
                    {hoveredFilter === `status-${option.value}` && (
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20 animate-pulse" />
                    )}
                    <span className="relative z-10 font-medium">{option.label}</span>
                    {isSelected && (
                      <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full animate-ping" />
                    )}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>



        {/* Enhanced Assignee Filter */}
        {availableAssignees.length > 0 && (
          <div className="relative p-4 rounded-2xl bg-gradient-to-br from-slate-700/30 via-slate-800/30 to-slate-700/30 border border-slate-600/40 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-2xl" />
            
            <div className="relative space-y-4">
              <label className={`${TYPOGRAPHY_PRESETS.ui.label} ${typography().setAnimation('fade-in').build()} flex items-center gap-2`}>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                Assignee Filters
                {filters.assignee?.length && (
                  <Badge className={`bg-purple-500/20 text-purple-300 border-purple-500/30 ${TYPOGRAPHY_PRESETS.ui.badge}`}>
                    {filters.assignee.length}
                  </Badge>
                )}
              </label>
              <div className="flex flex-wrap gap-3">
                {availableAssignees.map((assignee, index) => {
                  const isSelected = filters.assignee?.includes(assignee.id);
                  return (
                    <Badge
                      key={assignee.id}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`relative overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 ${
                        isSelected 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white border-purple-500 shadow-lg shadow-purple-500/30 animate-pulse' 
                          : 'bg-slate-700/60 text-slate-300 border-slate-600/50 hover:bg-slate-600/60 hover:border-purple-500/30 hover:text-purple-300'
                      }`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                      onClick={(e) => handleRippleClick(e, () => toggleArrayFilter('assignee', assignee.id))}
                      onMouseEnter={() => setHoveredFilter(`assignee-${assignee.id}`)}
                      onMouseLeave={() => setHoveredFilter(null)}
                    >
                      {hoveredFilter === `assignee-${assignee.id}` && (
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 animate-pulse" />
                      )}
                      <span className="relative z-10 font-medium">{assignee.name}</span>
                      {isSelected && (
                        <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full animate-ping" />
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Team Filter */}
        {availableTeams.length > 0 && (
          <div className="relative p-4 rounded-2xl bg-gradient-to-br from-slate-700/30 via-slate-800/30 to-slate-700/30 border border-slate-600/40 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-teal-500/5 rounded-2xl" />
            
            <div className="relative space-y-4">
              <label className={`${TYPOGRAPHY_PRESETS.ui.label} ${typography().setAnimation('fade-in').build()} flex items-center gap-2`}>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                Team Filters
                {filters.team?.length && (
                  <Badge className={`bg-cyan-500/20 text-cyan-300 border-cyan-500/30 ${TYPOGRAPHY_PRESETS.ui.badge}`}>
                    {filters.team.length}
                  </Badge>
                )}
              </label>
              <div className="flex flex-wrap gap-3">
                {availableTeams.map((team, index) => {
                  const isSelected = filters.team?.includes(team.id);
                  return (
                    <Badge
                      key={team.id}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`relative overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 ${
                        isSelected 
                          ? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white border-cyan-500 shadow-lg shadow-cyan-500/30 animate-pulse' 
                          : 'bg-slate-700/60 text-slate-300 border-slate-600/50 hover:bg-slate-600/60 hover:border-cyan-500/30 hover:text-cyan-300'
                      }`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                      onClick={(e) => handleRippleClick(e, () => toggleArrayFilter('team', team.id))}
                      onMouseEnter={() => setHoveredFilter(`team-${team.id}`)}
                      onMouseLeave={() => setHoveredFilter(null)}
                    >
                      {hoveredFilter === `team-${team.id}` && (
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-teal-400/20 animate-pulse" />
                      )}
                      <span className="relative z-10 font-medium">{team.name}</span>
                      {isSelected && (
                        <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full animate-ping" />
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Request Type Filter */}
        <div className="relative p-4 rounded-2xl bg-gradient-to-br from-slate-700/30 via-slate-800/30 to-slate-700/30 border border-slate-600/40 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 rounded-2xl" />
          
          <div className="relative space-y-4">
            <label className={`${TYPOGRAPHY_PRESETS.ui.label} ${typography().setAnimation('fade-in').build()} flex items-center gap-2`}>
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
              Task Type Filter
              {filters.isRequest !== undefined && (
                <Badge className={`bg-indigo-500/20 text-indigo-300 border-indigo-500/30 ${TYPOGRAPHY_PRESETS.ui.badge}`}>
                  Active
                </Badge>
              )}
            </label>
            <div className="flex gap-4">
              <Button
                variant={filters.isRequest === false ? 'default' : 'outline'}
                size="sm"
                onClick={(e) => handleRippleClick(e, () => updateFilter('isRequest', filters.isRequest === false ? undefined : false))}
                className={`relative overflow-hidden flex-1 transition-all duration-300 transform hover:scale-105 ${
                  filters.isRequest === false 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/30 text-white' 
                    : 'bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50 hover:border-blue-500/30 hover:text-blue-300'
                }`}
                onMouseEnter={() => setHoveredFilter('request-false')}
                onMouseLeave={() => setHoveredFilter(null)}
              >
                {hoveredFilter === 'request-false' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 animate-pulse" />
                )}
                <span className="relative z-10 font-medium">Regular Tasks</span>
                {filters.isRequest === false && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full animate-ping" />
                )}
              </Button>
              <Button
                variant={filters.isRequest === true ? 'default' : 'outline'}
                size="sm"
                onClick={(e) => handleRippleClick(e, () => updateFilter('isRequest', filters.isRequest === true ? undefined : true))}
                className={`relative overflow-hidden flex-1 transition-all duration-300 transform hover:scale-105 ${
                  filters.isRequest === true 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30 text-white' 
                    : 'bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50 hover:border-purple-500/30 hover:text-purple-300'
                }`}
                onMouseEnter={() => setHoveredFilter('request-true')}
                onMouseLeave={() => setHoveredFilter(null)}
              >
                {hoveredFilter === 'request-true' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 animate-pulse" />
                )}
                <span className="relative z-10 font-medium">Assistance Requests</span>
                {filters.isRequest === true && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full animate-ping" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});