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
    data: {
      type: 'column',
      columnId: column.id,
      accepts: ['task']
    }
  });


  const [rippleEffect, setRippleEffect] = useState(false);
  const [particleAnimation, setParticleAnimation] = useState(false);

  // Memoize expensive calculations
  const taskIds = useMemo(() => column.tasks.map(task => task.id), [column.tasks]);
  const memoizedTeams = useMemo(() => teams || [], [teams]);
  const memoizedActiveTaskUsers = useMemo(() => activeTaskUsers || {}, [activeTaskUsers]);

  // Memoize styling calculations with more unified appearance
  const columnStyling = useMemo(() => {
    const baseStyle = 'relative overflow-hidden backdrop-blur-xl border border-slate-700/40 rounded-2xl';
    
    // More subtle color differences for unified look
    switch (column.id) {
      case 'awaiting_approval':
        return `${baseStyle} bg-gradient-to-br from-slate-900/70 via-slate-900/85 to-amber-900/15 shadow-lg shadow-slate-900/20`;
      case 'in_progress':
        return `${baseStyle} bg-gradient-to-br from-slate-900/70 via-slate-900/85 to-blue-900/15 shadow-lg shadow-slate-900/20`;
      case 'pending_review':
        return `${baseStyle} bg-gradient-to-br from-slate-900/70 via-slate-900/85 to-purple-900/15 shadow-lg shadow-slate-900/20`;
      case 'done':
        return `${baseStyle} bg-gradient-to-br from-slate-900/70 via-slate-900/85 to-emerald-900/15 shadow-lg shadow-slate-900/20`;
      default:
        return `${baseStyle} bg-gradient-to-br from-slate-900/70 via-slate-900/85 to-slate-900/70 shadow-lg shadow-slate-900/20`;
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
        'relative p-6 space-y-4 min-h-[600px] transition-all duration-200 ease-out transform',
        columnStyling,
        rippleEffect && 'animate-pulse',
        // Enhanced entire column drop zone styling with improved responsiveness
        isOver && 'scale-[1.03] shadow-2xl border-4 border-dashed transform-gpu',
        isOver && column.id === 'awaiting_approval' && 'ring-4 ring-amber-400/70 border-amber-400/90 shadow-amber-500/50 bg-gradient-to-br from-amber-500/15 via-amber-400/8 to-orange-500/12',
        isOver && column.id === 'in_progress' && 'ring-4 ring-blue-400/70 border-blue-400/90 shadow-blue-500/50 bg-gradient-to-br from-blue-500/15 via-blue-400/8 to-cyan-500/12',
        isOver && column.id === 'pending_review' && 'ring-4 ring-purple-400/70 border-purple-400/90 shadow-purple-500/50 bg-gradient-to-br from-purple-500/15 via-purple-400/8 to-pink-500/12',
        isOver && column.id === 'done' && 'ring-4 ring-emerald-400/70 border-emerald-400/90 shadow-emerald-500/50 bg-gradient-to-br from-emerald-500/15 via-emerald-400/8 to-green-500/12',
        className
      )}
      style={{
        // Ensure the drop zone covers the entire column area
        minHeight: '600px',
        position: 'relative',
        // Ensure the drop zone is accessible
        pointerEvents: 'auto',
        zIndex: 1,
      }}
      data-droppable-id={column.id}
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
        <div className="relative flex flex-col items-center justify-center h-96 group">
          {/* Unified Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800/20 via-slate-900/30 to-slate-800/20 rounded-xl border border-slate-700/30" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.08)_0%,transparent_70%)] rounded-xl" />
          
          {/* Column Icon with Subtle Color */}
          <div className="relative z-10 mb-4">
            <div className="p-4 rounded-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
              {columnIcon}
            </div>
          </div>
          
          {/* Enhanced Drop Zone Indicator */}
          {isOver && (
            <div className={cn(
              "absolute inset-0 rounded-xl border-4 border-dashed animate-pulse",
              column.id === 'awaiting_approval' && 'border-amber-400/70 bg-gradient-to-br from-amber-500/15 via-amber-400/8 to-orange-500/12 shadow-[0_0_30px_rgba(251,191,36,0.3)]',
              column.id === 'in_progress' && 'border-blue-400/70 bg-gradient-to-br from-blue-500/15 via-blue-400/8 to-cyan-500/12 shadow-[0_0_30px_rgba(96,165,250,0.3)]',
              column.id === 'pending_review' && 'border-purple-400/70 bg-gradient-to-br from-purple-500/15 via-purple-400/8 to-pink-500/12 shadow-[0_0_30px_rgba(196,181,253,0.3)]',
              column.id === 'done' && 'border-emerald-400/70 bg-gradient-to-br from-emerald-500/15 via-emerald-400/8 to-green-500/12 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
            )}>
              {/* Corner Ping Animations with Column Colors */}
              <div className={cn(
                "absolute -top-2 -left-2 w-4 h-4 rounded-full animate-ping opacity-75",
                column.id === 'awaiting_approval' && 'bg-amber-400',
                column.id === 'in_progress' && 'bg-blue-400',
                column.id === 'pending_review' && 'bg-purple-400',
                column.id === 'done' && 'bg-emerald-400'
              )} style={{ animationDelay: '0s' }} />
              <div className={cn(
                "absolute -top-2 -right-2 w-4 h-4 rounded-full animate-ping opacity-75",
                column.id === 'awaiting_approval' && 'bg-orange-400',
                column.id === 'in_progress' && 'bg-cyan-400',
                column.id === 'pending_review' && 'bg-pink-400',
                column.id === 'done' && 'bg-green-400'
              )} style={{ animationDelay: '0.2s' }} />
              <div className={cn(
                "absolute -bottom-2 -left-2 w-4 h-4 rounded-full animate-ping opacity-75",
                column.id === 'awaiting_approval' && 'bg-amber-300',
                column.id === 'in_progress' && 'bg-blue-300',
                column.id === 'pending_review' && 'bg-purple-300',
                column.id === 'done' && 'bg-emerald-300'
              )} style={{ animationDelay: '0.4s' }} />
              <div className={cn(
                "absolute -bottom-2 -right-2 w-4 h-4 rounded-full animate-ping opacity-75",
                column.id === 'awaiting_approval' && 'bg-amber-400',
                column.id === 'in_progress' && 'bg-blue-400',
                column.id === 'pending_review' && 'bg-purple-400',
                column.id === 'done' && 'bg-emerald-400'
              )} style={{ animationDelay: '0.6s' }} />
              
              {/* Center Drop Indicator */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={cn(
                  "backdrop-blur-sm border rounded-full p-4 animate-pulse",
                  column.id === 'awaiting_approval' && 'bg-amber-500/20 border-amber-400/40 text-amber-300',
                  column.id === 'in_progress' && 'bg-blue-500/20 border-blue-400/40 text-blue-300',
                  column.id === 'pending_review' && 'bg-purple-500/20 border-purple-400/40 text-purple-300',
                  column.id === 'done' && 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                )}>
                  <div className="text-lg font-medium">
                    Drop your task here
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Unified Text Content */}
          <div className="text-center space-y-3 relative z-10">
            <p className={`${TYPOGRAPHY_PRESETS.content.body} ${typography().setWeight('semibold').setAnimation('fade-in').build()} text-slate-300`}>
              No tasks yet
            </p>
            <p className={`${getContextualTypography('muted', 'caption-md')} text-slate-500`}>
              Tasks will appear here when added
            </p>
            
            {/* Subtle Animated Indicator */}
            <div className="flex justify-center gap-1.5 mt-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-slate-600 rounded-full animate-pulse"
                  style={{
                    animationDelay: `${i * 0.3}s`,
                    animationDuration: '2s'
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