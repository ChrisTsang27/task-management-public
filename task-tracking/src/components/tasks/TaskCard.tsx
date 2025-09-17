"use client";
import React, { useMemo, useCallback } from 'react';

import { useDraggable } from '@dnd-kit/core';
import { format } from 'date-fns';
import { Calendar, User, Clock, GripVertical, CheckCircle, XCircle, Brain, Zap, Users, AlertTriangle, TrendingUp, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { 
  Task, 
  TASK_STATUS_LABELS,
  Team
} from '@/types/tasks';
import { getStatusTransitionButtons } from '@/utils/workflow';


interface TaskCardProps {
  task: Task;
  teams?: Team[];
  onClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: string, comment?: string) => void;
  onApproveRequest?: (taskId: string) => void;
  onRejectRequest?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  className?: string;
  activeUsers?: string[]; // Users currently viewing/editing this task
  isDragging?: boolean;
}

export const TaskCard = React.memo(function TaskCard({
  task,
  teams,
  onClick,
  onStatusChange,
  onApproveRequest,
  onRejectRequest,
  onDeleteTask,
  activeUsers = [],
  className = '',
  isDragging = false
}: TaskCardProps) {
  // Drag functionality
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
  } = useDraggable({ 
    id: task.id,
    data: {
      type: 'task',
      task: task,
      currentStatus: task.status
    }
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.3 : 1,
    visibility: isDragging ? 'visible' : 'visible',
    zIndex: isDragging ? 1000 : 'auto',
    transition: isDragging ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  } as React.CSSProperties;

  const handleClick = useCallback(() => {
    onClick?.(task);
  }, [onClick, task]);

  // Memoize expensive calculations
  const requestingTeamName = useMemo(() => {
    if (!task.is_request || !task.description_json?._metadata?.requesting_team_id) {
      return null;
    }
    
    const requestingTeam = teams?.find(team => team.id === task.description_json?._metadata?.requesting_team_id);
    return requestingTeam?.name || 'Unknown Team';
  }, [task.is_request, task.description_json, teams]);

  const isOverdue = useMemo(() => 
    task.due_date && new Date(task.due_date) < new Date(), [task.due_date]);

  // Memoize priority calculations
  const priorityData = useMemo(() => {
    const score = task.priority_score;
    if (score === undefined || score === null) return null;
    
    const getPriorityColor = (score: number) => {
      if (score >= 80) return 'from-red-500 to-red-600';
      if (score >= 60) return 'from-orange-500 to-orange-600';
      if (score >= 40) return 'from-yellow-500 to-yellow-600';
      return 'from-green-500 to-green-600';
    };

    const getPriorityLabel = (score: number) => {
      if (score >= 80) return 'Critical';
      if (score >= 60) return 'High';
      if (score >= 40) return 'Medium';
      return 'Low';
    };

    const getPriorityIcon = (score: number) => {
      if (score >= 80) return <AlertTriangle className="w-3 h-3" />;
      if (score >= 60) return <TrendingUp className="w-3 h-3" />;
      if (score >= 40) return <Zap className="w-3 h-3" />;
      return <CheckCircle className="w-3 h-3" />;
    };
    
    return {
      color: getPriorityColor(score),
      label: getPriorityLabel(score),
      icon: getPriorityIcon(score)
    };
  }, [task.priority_score]);

  // Memoize description text extraction
  const descriptionText = useMemo(() => {
    if (!task.description_json) return '';
    
    if (typeof task.description_json === 'string') {
      return task.description_json;
    }
    
    const extractText = (content: unknown): string => {
      if (!content) return '';
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content.map(extractText).join(' ');
      }
      if (typeof content === 'object' && content !== null) {
        const obj = content as Record<string, unknown>;
        if (obj.text && typeof obj.text === 'string') return obj.text;
        if (obj.content) return extractText(obj.content);
      }
      return '';
    };
    
    return extractText(task.description_json) || '';
  }, [task.description_json]);

  // Memoize action handlers
  const handleApprove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onApproveRequest) {
      onApproveRequest(task.id);
    } else if (onStatusChange) {
      onStatusChange(task.id, 'in_progress');
    }
  }, [onApproveRequest, onStatusChange, task.id]);

  const handleReject = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRejectRequest?.(task.id);
  }, [onRejectRequest, task.id]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteTask?.(task.id);
  }, [onDeleteTask, task.id]);

  const handleStatusChange = useCallback((status: string, comment?: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onStatusChange?.(task.id, status, comment);
  }, [onStatusChange, task.id]);

  // Memoize status transition buttons
  const statusButtons = useMemo(() => 
    getStatusTransitionButtons(task.status).slice(0, 2), [task.status]);

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        group relative bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80 
        border border-slate-600/50 rounded-xl p-5 cursor-grab active:cursor-grabbing
        shadow-lg hover:shadow-2xl hover:shadow-blue-500/20
        transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        hover:bg-gradient-to-br hover:from-slate-700/90 hover:via-slate-800/70 hover:to-slate-900/90
        hover:border-slate-500/60 hover:scale-[1.03] hover:-translate-y-2
        before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br 
        before:from-white/8 before:via-blue-500/5 before:to-purple-500/5 before:opacity-0
        hover:before:opacity-100 before:transition-all before:duration-500 before:ease-out
        ${isDragging ? 'scale-105 rotate-2 shadow-2xl shadow-blue-500/30 ring-2 ring-blue-400/50 bg-gradient-to-br from-slate-700/95 via-slate-800/75 to-slate-900/95' : ''}
        ${className}
      `}
      onClick={handleClick}
    >
      {/* Enhanced Glow Effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/8 via-purple-500/6 to-emerald-500/8 opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out" />
      
      {/* AI Priority Indicator */}
      {priorityData && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className={`px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${priorityData.color} shadow-lg border border-white/20 flex items-center gap-1`}>
            {priorityData.icon}
            {priorityData.label}
          </div>
        </div>
      )}
      
      {/* Real-time Collaboration Indicators */}
      {activeUsers && activeUsers.length > 0 && (
        <div className="absolute -top-1 -left-1 z-10">
          <div className="flex items-center gap-1">
            <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg border border-white/20">
              <Users className="w-3 h-3" />
              {activeUsers.length}
            </div>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
        </div>
      )}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400/3 via-transparent to-violet-400/3 opacity-0 group-hover:opacity-100 transition-all duration-1000 ease-out delay-100" />
      
      {/* Header */}
      <div className="relative flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div
            className="text-slate-400 hover:text-blue-300 p-2 rounded-lg hover:bg-slate-700/60 transition-all duration-200 transform hover:scale-110 group pointer-events-none"
            title="Drag to move task"
          >
            <GripVertical className="w-4 h-4 group-hover:drop-shadow-lg" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2 group-hover:text-blue-100 transition-all duration-400 ease-out">
              {task.title}
            </h3>
            
            {/* Status and AI Insights */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-slate-700/80 to-slate-600/80 text-slate-200 font-medium border border-slate-600/50 shadow-sm">
                {TASK_STATUS_LABELS[task.status]}
              </span>
              {task.is_request && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-900/80 to-purple-800/80 text-purple-200 font-medium border border-purple-700/50 shadow-sm">
                  Help Request
                </span>
              )}
              {task.complexity_score !== undefined && task.complexity_score !== null && (
                <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-blue-900/80 to-blue-800/80 text-blue-200 font-medium border border-blue-700/50 shadow-sm flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  {task.complexity_score}/10
                </span>
              )}
              {task.estimated_hours && (
                <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-amber-900/80 to-amber-800/80 text-amber-200 font-medium border border-amber-700/50 shadow-sm flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {task.estimated_hours}h
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Description */}
      {descriptionText && (
        <div className="relative text-slate-300 text-sm mb-4 line-clamp-2 leading-relaxed group-hover:text-slate-200 transition-all duration-400 ease-out">
          {descriptionText}
        </div>
      )}
      
      {/* Metadata */}
      <div className="relative space-y-2.5 text-xs text-slate-400 group-hover:text-slate-300 transition-all duration-400 ease-out">
        {/* Requesting Team for Assistance Requests */}
        {task.is_request && requestingTeamName && (
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-amber-900/20 border border-amber-700/30">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium text-amber-300">Request from {requestingTeamName}</span>
          </div>
        )}
        
        {/* Creator */}
        {task.created_by_profile && (
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/30 border border-slate-700/30">
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-medium">Created by {task.created_by_profile.full_name || 'Unknown'}</span>
          </div>
        )}
        
        {/* Created Date */}
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium">Created {format(new Date(task.created_at), 'MMM d, yyyy')}</span>
        </div>
        
        {/* Due Date */}
        {task.due_date && (
          <div className={`flex items-center gap-2.5 p-2 rounded-lg border ${
            isOverdue ? 'bg-red-900/20 border-red-700/30 text-red-300' : 'bg-slate-800/30 border-slate-700/30'
          }`}>
            <Calendar className={`w-3.5 h-3.5 ${
              isOverdue ? 'text-red-400' : 'text-purple-400'
            }`} />
            <span className="font-medium">
              {isOverdue ? 'Overdue: ' : 'Due: '}
              {format(new Date(task.due_date), 'MMM d, yyyy')}
            </span>
          </div>
        )}
        
        {/* Assignee */}
        {task.assignee_profile && (
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/30 border border-slate-700/30">
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium">Assigned to {task.assignee_profile.full_name || 'Unknown'}</span>
          </div>
        )}
        
        {/* AI Insights */}
        {task.ai_insights && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-700/30">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-medium text-purple-300">AI Insights</span>
            </div>
            <div className="text-xs text-slate-300 space-y-1">
              {task.ai_insights.recommendations && task.ai_insights.recommendations.length > 0 && (
                <div>• {task.ai_insights.recommendations[0]}</div>
              )}
              {task.ai_insights.recommendations && task.ai_insights.recommendations.length > 0 && (
                <div>• {task.ai_insights.recommendations[0]}</div>
              )}
            </div>
          </div>
        )}
        
        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {task.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="text-xs px-2 py-1 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/50">
                #{tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="text-xs px-2 py-1 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600/50">
                +{task.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Actions */}
       {(task.is_request && task.status === 'awaiting_approval' && onStatusChange && onRejectRequest) ? (
         <div className="relative flex gap-3 mt-4 pt-4 border-t border-slate-600/50">
           <Button
             size="sm"
             variant="outline"
             className="flex-1 flex items-center justify-center gap-2 text-green-300 border-green-500/50 hover:bg-green-500/20 hover:border-green-400/60 bg-green-900/20 transition-all duration-300 ease-out hover:scale-105 active:scale-95 font-medium"
             onClick={handleApprove}
           >
             <CheckCircle className="w-3.5 h-3.5" />
             Approve & Start
           </Button>
           <Button
             size="sm"
             variant="outline"
             className="flex-1 flex items-center justify-center gap-2 text-red-300 border-red-500/50 hover:bg-red-500/20 hover:border-red-400/60 bg-red-900/20 transition-all duration-300 ease-out hover:scale-105 active:scale-95 font-medium"
             onClick={handleReject}
           >
             <XCircle className="w-3.5 h-3.5" />
             Reject
           </Button>
         </div>
       ) : (
        onStatusChange && (
          <div className="relative flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-600/50">
            {statusButtons.map((button) => (
              <Button
                key={button.status}
                size="sm"
                variant="outline"
                className="flex-shrink-0 min-w-0 px-3 py-1.5 text-xs text-slate-200 border-slate-500/50 hover:bg-slate-600/30 hover:border-slate-400/60 bg-slate-800/30 transition-all duration-300 ease-out hover:scale-105 active:scale-95 font-medium whitespace-nowrap"
                onClick={handleStatusChange(button.status)}
              >
                {button.label}
              </Button>
            ))}
          </div>
        )
      )}
      
      {/* Delete and Reject Actions */}
      {(onDeleteTask || (onRejectRequest && !task.is_request)) && (
        <div className="relative flex gap-3 mt-3 pt-3 border-t border-slate-600/30">
          {onRejectRequest && !task.is_request && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 text-orange-300 border-orange-500/50 hover:bg-orange-500/20 hover:border-orange-400/60 bg-orange-900/20 transition-all duration-300 ease-out hover:scale-105 active:scale-95 font-medium"
              onClick={handleReject}
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </Button>
          )}
          {onDeleteTask && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 text-red-300 border-red-500/50 hover:bg-red-500/20 hover:border-red-400/60 bg-red-900/20 transition-all duration-300 ease-out hover:scale-105 active:scale-95 font-medium"
              onClick={handleDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

export default TaskCard;