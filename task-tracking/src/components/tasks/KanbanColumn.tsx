"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { useDroppable } from '@dnd-kit/core';
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
  onTaskStatusChange?: (taskId: string, newStatus: string, comment?: string) => void;
  onApproveRequest?: (taskId: string) => void;
  onRejectRequest?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  className?: string;
  currentUserId?: string;
  activeTaskUsers?: Record<string, string[]>;
  aiPriorityEnabled?: boolean;
  activeId?: string | null;
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
  activeTaskUsers,
  activeId
}: KanbanColumnProps) {
  // Droppable functionality
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

  const handleTaskStatusChange = useCallback((taskId: string, newStatus: string, comment?: string) => {
    onTaskStatusChange?.(taskId, newStatus, comment);
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

  // Drag effects removed

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative p-6 space-y-4 min-h-[600px] transition-all duration-300 transform',
        columnStyling,
        rippleEffect && 'animate-pulse',
        // Enhanced entire column drop zone styling
        isOver && 'scale-[1.02] shadow-2xl border-4 border-dashed',
        isOver && column.id === 'awaiting_approval' && 'ring-4 ring-amber-400/60 border-amber-400/80 shadow-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-orange-500/10',
        isOver && column.id === 'in_progress' && 'ring-4 ring-blue-400/60 border-blue-400/80 shadow-blue-500/40 bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-cyan-500/10',
        isOver && column.id === 'pending_review' && 'ring-4 ring-purple-400/60 border-purple-400/80 shadow-purple-500/40 bg-gradient-to-br from-purple-500/10 via-purple-400/5 to-pink-500/10',
        isOver && column.id === 'done' && 'ring-4 ring-emerald-400/60 border-emerald-400/80 shadow-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-green-500/10',
        className
      )}
    >
      {/* Advanced Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20 rounded-2xl" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent rounded-2xl" />
      
      {/* Enhanced Full Column Drop Zone Overlay */}
      {isOver && (
        <div className={cn(
          "absolute inset-0 rounded-2xl border-4 border-dashed animate-pulse pointer-events-none z-10",
          column.id === 'awaiting_approval' && 'border-amber-400/90 shadow-[0_0_30px_rgba(251,191,36,0.4)] bg-gradient-to-br from-amber-400/15 via-amber-500/8 to-orange-400/12',
          column.id === 'in_progress' && 'border-blue-400/90 shadow-[0_0_30px_rgba(96,165,250,0.4)] bg-gradient-to-br from-blue-400/15 via-blue-500/8 to-cyan-400/12',
          column.id === 'pending_review' && 'border-purple-400/90 shadow-[0_0_30px_rgba(196,181,253,0.4)] bg-gradient-to-br from-purple-400/15 via-purple-500/8 to-pink-400/12',
          column.id === 'done' && 'border-emerald-400/90 shadow-[0_0_30px_rgba(52,211,153,0.4)] bg-gradient-to-br from-emerald-400/15 via-emerald-500/8 to-green-400/12'
        )} />
      )}
      
      {/* Prominent Full Column Drop Indicator */}
      {isOver && (
        <div className="absolute top-8 left-8 right-8 flex items-center justify-center py-6 bg-black/40 border-2 border-white/30 rounded-2xl backdrop-blur-md pointer-events-none z-20 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center animate-bounce",
              column.id === 'awaiting_approval' && 'bg-amber-400',
              column.id === 'in_progress' && 'bg-blue-400',
              column.id === 'pending_review' && 'bg-purple-400',
              column.id === 'done' && 'bg-emerald-400'
            )}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <div className="text-xl text-white font-bold tracking-wide">
              Drop anywhere in this column
            </div>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center animate-bounce",
              column.id === 'awaiting_approval' && 'bg-amber-400',
              column.id === 'in_progress' && 'bg-blue-400',
              column.id === 'pending_review' && 'bg-purple-400',
              column.id === 'done' && 'bg-emerald-400'
            )} style={{animationDelay: '0.2s'}}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>
      )}
      
      {/* Enhanced Corner Indicators */}
      {isOver && (
        <>
          <div className={cn(
            "absolute top-2 left-2 w-6 h-6 rounded-full animate-ping pointer-events-none z-15",
            column.id === 'awaiting_approval' && 'bg-amber-400/80',
            column.id === 'in_progress' && 'bg-blue-400/80',
            column.id === 'pending_review' && 'bg-purple-400/80',
            column.id === 'done' && 'bg-emerald-400/80'
          )} />
          <div className={cn(
            "absolute top-2 right-2 w-6 h-6 rounded-full animate-ping pointer-events-none z-15",
            column.id === 'awaiting_approval' && 'bg-amber-400/80',
            column.id === 'in_progress' && 'bg-blue-400/80',
            column.id === 'pending_review' && 'bg-purple-400/80',
            column.id === 'done' && 'bg-emerald-400/80'
          )} style={{animationDelay: '0.3s'}} />
          <div className={cn(
            "absolute bottom-2 left-2 w-6 h-6 rounded-full animate-ping pointer-events-none z-15",
            column.id === 'awaiting_approval' && 'bg-amber-400/80',
            column.id === 'in_progress' && 'bg-blue-400/80',
            column.id === 'pending_review' && 'bg-purple-400/80',
            column.id === 'done' && 'bg-emerald-400/80'
          )} style={{animationDelay: '0.6s'}} />
          <div className={cn(
            "absolute bottom-2 right-2 w-6 h-6 rounded-full animate-ping pointer-events-none z-15",
            column.id === 'awaiting_approval' && 'bg-amber-400/80',
            column.id === 'in_progress' && 'bg-blue-400/80',
            column.id === 'pending_review' && 'bg-purple-400/80',
            column.id === 'done' && 'bg-emerald-400/80'
          )} style={{animationDelay: '0.9s'}} />
        </>
      )}
      
      {/* Drag effects removed */}
      
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
      
      {/* Task List Container - Subtle inner drop zone */}
      <div 
        className={cn(
          "relative space-y-4 min-h-[200px] p-2 rounded-lg transition-all duration-300 ease-out flex-1",
          // Subtle inner styling - main drop zone is now the entire column
          "border border-slate-600/20",
          // Minimal additional styling when dragging over since column handles main feedback
          isOver && "border-slate-500/40"
        )}
      >
        
        {column.tasks.map((task, index) => (
          <div
            key={task.id}
            className="transform transition-all duration-300 relative z-20"
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
              isDragging={activeId === task.id}
              className="cursor-pointer hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 animate-fade-in"
            />
          </div>
        ))}
        
        {/* Spacer to ensure drop zone extends to bottom */}
        <div className="flex-1 min-h-[60px]" />
      </div>
      
      {/* Empty State for Column */}
      {column.tasks.length === 0 && (
        <div className={cn(
          "relative flex flex-col items-center justify-center h-48 text-slate-400 text-sm transition-all duration-300 border-2 border-dashed border-slate-600/30 rounded-lg",
          isOver && "transform scale-105 border-blue-400/80 bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-cyan-500/15 shadow-xl shadow-blue-500/40"
        )}>
          {/* Enhanced Background with border effects */}
          <div className={cn(
            "absolute inset-0 rounded-lg transition-all duration-300",
            isOver && "bg-gradient-to-br from-blue-400/10 via-blue-500/5 to-purple-400/10 border-2 border-blue-400/60"
          )} />
          
          {/* Enhanced Drop Zone */}
          <div className={cn(
            "relative w-24 h-24 rounded-3xl border-3 border-dashed flex items-center justify-center mb-6 backdrop-blur-sm group cursor-pointer transition-all duration-300",
            isOver 
              ? "border-blue-400/90 bg-blue-500/25 shadow-xl shadow-blue-500/50 scale-125 animate-bounce" 
              : "border-slate-600/60 bg-slate-700/30 hover:border-slate-500/80 hover:bg-slate-600/40"
          )}>
            {/* Icon */}
            <div className={cn(
              "transition-all duration-300",
              isOver ? "text-blue-300 scale-150" : "text-slate-500"
            )}>
              {columnIcon}
            </div>
          </div>
          
          {/* Prominent drop message when dragging */}
          {isOver && (
            <div className="absolute top-4 left-4 right-4 flex items-center justify-center py-3 bg-blue-500/20 border-2 border-blue-400/70 rounded-xl backdrop-blur-sm pointer-events-none z-10 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center animate-pulse">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <div className="text-sm text-blue-300 font-semibold">
                  Drop your task here
                </div>
              </div>
            </div>
          )}
          
          {/* Edge highlights for empty state */}
          {isOver && (
            <>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 animate-pulse pointer-events-none rounded-t-lg" />
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 animate-pulse pointer-events-none rounded-b-lg" />
              <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-blue-400 via-purple-400 to-blue-400 animate-pulse pointer-events-none rounded-l-lg" />
              <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-blue-400 via-purple-400 to-blue-400 animate-pulse pointer-events-none rounded-r-lg" />
            </>
          )}
          
          {/* Text */}
          <div className="text-center space-y-2 relative z-10">
            <p className={`${TYPOGRAPHY_PRESETS.content.body} ${typography().setWeight('semibold').setAnimation('fade-in').build()} text-slate-400`}>
              No tasks yet
            </p>
            <p className={`${getContextualTypography('muted', 'caption-md')} text-slate-500`}>
              Tasks will appear here
            </p>
            
            {/* Animated Dots */}
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
          </div>
        </div>
      )}
    </div>
  );
});

export default KanbanColumn;