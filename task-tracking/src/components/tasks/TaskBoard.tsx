"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  rectIntersection,
  pointerWithin,
  PointerSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Filter, Search, Users, LayoutGrid, Building2 } from 'lucide-react';
import { toast } from 'sonner';

import { AIPriorityToggle } from '@/components/ui/ai-priority-toggle';
import { Button } from '@/components/ui/button';
import { ConflictResolutionModal } from '@/components/ui/conflict-resolution-modal';
import { Input } from '@/components/ui/input';
import { TaskFiltersPanel, TaskFilters } from '@/components/ui/task-filters';
import supabase from '@/lib/supabaseBrowserClient';
import { AIPrioritizationService } from '@/services/ai-prioritization';
import { ConflictResolutionService } from '@/services/conflict-resolution';
import { RealtimeCollaborationService } from '@/services/realtime-collaboration';
import { Team } from '@/types/tasks';

// Import ConflictData type
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
import { 
  Task, 
  TaskStatus, 
  KanbanColumn as KanbanColumnType
} from '@/types/tasks';
import { isValidStatusTransition, validateStatusTransition, VALID_STATUS_TRANSITIONS } from '@/utils/workflow';

import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';

interface TaskBoardProps {
  tasks: Task[];
  teams?: Team[];
  onTaskClick?: (task: Task) => void;
  onTaskStatusChange?: (taskId: string, newStatus: TaskStatus, comment?: string) => void;
  onCreateTask?: () => void;
  onRequestAssistance?: () => void;
  onApproveRequest?: (taskId: string) => void;
  onRejectRequest?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  loading?: boolean;
  className?: string;
  currentUserId?: string;
  selectedTeam?: Team | null;
}

// Define the Kanban columns (approved column hidden from normal workflow)
const KANBAN_COLUMNS: KanbanColumnType[] = [
  {
    id: 'awaiting_approval',
    title: 'Awaiting Approval',
    tasks: [],
    color: 'bg-yellow-100 border-yellow-200'
  },
  // Approved column hidden from normal workflow - tasks go directly to in_progress
  // {
  //   id: 'approved',
  //   title: 'Approved',
  //   tasks: [],
  //   color: 'bg-green-100 border-green-200'
  // },
  {
    id: 'in_progress',
    title: 'In Progress',
    tasks: [],
    color: 'bg-blue-100 border-blue-200'
  },
  {
    id: 'pending_review',
    title: 'Pending Review',
    tasks: [],
    color: 'bg-purple-100 border-purple-200'
  },
  {
    id: 'done',
    title: 'Done',
    tasks: [],
    color: 'bg-emerald-100 border-emerald-200'
  }
];



export const TaskBoard = React.memo(function TaskBoard({
  tasks,
  teams = [],
  onTaskClick,
  onTaskStatusChange,
  onCreateTask,
  onRequestAssistance,
  onApproveRequest,
  onRejectRequest,
  onDeleteTask,
  loading = false,
  className = '',
  currentUserId,
  selectedTeam
}: TaskBoardProps) {
  const [realtimeService] = useState(() => RealtimeCollaborationService.getInstance());
  const [conflictService] = useState(() => ConflictResolutionService.getInstance());
  const [aiService] = useState(() => AIPrioritizationService.getInstance());
  const [activeTaskUsers, setActiveTaskUsers] = useState<Record<string, string[]>>({});
  const [currentConflict, setCurrentConflict] = useState<ConflictData | null>(null);
  const [aiPriorityEnabled, setAiPriorityEnabled] = useState(true);
  const [isRecalculatingPriority, setIsRecalculatingPriority] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Ref to store current tasks to avoid stale closures
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  // Initialize real-time collaboration
  useEffect(() => {
    if (currentUserId && selectedTeam) {
      // First connect to the service with user credentials, then join the team
      const initializeRealtime = async () => {
        try {
          // Get user profile for the userName
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', currentUserId)
            .single();

          const userName = profile?.full_name || user.email?.split('@')[0] || 'User';

          // Connect to realtime service with user credentials
          await realtimeService.connect(selectedTeam.id, currentUserId, userName);
          
          // Then join the team
          await realtimeService.joinTeam(selectedTeam.id);
        } catch (error) {
          console.error('Failed to initialize realtime collaboration:', error);
        }
      };

      initializeRealtime();
      
      // Subscribe to presence updates
      const unsubscribe = realtimeService.onPresenceUpdate((presence) => {
        const taskUsers: Record<string, string[]> = {};
        Object.entries(presence).forEach(([userId, data]) => {
          if (data && typeof data === 'object' && 'taskId' in data && data.taskId) {
            if (!taskUsers[data.taskId as string]) {
              taskUsers[data.taskId as string] = [];
            }
            taskUsers[data.taskId as string].push(userId);
          }
        });
        setActiveTaskUsers(taskUsers);
      });
      
      // Subscribe to conflict events
      const unsubscribeConflicts = conflictService.onConflict((conflict) => {
        setCurrentConflict(conflict);
      });
      
      return () => {
        unsubscribe();
        unsubscribeConflicts();
        realtimeService.leaveTeam();
      };
    }
  }, [currentUserId, selectedTeam, realtimeService, conflictService]);

  // Memoize expensive calculations

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    
    // Apply team filter first
    if (selectedTeam) {
      result = result.filter(task => {
        // Include tasks that belong to this team
        if (task.team_id === selectedTeam.id) {
          // For assistance requests, check if this is actually a request from another team
          if (task.is_request && task.description_json && 
              typeof task.description_json === 'object' && 
              task.description_json._metadata &&
              typeof task.description_json._metadata === 'object' &&
              task.description_json._metadata.is_assistance_request) {
            // This is an assistance request targeted to this team
            return true;
          }
          // Regular task belonging to this team
          if (!task.is_request) return true;
        }
        
        return false;
      });
    }
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description_json && 
          JSON.stringify(task.description_json).toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply status filter
    if (filters.status?.length) {
      result = result.filter(task => filters.status!.includes(task.status));
    }
    

    
    // Apply assignee filter
    if (filters.assignee?.length) {
      result = result.filter(task => 
        task.assignee_id && filters.assignee!.includes(task.assignee_id)
      );
    }
    
    // Apply team filter
    if (filters.team?.length) {
      result = result.filter(task => 
        task.team_id && filters.team!.includes(task.team_id)
      );
    }
    
    // Apply request type filter
    if (filters.isRequest !== undefined) {
      result = result.filter(task => task.is_request === filters.isRequest);
    }
    
    // Apply sorting
    if (filters.sortBy) {
      result.sort((a, b) => {
        // AI Priority sorting takes precedence when enabled
        if (aiPriorityEnabled && filters.sortBy === 'created_at' && a.priority_score !== undefined && b.priority_score !== undefined) {
          return b.priority_score - a.priority_score; // Higher priority first
        }
        
        let aValue: string | Date | number, bValue: string | Date | number;
        
        switch (filters.sortBy) {
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case 'created_at':
            aValue = new Date(a.created_at);
            bValue = new Date(b.created_at);
            break;
          case 'due_date':
            aValue = a.due_date ? new Date(a.due_date) : new Date(0);
            bValue = b.due_date ? new Date(b.due_date) : new Date(0);
            break;

          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          default:
            return 0;
        }
        
        if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [tasks, searchTerm, filters, selectedTeam, aiPriorityEnabled]);

  // Memoize column data to prevent unnecessary re-renders
  const columns = useMemo(() => {
    return KANBAN_COLUMNS.map(column => {
      let columnTasks = filteredTasks.filter(task => task.status === column.id);
      
      // Handle approved tasks - show them in in_progress column for backward compatibility
      if (column.id === 'in_progress') {
        const approvedTasks = filteredTasks.filter(task => task.status === 'approved');
        columnTasks = [...columnTasks, ...approvedTasks];
      }
      
      return {
        ...column,
        tasks: columnTasks
      };
    });
  }, [filteredTasks]);



  // Task status change handler - must be declared before drag handlers
  const handleTaskStatusChange = useCallback((taskId: string, newStatus: string, comment?: string) => {
    console.log('🔧 [TaskBoard] handleTaskStatusChange called:', { taskId, newStatus, comment });
    console.log('🔧 [TaskBoard] onTaskStatusChange prop:', !!onTaskStatusChange);
    
    // Broadcast task status change in real-time
    if (currentUserId && selectedTeam) {
      // Use current tasks from ref to avoid stale closure
      const task = tasksRef.current.find(t => t.id === taskId);
      if (task) {
        console.log('📡 [TaskBoard] Broadcasting task movement');
        realtimeService.broadcastTaskMovement({
          taskId,
          task,
          fromStatus: task.status,
          toStatus: newStatus as TaskStatus
        });
      }
    }
    
    console.log('🚀 [TaskBoard] Calling parent onTaskStatusChange');
    onTaskStatusChange?.(taskId, newStatus as TaskStatus, comment);
    console.log('✅ [TaskBoard] Parent onTaskStatusChange called');
  }, [currentUserId, selectedTeam, realtimeService, onTaskStatusChange]);

  // Optimized sensors for smooth drag performance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Reduced distance for better responsiveness
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 3, // Same distance for consistency
      },
    })
  );

  // Simplified collision detection for better reliability
  const customCollisionDetection = useCallback((args: any) => {
    // Use rectangle intersection as primary method - more reliable for drop zones
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      console.log('📦 Rectangle collision found:', rectCollisions.map((c: any) => c.id));
      return rectCollisions;
    }

    // Fallback to pointer detection
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      console.log('👆 Pointer collision found:', pointerCollisions.map((c: any) => c.id));
      return pointerCollisions;
    }

    // Final fallback to closest corners
    const cornerCollisions = closestCorners(args);
    if (cornerCollisions.length > 0) {
      console.log('📐 Corner collision found:', cornerCollisions.map((c: any) => c.id));
    }
    return cornerCollisions;
  }, []);

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    console.log('🚀 Drag started:', event.active.id);
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    console.log('🔄 Drag over:', event.over?.id);
    // This handler helps ensure proper drop zone detection
    // The isOver state in useDroppable should be triggered automatically
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    console.log('🎯 Drag end event:', event);
    
    const { active, over } = event;
    console.log('🎯 Active item:', active);
    console.log('🎯 Over target:', over);
    console.log('🎯 Event details:', {
      activeId: event.active?.id,
      overId: event.over?.id,
      activeDraggableId: event.active?.data?.current?.sortable?.containerId,
      overDroppableId: event.over?.data?.current?.sortable?.containerId || event.over?.id
    });
    
    setActiveId(null);

    if (!over) {
      console.log('❌ No drop target found - over is null/undefined');
      return;
    }
    
    console.log('✅ Drop target found:', over.id);

    const taskId = active.id as string;
    const newStatus = over.id as string;
    
    console.log('🔄 Processing drop:', { taskId, newStatus });
    
    // Find the task being moved using ref to avoid stale closure
    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task) {
      console.log('❌ Task not found:', taskId);
      return;
    }
    
    console.log('📋 Task found:', { 
      taskId: task.id, 
      currentStatus: task.status, 
      newStatus,
      hasAssignee: !!task.assignee_id,
      assigneeId: task.assignee_id 
    });

    // Check if status actually changed
    if (task.status === newStatus) {
      console.log('⚠️ Status unchanged, skipping update');
      return;
    }

    // For drag and drop, we'll be more permissive with validation
    // Only check basic transition validity, not role/comment requirements
    if (!isValidStatusTransition(task.status, newStatus as TaskStatus)) {
      console.log('❌ Invalid status transition:', { from: task.status, to: newStatus });
      console.log('❌ Valid transitions for', task.status, ':', VALID_STATUS_TRANSITIONS[task.status as TaskStatus]);
      toast.error(`Cannot move task from ${task.status} to ${newStatus}`);
      return;
    }
    
    console.log('✅ Status transition valid:', { from: task.status, to: newStatus });

    // For transitions that normally require comments or special permissions,
    // we'll allow them via drag and drop but show a warning
    const validation = validateStatusTransition(task.status, newStatus as TaskStatus, {
      userRole: 'admin', // Assume admin role for drag and drop
      hasAssignee: !!task.assignee_id
    });

    if (!validation.valid && validation.reason?.includes('comment')) {
      // Allow the transition but show a warning for comment requirements
      toast.warning(`Task moved to ${newStatus}. Consider adding a comment to explain the change.`);
    } else if (!validation.valid && validation.reason?.includes('assignee')) {
      toast.warning(`Task moved to ${newStatus}. Consider assigning someone to this task.`);
    } else if (!validation.valid) {
      // For other validation failures, still allow but warn
      toast.warning(`Task moved to ${newStatus}. ${validation.reason}`);
    }

    // Update the task status
    console.log('🚀 Calling handleTaskStatusChange:', { taskId, newStatus });
    handleTaskStatusChange(taskId, newStatus);
    console.log('✅ handleDragEnd completed successfully');
  }, [handleTaskStatusChange]);

  // AI Priority functions
  const handleRecalculatePriority = useCallback(async () => {
    if (!selectedTeam || !currentUserId) return;
    
    setIsRecalculatingPriority(true);
    try {
      // Recalculate priorities for all team tasks
      const teamTasks = filteredTasks.filter(task => task.team_id === selectedTeam.id);
      for (const task of teamTasks) {
        await aiService.calculateTaskPriority(task);
      }
      
      // Show success message instead of reloading
      toast.success('AI priorities recalculated successfully');
      
      // Note: In a production environment, you would want to:
      // 1. Update the task priorities in the database
      // 2. Refetch the tasks from the parent component
      // 3. Or use a state management solution to update the local state
      // For now, we'll avoid the page reload to prevent disrupting drag and drop
      
    } catch (error) {
      console.error('Failed to recalculate priorities:', error);
      toast.error('Failed to recalculate priorities');
    } finally {
      setIsRecalculatingPriority(false);
    }
  }, [selectedTeam, currentUserId, filteredTasks, aiService]);

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Task Board</h2>
          <div className="animate-pulse bg-slate-700 h-10 w-32 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-slate-700 h-64 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden ${className}`}>
      {/* Advanced Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900/50 to-purple-900/20" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-slate-900/80 to-transparent" />
      
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `
          linear-gradient(rgba(148, 163, 184, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }} />
      
      {/* Organic Noise Texture */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http:%2F%2Fwww.w3.org%2F2000%2Fsvg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'%2F%3E%3C%2Ffilter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'%2F%3E%3C%2Fsvg%3E")`
      }} />
      
      {/* Floating Ambient Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(16)].map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full animate-pulse ${
              i % 4 === 0 ? 'w-1 h-1 bg-blue-400/30' :
              i % 4 === 1 ? 'w-0.5 h-0.5 bg-purple-400/25' :
              i % 4 === 2 ? 'w-1.5 h-1.5 bg-emerald-400/20' :
              'w-0.5 h-0.5 bg-amber-400/25'
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>
      
      {/* Depth Layers */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-transparent to-slate-950/40" />
      
      {/* Enhanced Header with Advanced Glassmorphism */}
      <div className="sticky top-0 z-20 backdrop-blur-2xl bg-slate-900/90 border-b border-slate-700/50 shadow-2xl shadow-black/50">
        {/* Subtle Header Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5" />
        
        <div className="relative p-6">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/40 transform group-hover:scale-110 transition-all duration-300">
                    <LayoutGrid className="w-6 h-6 text-white drop-shadow-lg" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    {selectedTeam && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-300">{selectedTeam.name}</span>
                      </div>
                    )}
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent drop-shadow-2xl">
                      {selectedTeam ? `${selectedTeam.name} Kanban` : 'All Teams Kanban'}
                    </h1>
                  </div>
                  <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    {filteredTasks.length} active tasks across {KANBAN_COLUMNS.length} stages
                    {selectedTeam && (
                      <span className="ml-2 text-blue-400">• {selectedTeam.name} Board</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* AI Priority Toggle */}
              <AIPriorityToggle
                enabled={aiPriorityEnabled}
                onToggle={setAiPriorityEnabled}
                onRecalculate={handleRecalculatePriority}
                isRecalculating={isRecalculatingPriority}
              />
              
              {/* Enhanced Search */}
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-400 transition-colors" />
                <Input
                  placeholder="Search across all tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 w-80 bg-slate-800/60 backdrop-blur-sm border-slate-600/50 text-white placeholder-slate-400 rounded-xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              
              {/* Modern Filter Toggle */}
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowFilters(!showFilters)}
                className={`group px-6 py-3 rounded-xl backdrop-blur-sm transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                  showFilters 
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-lg shadow-blue-500/20 scale-105' 
                    : 'bg-slate-800/60 border-slate-600/50 text-slate-300 hover:bg-slate-700/60 hover:border-slate-500/50 hover:shadow-lg'
                }`}
              >
                <Filter className={`w-5 h-5 mr-2 transition-transform duration-300 ${
                  showFilters ? 'rotate-180' : 'group-hover:rotate-12'
                }`} />
                Filters
              </Button>
              
              {/* Enhanced Create Task */}
              {onCreateTask && (
                <Button 
                  onClick={onCreateTask} 
                  className="group px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 transform hover:scale-105 active:scale-95 hover:-translate-y-0.5"
                >
                  <Plus className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:rotate-90" />
                  Create Task
                </Button>
              )}
              
              {/* Enhanced Request Assistance */}
              {onRequestAssistance && (
                <Button 
                  onClick={onRequestAssistance} 
                  variant="outline"
                  className="group px-6 py-3 rounded-xl bg-slate-800/60 backdrop-blur-sm border-slate-600/50 text-slate-300 hover:bg-slate-700/60 hover:border-slate-500/50 transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-lg"
                >
                  <Users className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:scale-110" />
                  Request Help
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Resolution Modal */}
       {currentConflict && (
         <ConflictResolutionModal
           conflict={currentConflict}
           onResolve={async (resolution, selectedStatus) => {
             try {
               await conflictService.resolveConflict(currentConflict.id, resolution, selectedStatus);
               setCurrentConflict(null);
               // Refresh tasks after conflict resolution
               window.location.reload();
             } catch (error) {
               console.error('Failed to resolve conflict:', error);
             }
           }}
           onClose={() => setCurrentConflict(null)}
           currentUserId={currentUserId}
         />
       )}

      {/* Enhanced Filters Panel */}
      {showFilters && (
        <div className="mx-6 mb-6 animate-in slide-in-from-top-4 duration-300">
          <div className="backdrop-blur-xl bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-2xl transform transition-all duration-300 hover:shadow-3xl hover:bg-slate-800/50">
            <TaskFiltersPanel
              filters={filters}
              onFiltersChange={setFilters}
              availableAssignees={[
                ...new Map(
                  tasks
                    .filter(task => task.assignee_profile)
                    .map(task => [task.assignee_id, {
                      id: task.assignee_id!,
                      name: task.assignee_profile!.full_name || 'Unknown User'
                    }])
                ).values()
              ]}
              availableTeams={[
                ...new Map(
                  tasks
                    .filter(task => task.team)
                    .map(task => [task.team_id, {
                      id: task.team_id!,
                      name: task.team!.name
                    }])
                ).values()
              ]}
              className=""
            />
          </div>
        </div>
      )}




      {/* Enhanced Kanban Board with Advanced Depth */}
      <div className="relative px-6 pb-8">
        {/* Board Background with Depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800/20 via-transparent to-slate-900/20 rounded-3xl" />
        
        {/* Kanban Board with drag and drop functionality */}
        <DndContext
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 min-h-[700px] mx-4 mt-6">
          {columns.map((column, index) => (
            <div key={column.id} className="relative">
              {/* Column Shadow Layer */}
              <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/40 rounded-3xl blur-xl transform translate-y-2 translate-x-1 opacity-60" />
              
              {/* Column Container with Advanced Depth */}
              <div className="relative">
                {/* Enhanced Column Header with Premium Design */}
                <div className="mb-6">
                  <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl border shadow-2xl">
                    {/* Enhanced Multi-layer Background with Better Colors */}
                    <div className={`absolute inset-0 bg-gradient-to-br opacity-95 ${
                      index === 0 ? 'from-amber-500/20 via-orange-600/30 to-yellow-700/25' :
                      index === 1 ? 'from-blue-500/20 via-cyan-600/30 to-teal-700/25' :
                        index === 2 ? 'from-purple-500/20 via-violet-600/30 to-indigo-700/25' :
                        index === 3 ? 'from-emerald-500/20 via-green-600/30 to-teal-700/25' :
                        'from-emerald-500/20 via-green-600/30 to-teal-700/25'
                      }`} />
                      
                      {/* Glass Effect Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-white/5 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10" />
                      
                      {/* Enhanced Border with Glow */}
                      <div className="absolute inset-0 rounded-2xl border border-white/20 shadow-2xl" />
                      

                      
                      <div className="relative p-6">
                        {/* Enhanced Metric Card Style Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="relative">
                            {/* Glowing Dot with Pulse Animation */}
                            <div className={`absolute inset-0 rounded-full blur-sm opacity-60 ${
                              index === 0 ? 'bg-amber-400' :
                              index === 1 ? 'bg-blue-400' :
                              index === 2 ? 'bg-purple-400' :
                              index === 3 ? 'bg-emerald-400' :
                              'bg-emerald-400'
                            }`} />
                            <div className={`relative w-4 h-4 rounded-full shadow-lg animate-pulse ${
                              index === 0 ? 'bg-gradient-to-br from-amber-300 to-amber-500 shadow-amber-400/50' :
                              index === 1 ? 'bg-gradient-to-br from-blue-300 to-blue-500 shadow-blue-400/50' :
                              index === 2 ? 'bg-gradient-to-br from-purple-300 to-purple-500 shadow-purple-400/50' :
                              index === 3 ? 'bg-gradient-to-br from-emerald-300 to-emerald-500 shadow-emerald-400/50' :
                              'bg-gradient-to-br from-emerald-300 to-emerald-500 shadow-emerald-400/50'
                            }`} />
                          </div>
                          
                          {/* Enhanced Task Counter */}
                          <div className="relative">
                            <span className="text-3xl font-bold bg-gradient-to-br from-white to-slate-200 bg-clip-text text-transparent drop-shadow-lg">
                              {column.tasks.length}
                            </span>
                            {/* Subtle background glow for number */}
                            <div className={`absolute inset-0 blur-xl opacity-20 ${
                              index === 0 ? 'text-amber-400' :
                              index === 1 ? 'text-blue-400' :
                              index === 2 ? 'text-purple-400' :
                              index === 3 ? 'text-emerald-400' :
                              'text-emerald-400'
                            }`}>
                              {column.tasks.length}
                            </div>
                          </div>
                        </div>
                        
                        {/* Enhanced Title */}
                        <h3 className="text-sm font-semibold text-slate-200 tracking-wide uppercase opacity-90">
                          {column.title}
                        </h3>
                        

                      </div>
                    </div>
                  </div>

                  {/* Enhanced Column Content with Depth */}
                  <div className="relative">
                    {/* Column Content Shadow */}
                    <div className="absolute inset-0 bg-black/20 rounded-3xl blur-xl transform translate-y-1" />
                    
                    <div className="relative min-h-[600px] rounded-3xl backdrop-blur-xl border border-slate-700/30 shadow-2xl overflow-hidden">
                      {/* Content Background Layers */}
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 via-slate-900/60 to-slate-800/40" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />
                      
                      <div className="relative p-4">
                        <KanbanColumn
                          column={column}
                          teams={teams}
                          onTaskClick={onTaskClick}
                          onTaskStatusChange={handleTaskStatusChange}
                          onApproveRequest={onApproveRequest}
                          onRejectRequest={onRejectRequest}
                          onDeleteTask={onDeleteTask}
                          currentUserId={currentUserId}
                          activeTaskUsers={activeTaskUsers}
                          aiPriorityEnabled={aiPriorityEnabled}
                          activeId={activeId}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Enhanced Custom Drag Overlay */}
          <DragOverlay
            dropAnimation={{
              duration: 300,
              easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}
          >
            {activeId ? (
              <div className="transform rotate-3 scale-105 opacity-95 transition-all duration-200 ease-out">
                <div className="relative">
                  {/* Enhanced glow effect */}
                  <div className="absolute inset-0 bg-blue-500/30 rounded-xl blur-xl scale-110" />
                  <div className="absolute inset-0 bg-purple-500/20 rounded-xl blur-2xl scale-125" />
                  
                  <TaskCard
                    task={tasks.find(task => task.id === activeId)!}
                    teams={teams}
                    isDragging={true}
                    className="relative z-10 shadow-2xl shadow-blue-500/50 ring-2 ring-blue-400/80 bg-gradient-to-br from-slate-700/98 via-slate-800/95 to-slate-900/98 backdrop-blur-sm border border-blue-400/30"
                  />
                  
                  {/* Trailing effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-xl animate-pulse" />
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modern Empty State */}
      {filteredTasks.length === 0 && (
        <div className="px-6 pb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/60 via-slate-800/40 to-slate-900/60 backdrop-blur-xl border border-slate-700/50 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
            <div className="relative flex flex-col items-center justify-center py-20 px-8">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-8 shadow-2xl">
                <LayoutGrid className="w-12 h-12 text-blue-400" />
              </div>
              
              <div className="text-center max-w-md">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-3">
                  {searchTerm ? 'No matching tasks found' : 'Ready to get organized?'}
                </h3>
                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                  {searchTerm 
                    ? 'Try adjusting your search terms or filters to find what you\'re looking for.' 
                    : 'Create your first task and start building something amazing. Your productivity journey begins here.'
                  }
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {!searchTerm && onCreateTask && (
                    <Button 
                      onClick={onCreateTask} 
                      className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 transform hover:scale-105"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create Your First Task
                    </Button>
                  )}
                  
                  {searchTerm && (
                    <Button 
                      onClick={() => setSearchTerm('')}
                      variant="outline"
                      className="px-8 py-4 rounded-xl bg-slate-800/60 backdrop-blur-sm border-slate-600/50 text-slate-300 hover:bg-slate-700/60 hover:border-slate-500/50 transition-all duration-200"
                    >
                      Clear Search
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default TaskBoard;