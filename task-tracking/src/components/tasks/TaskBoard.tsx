"use client";

import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { TaskCard } from './TaskCard';
import { KanbanColumn } from './KanbanColumn';
import { 
  Task, 
  TaskStatus, 
  KanbanColumn as KanbanColumnType,
  TASK_STATUS_TRANSITIONS 
} from '@/types/tasks';
import { Plus, Filter, Search, Users, LayoutGrid, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TaskFiltersPanel, TaskFilters } from '@/components/ui/task-filters';
import { Team } from '@/types/tasks';

interface TaskBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onCreateTask?: () => void;
  onRequestAssistance?: () => void;
  onApproveRequest?: (taskId: string) => void;
  onRejectRequest?: (taskId: string) => void;
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



export function TaskBoard({
  tasks,
  onTaskClick,
  onTaskStatusChange,
  onCreateTask,
  onRequestAssistance,
  onApproveRequest,
  onRejectRequest,
  loading = false,
  className = '',
  currentUserId,
  selectedTeam
}: TaskBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    
    // Apply team filter first
    if (selectedTeam) {
      result = result.filter(task => task.team_id === selectedTeam.id);
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
  }, [tasks, searchTerm, filters, selectedTeam]);

  // Organize tasks into columns
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



  const handleDragStart = (event: DragStartEvent) => {
    const task = filteredTasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    
    const task = filteredTasks.find(t => t.id === taskId);
    if (!task) return;

    // Check if status transition is valid
    const allowedTransitions = TASK_STATUS_TRANSITIONS[task.status];
    if (!allowedTransitions.includes(newStatus)) {
      console.warn(`Invalid transition from ${task.status} to ${newStatus}`);
      return;
    }

    // Only update if status actually changed
    if (task.status !== newStatus) {
      onTaskStatusChange?.(taskId, newStatus);
    }
  };

  const handleTaskStatusChange = (taskId: string, newStatus: string) => {
    onTaskStatusChange?.(taskId, newStatus as TaskStatus);
  };

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
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")`
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
      <div className="sticky top-0 z-50 backdrop-blur-2xl bg-slate-900/90 border-b border-slate-700/50 shadow-2xl shadow-black/50">
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
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
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
                          onTaskClick={onTaskClick}
                          onTaskStatusChange={handleTaskStatusChange}
                          onApproveRequest={onApproveRequest}
                          onRejectRequest={onRejectRequest}
                          currentUserId={currentUserId}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Premium Drag Overlay with Advanced Effects */}
          <DragOverlay>
            {activeTask ? (
              <div className="relative transform rotate-6 scale-125 transition-all duration-300">
                {/* Drag Shadow */}
                <div className="absolute inset-0 bg-black/40 rounded-2xl transform translate-y-4 translate-x-2" />
                
                {/* Glowing Aura */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-purple-500/20 to-cyan-500/30 rounded-2xl animate-pulse" />
                
                {/* Task Card */}
                <div className="relative">
                  <TaskCard
                    task={activeTask}
                    isDragging
                    className="shadow-2xl shadow-blue-500/50 border-2 border-blue-400/60 bg-slate-800/90"
                  />
                </div>
                
                {/* Floating Particles */}
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-blue-400 rounded-full animate-ping"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '0.8s'
                      }}
                    />
                  ))}
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
}

export default TaskBoard;