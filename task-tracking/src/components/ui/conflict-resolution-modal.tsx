"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Users, Clock, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { Task, TaskStatus, TASK_STATUS_LABELS } from '@/types/tasks';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ConflictData {
  id: string;
  taskId: string;
  task: Task;
  conflicts: {
    userId: string;
    userName: string;
    fromStatus: TaskStatus;
    toStatus: TaskStatus;
    timestamp: number;
  }[];
  timestamp: number;
}

interface ConflictResolutionModalProps {
  conflict: ConflictData;
  onResolve: (resolution: 'accept' | 'reject' | 'merge', selectedStatus?: TaskStatus) => void;
  onClose: () => void;
  currentUserId?: string;
}

export function ConflictResolutionModal({
  conflict,
  onResolve,
  onClose,
  currentUserId
}: ConflictResolutionModalProps) {
  const [selectedResolution, setSelectedResolution] = useState<TaskStatus | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = async (action: 'accept' | 'reject' | 'merge') => {
    setIsResolving(true);
    try {
      if (action === 'merge' && selectedResolution) {
        onResolve(action, selectedResolution);
      } else {
        onResolve(action);
      }
    } finally {
      setIsResolving(false);
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    const colors = {
      awaiting_approval: 'bg-yellow-500',
      approved: 'bg-green-500',
      in_progress: 'bg-blue-500',
      pending_review: 'bg-purple-500',
      rework: 'bg-orange-500',
      done: 'bg-emerald-500',
      blocked: 'bg-red-500',
      on_hold: 'bg-gray-500',
      cancelled: 'bg-slate-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border-b border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Task Movement Conflict</h2>
          </div>
          <p className="text-slate-300 text-sm">
            Multiple users attempted to move this task simultaneously. Please resolve the conflict.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Task Info */}
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <h3 className="font-semibold text-white mb-2">{conflict.task.title}</h3>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Current Status:</span>
              <Badge className={cn('text-white', getStatusColor(conflict.task.status))}>
                {TASK_STATUS_LABELS[conflict.task.status]}
              </Badge>
            </div>
          </div>

          {/* Conflicts */}
          <div className="space-y-4">
            <h4 className="font-medium text-white flex items-center gap-2">
              <Users className="w-4 h-4" />
              Conflicting Movements ({conflict.conflicts.length})
            </h4>
            
            {conflict.conflicts.map((conflictItem, index) => (
              <div key={index} className="bg-slate-900/30 rounded-lg p-4 border border-slate-600/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {conflictItem.userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{conflictItem.userName}</span>
                    {conflictItem.userId === currentUserId && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    {format(new Date(conflictItem.timestamp), 'HH:mm:ss')}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge className={cn('text-white text-xs', getStatusColor(conflictItem.fromStatus))}>
                    {TASK_STATUS_LABELS[conflictItem.fromStatus]}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <Badge className={cn('text-white text-xs', getStatusColor(conflictItem.toStatus))}>
                    {TASK_STATUS_LABELS[conflictItem.toStatus]}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Resolution Options */}
          <div className="space-y-4">
            <h4 className="font-medium text-white">Resolution Options</h4>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleResolve('accept')}
                disabled={isResolving}
                className="flex items-center gap-2 border-green-500/50 text-green-300 hover:bg-green-500/20"
              >
                <CheckCircle className="w-4 h-4" />
                Accept Latest Change
              </Button>
              
              <Button
                variant="outline"
                onClick={() => handleResolve('reject')}
                disabled={isResolving}
                className="flex items-center gap-2 border-red-500/50 text-red-300 hover:bg-red-500/20"
              >
                <XCircle className="w-4 h-4" />
                Reject All Changes
              </Button>
            </div>

            {/* Custom Resolution */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">Or choose a specific status:</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(TASK_STATUS_LABELS).map(([status, label]) => (
                  <button
                    key={status}
                    onClick={() => setSelectedResolution(status as TaskStatus)}
                    className={cn(
                      'p-2 rounded-lg border text-xs font-medium transition-all duration-200',
                      selectedResolution === status
                        ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                        : 'border-slate-600 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              
              {selectedResolution && (
                <Button
                  onClick={() => handleResolve('merge')}
                  disabled={isResolving}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                >
                  Apply Selected Status
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isResolving}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConflictResolutionModal;