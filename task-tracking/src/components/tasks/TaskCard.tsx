"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { 
  Task, 
  TASK_STATUS_LABELS
} from '@/types/tasks';
import { getStatusTransitionButtons } from '@/utils/workflow';
import { Calendar, User, Clock, GripVertical, CheckCircle, XCircle, Brain, Zap, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  onApproveRequest?: (taskId: string) => void;
  onRejectRequest?: (taskId: string) => void;
  isDragging?: boolean;
  className?: string;
  activeUsers?: string[]; // Users currently viewing/editing this task
}

export const TaskCard = React.memo(function TaskCard({ 
  task, 
  onClick, 
  onStatusChange, 
  onApproveRequest,
  onRejectRequest,
  isDragging = false,
  className = '',
  activeUsers
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = () => {
    onClick?.(task);
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  // AI Priority helpers
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

  // Extract text from description JSON
  const getDescriptionText = () => {
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
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`
        group relative bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80 
        border border-slate-600/50 rounded-xl p-5 cursor-pointer
        shadow-lg hover:shadow-2xl hover:shadow-blue-500/20
        transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        hover:bg-gradient-to-br hover:from-slate-700/90 hover:via-slate-800/70 hover:to-slate-900/90
        hover:border-slate-500/60 hover:scale-[1.03] hover:-translate-y-2
        before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br 
        before:from-white/8 before:via-blue-500/5 before:to-purple-500/5 before:opacity-0
        hover:before:opacity-100 before:transition-all before:duration-500 before:ease-out
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${className}
      `}
      onClick={handleClick}
      {...attributes}
    >
      {/* Enhanced Glow Effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/8 via-purple-500/6 to-emerald-500/8 opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out" />
      
      {/* AI Priority Indicator */}
      {task.priority_score !== undefined && task.priority_score !== null && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className={`px-2 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getPriorityColor(task.priority_score)} shadow-lg border border-white/20 flex items-center gap-1`}>
            {getPriorityIcon(task.priority_score)}
            {getPriorityLabel(task.priority_score)}
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
          <button
            {...listeners}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-700/50 transition-all duration-300 ease-out group-hover:text-blue-400 hover:scale-110"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          
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
      {getDescriptionText() && (
        <div className="relative text-slate-300 text-sm mb-4 line-clamp-2 leading-relaxed group-hover:text-slate-200 transition-all duration-400 ease-out">
          {getDescriptionText()}
        </div>
      )}
      
      {/* Metadata */}
      <div className="relative space-y-2.5 text-xs text-slate-400 group-hover:text-slate-300 transition-all duration-400 ease-out">
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
             onClick={(e) => {
               e.stopPropagation();
               if (onApproveRequest) {
                 onApproveRequest(task.id);
               } else {
                 onStatusChange(task.id, 'in_progress'); // Direct transition to in_progress
               }
             }}
           >
             <CheckCircle className="w-3.5 h-3.5" />
             Approve & Start
           </Button>
           <Button
             size="sm"
             variant="outline"
             className="flex-1 flex items-center justify-center gap-2 text-red-300 border-red-500/50 hover:bg-red-500/20 hover:border-red-400/60 bg-red-900/20 transition-all duration-300 ease-out hover:scale-105 active:scale-95 font-medium"
             onClick={(e) => {
               e.stopPropagation();
               onRejectRequest(task.id);
             }}
           >
             <XCircle className="w-3.5 h-3.5" />
             Reject
           </Button>
         </div>
       ) : (
        onStatusChange && (
          <div className="relative flex gap-3 mt-4 pt-4 border-t border-slate-600/50">
            {getStatusTransitionButtons(task.status).slice(0, 2).map((button) => (
              <Button
                key={button.status}
                size="sm"
                variant="outline"
                className="flex-1 text-slate-200 border-slate-500/50 hover:bg-slate-600/30 hover:border-slate-400/60 bg-slate-800/30 transition-all duration-300 ease-out hover:scale-105 active:scale-95 font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, button.status);
                }}
              >
                {button.label}
              </Button>
            ))}
          </div>
        )
      )}
    </div>
  );
});

export default TaskCard;