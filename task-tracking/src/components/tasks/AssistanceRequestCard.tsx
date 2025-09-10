"use client";
import { format, formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns';
import {
  Users,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  User,
  ArrowRight,
  GripVertical
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Task,
  Team,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS
} from '@/types/tasks';

interface AssistanceRequestCardProps {
  task: Task;
  teams?: Team[];
  onClick?: () => void;
  onApprove?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
  onAssign?: (taskId: string) => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
  canApprove?: boolean;
}

export function AssistanceRequestCard({
  task,
  teams = [],
  onClick,
  onApprove,
  onReject,
  onAssign,
  isDragging = false,
  dragHandleProps,
  canApprove = false
}: AssistanceRequestCardProps) {
  const isOverdue = task.due_date && isAfter(new Date(), new Date(task.due_date));
  const isDueSoon = task.due_date && 
    isBefore(new Date(), new Date(task.due_date)) && 
    isAfter(addDays(new Date(), 2), new Date(task.due_date));

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApprove?.(task.id);
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReject?.(task.id);
  };

  const handleAssign = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAssign?.(task.id);
  };

  const getRequestingTeamName = () => {
    const requestingTeamId = task.description_json?._metadata?.requesting_team_id;
    const requestingTeam = teams.find(t => t.id === requestingTeamId);
    return requestingTeam?.name || requestingTeamId || 'Unknown Team';
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer border-l-4',
        'bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-blue-500/50 backdrop-blur-xl',
        'hover:scale-[1.02] hover:shadow-2xl hover:border-blue-400/70',
        isDragging && 'opacity-60 rotate-3 scale-110 z-50',
        isOverdue && 'border-l-red-500/70 bg-gradient-to-br from-red-900/40 to-pink-900/40 shadow-lg shadow-red-500/20',
        isDueSoon && 'border-l-yellow-500/70 bg-gradient-to-br from-yellow-900/40 to-orange-900/40 shadow-lg shadow-yellow-500/20',
        task.status === 'awaiting_approval' && 'border-l-purple-500/70 bg-gradient-to-br from-purple-900/40 to-violet-900/40 shadow-lg shadow-purple-500/20'
      )}
      onClick={onClick}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      {/* Header Section */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            {/* Drag Handle */}
            <div {...dragHandleProps} className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 cursor-grab active:cursor-grabbing transform hover:scale-110">
              <GripVertical className="w-4 h-4" />
            </div>
            
            {/* Request Icon */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-medium">
                Assistance Request
              </div>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className={cn(
            'px-2.5 py-1 rounded-lg text-xs font-medium border backdrop-blur-sm',
            TASK_STATUS_COLORS[task.status]
          )}>
            {TASK_STATUS_LABELS[task.status]}
          </div>
        </div>
        
        {/* Title */}
        <h3 className="font-semibold text-white text-base leading-tight mt-3 group-hover:text-blue-100 transition-colors">
          {task.title}
        </h3>
        
        {/* Requesting Team Info */}
        <div className="flex items-center gap-2.5 text-sm text-slate-300 mt-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <ArrowRight className="w-3 h-3 text-white" />
          </div>
          <span>From: <span className="font-medium text-blue-300">{getRequestingTeamName()}</span></span>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="px-4 pb-4 space-y-3">
        {/* Description Preview */}
        {task.description_json && (
          <div className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
            {/* Simple text extraction from TipTap JSON */}
            {typeof task.description_json === 'string' 
              ? task.description_json 
              : 'Click to view details...'}
          </div>
        )}
        
        {/* Priority and Due Date */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">

          </div>
          
          {task.due_date && (
            <div className={cn(
              'flex items-center gap-2 text-sm',
              isOverdue && 'text-red-300 font-medium',
              isDueSoon && 'text-yellow-300 font-medium',
              !isOverdue && !isDueSoon && 'text-slate-300'
            )}>
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center',
                isOverdue ? 'bg-gradient-to-br from-red-500 to-red-600' :
                isDueSoon ? 'bg-gradient-to-br from-yellow-500 to-orange-600' :
                'bg-gradient-to-br from-slate-600 to-slate-700'
              )}>
                <Calendar className="w-3 h-3 text-white" />
              </div>
              <span className="font-medium">{format(new Date(task.due_date), 'MMM d')}</span>
              {isOverdue && (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <AlertCircle className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Assignee */}
        {task.assignee_id && (
          <div className="flex items-center gap-2.5 text-sm text-slate-300">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <User className="w-3 h-3 text-white" />
            </div>
            <span className="font-medium">Assigned to: {task.assignee_id}</span>
          </div>
        )}
        
        {/* Created Date */}
        <div className="flex items-center gap-2.5 text-sm text-slate-400">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
            <Clock className="w-3 h-3 text-white" />
          </div>
          <span>Requested {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
        </div>
        
        {/* Approval Actions */}
        {canApprove && task.status === 'awaiting_approval' && (
          <div className="flex gap-3 pt-4 border-t border-slate-700/30">
            <button
              onClick={handleApprove}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-medium h-9 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 backdrop-blur-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={handleReject}
              className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-sm font-medium h-9 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 backdrop-blur-sm"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        )}
        
        {/* Assignment Action */}
        {canApprove && task.status === 'in_progress' && !task.assignee_id && (
          <div className="pt-4 border-t border-slate-700/30">
            <button
              onClick={handleAssign}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm font-medium h-9 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 backdrop-blur-sm"
            >
              <User className="w-4 h-4" />
              Assign Team Member
            </button>
          </div>
        )}
        
        {/* Status Info for In Progress Requests */}
        {task.status === 'in_progress' && task.assignee_id && (
          <div className="pt-4 border-t border-slate-700/30">
            <div className="flex items-center gap-2.5 text-sm text-emerald-300 bg-gradient-to-r from-emerald-500/20 to-green-500/20 px-3 py-2 rounded-lg border border-emerald-500/30 backdrop-blur-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">Approved and assigned</span>
            </div>
          </div>
        )}
        
        {/* Keep approved status handling for backward compatibility (hidden from normal workflow) */}
        {canApprove && task.status === 'approved' && !task.assignee_id && (
          <div className="pt-4 border-t border-slate-700/30">
            <button
              onClick={handleAssign}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm font-medium h-9 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95 backdrop-blur-sm"
            >
              <User className="w-4 h-4" />
              Assign Team Member
            </button>
          </div>
        )}
        
        {task.status === 'approved' && task.assignee_id && (
          <div className="pt-4 border-t border-slate-700/30">
            <div className="flex items-center gap-2.5 text-sm text-emerald-300 bg-gradient-to-r from-emerald-500/20 to-green-500/20 px-3 py-2 rounded-lg border border-emerald-500/30 backdrop-blur-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-medium">Approved and assigned</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}