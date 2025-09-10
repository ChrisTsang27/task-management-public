"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Sparkles, Target, Clock, CheckCircle2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { typography, TYPOGRAPHY_PRESETS, getContextualTypography } from '@/lib/typography';
import { cn } from '@/lib/utils';
import { 
  Task, 
  TaskStatus, 
  KanbanColumn as KanbanColumnType,
  TASK_STATUS_LABELS,
  Team 
} from '@/types/tasks';

import { TaskCard } from './TaskCard';


interface KanbanColumnProps {
  column: KanbanColumnType;
  teams?: Team[];
  onTaskClick?: (task: Task) => void;
  onTaskStatusChange?: (taskId: string, newStatus: string) => void;
  onApproveRequest?: (taskId: string) => void;
  onRejectRequest?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  className?: string;
  currentUserId?: string;
  activeTaskUsers?: Record<string, string[]>;
  aiPriorityEnabled?: boolean;
}

export const KanbanColumn = React.memo(function KanbanColumn({
  column,
  teams = [],
  onTaskClick,
  onTaskStatusChange,
  onApproveRequest,
  onRejectRequest,
  onDeleteTask,
  className = '',
  activeTaskUsers
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });


  const [rippleEffect, setRippleEffect] = useState(false);
  const [particleAnimation, setParticleAnimation] = useState(false);

  // Memoize expensive calculations
  const taskIds = useMemo(() => column.tasks.map(task => task.id), [column.tasks]);
  const memoizedTeams = useMemo(() => teams || [], [teams]);
  const memoizedActiveTaskUsers = useMemo(() => activeTaskUsers || {}, [activeTaskUsers]);

  // Memoize styling calculations
  const columnStyling = useMemo(() => {
    const baseStyle = 'relative overflow-hidden backdrop-blur-xl border border-slate-700/50 rounded-2xl';
    
    switch (column.id) {
      case 'awaiting_approval':
        return `${baseStyle} bg-gradient-to-br from-amber-900/20 via-slate-900/80 to-orange-900/20 shadow-amber-500/10`;
      case 'in_progress':
        return `${baseStyle} bg-gradient-to-br from-blue-900/20 via-slate-900/80 to-cyan-900/20 shadow-blue-500/10`;
      case 'pending_review':
        return `${baseStyle} bg-gradient-to-br from-purple-900/20 via-slate-900/80 to-violet-900/20 shadow-purple-500/10`;
      case 'done':
        return `${baseStyle} bg-gradient-to-br from-emerald-900/20 via-slate-900/80 to-green-900/20 shadow-emerald-500/10`;
      default:
        return `${baseStyle} bg-gradient-to-br from-slate-900/60 via-slate-800/80 to-slate-900/60 shadow-slate-500/10`;
    }
  }, [column.id]);

  const columnIcon = useMemo(() => {
    switch (column.id) {
      case 'awaiting_approval':
        return <Clock className="w-5 h-5 text-amber-400" />;
      case 'in_progress':
        return <Target className="w-5 h-5 text-blue-400" />;
      case 'pending_review':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'done':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      default:
        return <Plus className="w-5 h-5 text-slate-400" />;
    }
  }, [column.id]);

  // Memoize handlers
  const handleTaskClick = useCallback((task: Task) => {
    onTaskClick?.(task);
  }, [onTaskClick]);

  const handleTaskStatusChange = useCallback((taskId: string, newStatus: string) => {
    onTaskStatusChange?.(taskId, newStatus);
  }, [onTaskStatusChange]);

  const handleApproveRequest = useCallback((taskId: string) => {
    onApproveRequest?.(taskId);
  }, [onApproveRequest]);

  const handleRejectRequest = useCallback((taskId: string) => {
    onRejectRequest?.(taskId);
  }, [onRejectRequest]);

  const handleDeleteTask = useCallback((taskId: string) => {
    onDeleteTask?.(taskId);
  }, [onDeleteTask]);

  // Trigger effects on drop
  useEffect(() => {
    if (isOver) {
      setRippleEffect(true);
      setParticleAnimation(true);
      const timer = setTimeout(() => {
        setRippleEffect(false);
        setParticleAnimation(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOver]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative p-6 space-y-4 min-h-[600px] transition-all duration-500 transform',
        columnStyling,
        isOver && 'scale-105 shadow-2xl ring-2 ring-blue-400/50 ring-offset-2 ring-offset-slate-900',
        rippleEffect && 'animate-pulse',
        className
      )}
    >
      {/* Advanced Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20 rounded-2xl" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent rounded-2xl" />
      
      {/* Animated Border Glow */}
      <div className={cn(
        'absolute inset-0 rounded-2xl transition-opacity duration-500',
        isOver ? 'opacity-100' : 'opacity-0',
        'bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 blur-xl'
      )} />
      
      {/* Floating Particles Effect */}
      {particleAnimation && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-400 rounded-full animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      )}
      
      {/* Enhanced Column Header */}
      <div className="relative flex items-center justify-between mb-6 pb-4 border-b border-slate-600/30">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-xl backdrop-blur-sm border transition-all duration-300',
            'border-slate-700/50',
            'bg-gradient-to-br from-slate-800/60 to-slate-700/60'
          )}>
            {columnIcon}
          </div>
          <div>
            <h3 className={`${TYPOGRAPHY_PRESETS.heading.h3} ${typography().setEffect('glow').build()} mb-1`}>
              {TASK_STATUS_LABELS[column.id as TaskStatus] || column.title}
            </h3>
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={cn(
                  `${TYPOGRAPHY_PRESETS.ui.badge} px-3 py-1 rounded-full backdrop-blur-sm border transition-all duration-300`,
                  column.tasks.length > 0 ? 'bg-slate-700/60 border-slate-600/50 text-slate-300' : 'bg-slate-800/60 border-slate-700/50 text-slate-400'
                )}
              >
                {column.tasks.length} {column.tasks.length === 1 ? 'task' : 'tasks'}
              </Badge>

            </div>
          </div>
        </div>
        

      </div>
      {/* Enhanced Task List Container */}
      <div className="relative space-y-4">
        <SortableContext 
          items={taskIds} 
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.map((task, index) => (
            <div
              key={task.id}
              className="transform transition-all duration-300"
              style={{
                animationDelay: `${index * 0.05}s`
              }}
            >
              <TaskCard
                task={task}
                teams={memoizedTeams}
                onClick={() => handleTaskClick(task)}
                onStatusChange={handleTaskStatusChange}
                onApproveRequest={handleApproveRequest}
                onRejectRequest={handleRejectRequest}
                onDeleteTask={handleDeleteTask}
                activeUsers={memoizedActiveTaskUsers[task.id] || []}
                className="cursor-pointer hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 animate-fade-in"
              />
            </div>
          ))}
        </SortableContext>
      </div>
      
      {/* Premium Empty State for Column */}
      {column.tasks.length === 0 && (
        <div className={cn(
          'relative flex flex-col items-center justify-center h-48 text-slate-400 text-sm transition-all duration-500',
          isOver && 'scale-110 text-slate-300'
        )}>
          {/* Animated Background Glow */}
          <div className={cn(
            'absolute inset-0 rounded-2xl transition-all duration-500',
            isOver ? 'bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-cyan-500/10' : 'bg-transparent'
          )} />
          
          {/* Enhanced Drop Zone */}
          <div className={cn(
            'relative w-20 h-20 rounded-3xl border-2 border-dashed flex items-center justify-center mb-4 transition-all duration-500 backdrop-blur-sm',
            isOver 
              ? 'border-blue-400/70 bg-blue-500/10 shadow-lg shadow-blue-500/25 scale-110' 
              : 'border-slate-600/50 bg-slate-700/20',
            'group cursor-pointer'
          )}>
            {/* Floating Icon with Animation */}
            <div className={cn(
              'transition-all duration-300',
              isOver ? 'animate-bounce' : ''
            )}>
              {columnIcon}
            </div>
            
            {/* Ripple Effect */}
            {isOver && (
              <div className="absolute inset-0 rounded-3xl border-2 border-blue-400/30 animate-ping" />
            )}
          </div>
          
          {/* Enhanced Text with Gradient */}
          <div className="text-center space-y-2 relative z-10">
            <p className={cn(
              `${TYPOGRAPHY_PRESETS.content.body} ${typography().setWeight('semibold').setAnimation('fade-in').build()} transition-all duration-300`,
              isOver 
                ? 'text-blue-300' 
                : 'text-slate-400'
            )}>
              {isOver ? 'Release to drop here' : 'Drop tasks here'}
            </p>
            <p className={cn(
              `${getContextualTypography('muted', 'caption-md')} transition-all duration-300`,
              isOver ? 'text-blue-400/80' : 'text-slate-500'
            )}>
              {isOver ? 'Perfect!' : 'or drag from other columns'}
            </p>
            
            {/* Animated Dots */}
            {!isOver && (
              <div className="flex justify-center gap-1 mt-3">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 h-1 bg-slate-500 rounded-full animate-pulse"
                    style={{
                      animationDelay: `${i * 0.2}s`,
                      animationDuration: '1.5s'
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          

        </div>
      )}
    </div>
  );
});

export default KanbanColumn;