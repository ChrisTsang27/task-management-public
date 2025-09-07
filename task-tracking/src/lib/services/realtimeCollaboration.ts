import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Task } from '@/types/tasks';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface UserPresence {
  user_id: string;
  user_name: string;
  avatar_url?: string;
  cursor_position?: { x: number; y: number };
  active_task_id?: string;
  last_seen: string;
  status: 'online' | 'away' | 'offline';
}

export interface TaskMovement {
  task_id: string;
  from_status: string;
  to_status: string;
  moved_by: string;
  moved_at: string;
  conflict_resolution?: 'auto' | 'manual' | 'pending';
}

interface DatabaseChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Task;
  old?: Task;
}

interface TaskDragPayload {
  task_id: string;
  from_status: string;
  to_status: string;
  user_id: string;
  preview: boolean;
}

interface ConflictResolutionPayload {
  task_id: string;
  resolution: string;
  resolved_by: string;
}

export interface CollaborationEvent {
  type: 'task_moved' | 'task_updated' | 'user_joined' | 'user_left' | 'cursor_moved' | 'conflict_detected';
  data: unknown;
  user_id: string;
  timestamp: string;
}

export class RealtimeCollaborationService {
  private channel: RealtimeChannel | null = null;
  private teamId: string | null = null;
  private userId: string | null = null;
  private userName: string | null = null;
  private presenceUsers: Map<string, UserPresence> = new Map();
  private eventHandlers: Map<string, ((data: unknown) => void)[]> = new Map();
  private conflictQueue: TaskMovement[] = [];

  /**
   * Initialize real-time collaboration for a team
   */
  async initialize(teamId: string, userId: string, userName: string): Promise<void> {
    this.teamId = teamId;
    this.userId = userId;
    this.userName = userName;

    // Create a channel for the team
    this.channel = supabase.channel(`team:${teamId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Set up presence tracking
    this.setupPresenceTracking();

    // Set up database change listeners
    this.setupDatabaseListeners();

    // Set up broadcast listeners
    this.setupBroadcastListeners();

    // Subscribe to the channel
    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track user presence
        await this.updatePresence({
          user_id: userId,
          user_name: userName,
          status: 'online',
          last_seen: new Date().toISOString()
        });

        this.emit('connected', { teamId, userId });
      }
    });
  }

  /**
   * Set up presence tracking for live user indicators
   */
  private setupPresenceTracking(): void {
    if (!this.channel) return;

    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel!.presenceState();
      this.presenceUsers.clear();
      
      Object.keys(state).forEach(userId => {
        const presence = state[userId][0] as unknown as UserPresence;
        this.presenceUsers.set(userId, presence);
      });

      this.emit('presence_updated', Array.from(this.presenceUsers.values()));
    });

    this.channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      const user = newPresences[0] as unknown as UserPresence;
      this.presenceUsers.set(key, user);
      this.emit('user_joined', user);
    });

    this.channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      const user = leftPresences[0] as unknown as UserPresence;
      this.presenceUsers.delete(key);
      this.emit('user_left', user);
    });
  }

  /**
   * Set up database change listeners for real-time task updates
   */
  private setupDatabaseListeners(): void {
    if (!this.channel || !this.teamId) return;

    // Listen for task changes
    this.channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `team_id=eq.${this.teamId}`
      },
      (payload) => {
        this.handleTaskChange({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as Task | undefined,
          old: payload.old as Task | undefined
        });
      }
    );
  }

  /**
   * Set up broadcast listeners for custom events
   */
  private setupBroadcastListeners(): void {
    if (!this.channel) return;

    // Listen for cursor movements
    this.channel.on('broadcast', { event: 'cursor_move' }, (payload) => {
      this.emit('cursor_moved', payload);
    });

    // Listen for task drag events
    this.channel.on('broadcast', { event: 'task_drag' }, (payload) => {
      this.handleTaskDrag(payload.payload as TaskDragPayload);
    });

    // Listen for conflict resolution
    this.channel.on('broadcast', { event: 'conflict_resolution' }, (payload) => {
      this.handleConflictResolution(payload.payload as ConflictResolutionPayload);
    });
  }

  /**
   * Handle database task changes
   */
  private handleTaskChange(payload: DatabaseChangePayload): void {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        this.emit('task_created', newRecord);
        break;
      case 'UPDATE':
        if (newRecord && oldRecord) {
          this.handleTaskUpdate(newRecord, oldRecord);
        }
        break;
      case 'DELETE':
        this.emit('task_deleted', oldRecord);
        break;
    }
  }

  /**
   * Handle task updates and detect conflicts
   */
  private handleTaskUpdate(newTask: Task, oldTask: Task): void {
    // Check if status changed (task moved)
    if (newTask.status !== oldTask.status) {
      const movement: TaskMovement = {
        task_id: newTask.id,
        from_status: oldTask.status,
        to_status: newTask.status,
        moved_by: newTask.updated_at > oldTask.updated_at ? 'database' : 'unknown',
        moved_at: newTask.updated_at
      };

      // Check for conflicts
      const conflict = this.detectConflict(movement);
      if (conflict) {
        this.handleConflict(movement, conflict);
      } else {
        this.emit('task_moved', movement);
      }
    }

    // Check for AI priority updates
    if (newTask.priority_score !== oldTask.priority_score) {
      this.emit('priority_updated', {
        task_id: newTask.id,
        old_score: oldTask.priority_score,
        new_score: newTask.priority_score,
        ai_insights: newTask.ai_insights
      });
    }

    this.emit('task_updated', { newTask, oldTask });
  }

  /**
   * Handle task drag events for live preview
   */
  private handleTaskDrag(payload: TaskDragPayload): void {
    const { task_id, from_status, to_status, user_id, preview } = payload;
    
    if (user_id !== this.userId) {
      this.emit('task_drag_preview', {
        task_id,
        from_status,
        to_status,
        user_id,
        preview
      });
    }
  }

  /**
   * Detect potential conflicts in task movements
   */
  private detectConflict(movement: TaskMovement): TaskMovement | null {
    // Check if there's a recent movement of the same task
    const recentConflict = this.conflictQueue.find(m => 
      m.task_id === movement.task_id &&
      new Date(movement.moved_at).getTime() - new Date(m.moved_at).getTime() < 5000 // 5 seconds
    );

    return recentConflict || null;
  }

  /**
   * Handle conflicts between simultaneous task movements
   */
  private handleConflict(movement: TaskMovement, conflict: TaskMovement): void {
    this.conflictQueue.push(movement);
    
    this.emit('conflict_detected', {
      current_movement: movement,
      conflicting_movement: conflict,
      resolution_needed: true
    });

    // Auto-resolve based on timestamp (last writer wins)
    setTimeout(() => {
      this.autoResolveConflict(movement, conflict);
    }, 2000);
  }

  /**
   * Auto-resolve conflicts using last-writer-wins strategy
   */
  private autoResolveConflict(movement: TaskMovement, conflict: TaskMovement): void {
    const winner = new Date(movement.moved_at) > new Date(conflict.moved_at) ? movement : conflict;
    
    this.emit('conflict_resolved', {
      winner,
      resolution_type: 'auto',
      resolved_at: new Date().toISOString()
    });

    // Remove from conflict queue
    this.conflictQueue = this.conflictQueue.filter(m => 
      m.task_id !== movement.task_id
    );
  }

  /**
   * Handle manual conflict resolution
   */
  private handleConflictResolution(payload: ConflictResolutionPayload): void {
    const { task_id, resolution, resolved_by } = payload;
    
    this.conflictQueue = this.conflictQueue.filter(m => m.task_id !== task_id);
    
    this.emit('conflict_resolved', {
      task_id,
      resolution,
      resolved_by,
      resolution_type: 'manual',
      resolved_at: new Date().toISOString()
    });
  }

  /**
   * Update user presence
   */
  async updatePresence(presence: Partial<UserPresence>): Promise<void> {
    if (!this.channel || !this.userId) return;

    const currentPresence = this.presenceUsers.get(this.userId) || {
      user_id: this.userId!,
      user_name: this.userName!,
      status: 'online',
      last_seen: new Date().toISOString()
    };

    const updatedPresence = { ...currentPresence, ...presence };
    
    await this.channel.track(updatedPresence);
    this.presenceUsers.set(this.userId, updatedPresence);
  }

  /**
   * Broadcast cursor movement
   */
  async broadcastCursorMove(position: { x: number; y: number }): Promise<void> {
    if (!this.channel) return;

    await this.channel.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: {
        user_id: this.userId,
        user_name: this.userName,
        position,
        timestamp: new Date().toISOString()
      }
    });

    // Update local presence
    await this.updatePresence({ cursor_position: position });
  }

  /**
   * Broadcast task drag preview
   */
  async broadcastTaskDrag(
    taskId: string,
    fromStatus: string,
    toStatus: string,
    preview: boolean = true
  ): Promise<void> {
    if (!this.channel) return;

    await this.channel.send({
      type: 'broadcast',
      event: 'task_drag',
      payload: {
        task_id: taskId,
        from_status: fromStatus,
        to_status: toStatus,
        user_id: this.userId,
        user_name: this.userName,
        preview,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Move task with conflict detection
   */
  async moveTask(taskId: string, newStatus: string): Promise<{ success: boolean; conflict?: boolean }> {
    try {
      // Get current task state
      const { data: currentTask, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error || !currentTask) {
        throw new Error('Task not found');
      }

      // Check for recent movements (potential conflicts)
      const recentMovement = this.conflictQueue.find(m => 
        m.task_id === taskId &&
        new Date().getTime() - new Date(m.moved_at).getTime() < 3000
      );

      if (recentMovement) {
        return { success: false, conflict: true };
      }

      // Update task status
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (updateError) {
        throw updateError;
      }

      // Add to conflict queue for tracking
      this.conflictQueue.push({
        task_id: taskId,
        from_status: currentTask.status,
        to_status: newStatus,
        moved_by: this.userId!,
        moved_at: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Error moving task:', error);
      return { success: false };
    }
  }

  /**
   * Get current online users
   */
  getOnlineUsers(): UserPresence[] {
    return Array.from(this.presenceUsers.values())
      .filter(user => user.status === 'online');
  }

  /**
   * Add event listener
   */
  on(event: string, handler: (data: unknown) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: (data: unknown) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Disconnect from real-time collaboration
   */
  async disconnect(): Promise<void> {
    if (this.channel) {
      await this.updatePresence({ status: 'offline' });
      await this.channel.unsubscribe();
      this.channel = null;
    }

    this.presenceUsers.clear();
    this.eventHandlers.clear();
    this.conflictQueue = [];
    this.teamId = null;
    this.userId = null;
    this.userName = null;
  }
}

export default RealtimeCollaborationService;