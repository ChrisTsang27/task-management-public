import { Task, TaskStatus } from '@/types/tasks';
import { RealtimeCollaborationService } from './realtime-collaboration';

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

interface PendingMovement {
  taskId: string;
  userId: string;
  userName: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  timestamp: number;
}

interface IncomingMovementData {
  type: string;
  taskId: string;
  task: Task;
  userId: string;
  userName: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
}

export class ConflictResolutionService {
  private static instance: ConflictResolutionService;
  private pendingMovements: Map<string, PendingMovement[]> = new Map();
  private conflictTimeoutMs = 2000; // 2 seconds to detect conflicts
  private conflictCallbacks: ((conflict: ConflictData) => void)[] = [];
  private realtimeService: RealtimeCollaborationService;

  private constructor() {
    this.realtimeService = RealtimeCollaborationService.getInstance();
    this.setupRealtimeListeners();
  }

  static getInstance(): ConflictResolutionService {
    if (!ConflictResolutionService.instance) {
      ConflictResolutionService.instance = new ConflictResolutionService();
    }
    return ConflictResolutionService.instance;
  }

  private setupRealtimeListeners() {
    // Listen for task movements from other users
    this.realtimeService.onTaskMovement((data) => {
      this.handleIncomingMovement(data);
    });
  }

  // Detect conflicts for a task movement
  detectConflict(data: {
    taskId: string;
    fromStatus: TaskStatus;
    toStatus: TaskStatus;
    userId: string;
    timestamp: number;
  }): ConflictData | null {
    const existingMovements = this.pendingMovements.get(data.taskId) || [];
    const now = Date.now();
    const recentMovements = existingMovements.filter(
      m => now - m.timestamp < this.conflictTimeoutMs
    );

    if (recentMovements.length > 0) {
      // Create a mock conflict for demonstration
      return {
        id: `conflict_${data.taskId}_${now}`,
        taskId: data.taskId,
        task: {} as Task, // Will be populated by caller
        conflicts: [
          ...recentMovements.map(m => ({
            userId: m.userId,
            userName: m.userName,
            fromStatus: m.fromStatus,
            toStatus: m.toStatus,
            timestamp: m.timestamp
          })),
          {
            userId: data.userId,
            userName: 'Current User',
            fromStatus: data.fromStatus,
            toStatus: data.toStatus,
            timestamp: data.timestamp
          }
        ],
        timestamp: now
      };
    }

    return null;
  }

  // Register a task movement and check for conflicts
  registerMovement(
    taskId: string,
    task: Task,
    userId: string,
    userName: string,
    fromStatus: TaskStatus,
    toStatus: TaskStatus
  ): boolean {
    const movement: PendingMovement = {
      taskId,
      userId,
      userName,
      fromStatus,
      toStatus,
      timestamp: Date.now()
    };

    // Get existing movements for this task
    const existingMovements = this.pendingMovements.get(taskId) || [];
    
    // Check for conflicts (movements within the timeout window)
    const now = Date.now();
    const recentMovements = existingMovements.filter(
      m => now - m.timestamp < this.conflictTimeoutMs
    );

    // Add current movement
    const allMovements = [...recentMovements, movement];
    this.pendingMovements.set(taskId, allMovements);

    // If there are multiple movements, we have a conflict
    if (allMovements.length > 1) {
      this.createConflict(taskId, task, allMovements);
      return false; // Movement blocked due to conflict
    }

    // Schedule cleanup of this movement
    setTimeout(() => {
      this.cleanupMovement(taskId, movement.timestamp);
    }, this.conflictTimeoutMs);

    return true; // Movement allowed
  }

  private handleIncomingMovement(data: IncomingMovementData) {
    // Handle movements from other users via realtime service
    if (data.type === 'task_movement') {
      const { taskId, task, userId, userName, fromStatus, toStatus } = data;
      this.registerMovement(taskId, task, userId, userName, fromStatus, toStatus);
    }
  }

  private createConflict(taskId: string, task: Task, movements: PendingMovement[]) {
    const conflict: ConflictData = {
      id: `conflict_${taskId}_${Date.now()}`,
      taskId,
      task,
      conflicts: movements.map(m => ({
        userId: m.userId,
        userName: m.userName,
        fromStatus: m.fromStatus,
        toStatus: m.toStatus,
        timestamp: m.timestamp
      })),
      timestamp: Date.now()
    };

    // Notify all registered callbacks
    this.conflictCallbacks.forEach(callback => callback(conflict));
  }

  private cleanupMovement(taskId: string, timestamp: number) {
    const movements = this.pendingMovements.get(taskId) || [];
    const filtered = movements.filter(m => m.timestamp !== timestamp);
    
    if (filtered.length === 0) {
      this.pendingMovements.delete(taskId);
    } else {
      this.pendingMovements.set(taskId, filtered);
    }
  }

  // Subscribe to conflict events
  onConflict(callback: (conflict: ConflictData) => void) {
    this.conflictCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.conflictCallbacks.indexOf(callback);
      if (index > -1) {
        this.conflictCallbacks.splice(index, 1);
      }
    };
  }

  // Resolve a conflict
  async resolveConflict(
    conflictId: string,
    resolution: 'accept' | 'reject' | 'merge',
    selectedStatus?: TaskStatus
  ): Promise<void> {
    try {
      // Send resolution to backend
      const response = await fetch('/api/conflicts/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conflictId,
          resolution,
          selectedStatus
        })
      });

      if (!response.ok) {
        throw new Error('Failed to resolve conflict');
      }

      // Broadcast resolution to other users
      this.realtimeService.broadcastConflictResolution({
        conflictId,
        resolution,
        selectedStatus,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error resolving conflict:', error);
      throw error;
    }
  }

  // Clear all pending movements for a task
  clearTaskMovements(taskId: string) {
    this.pendingMovements.delete(taskId);
  }

  // Get current conflicts count
  getConflictsCount(): number {
    return Array.from(this.pendingMovements.values())
      .filter(movements => movements.length > 1)
      .length;
  }

  // Check if a task has pending conflicts
  hasConflicts(taskId: string): boolean {
    const movements = this.pendingMovements.get(taskId) || [];
    return movements.length > 1;
  }

  // Set conflict detection timeout
  setConflictTimeout(timeoutMs: number) {
    this.conflictTimeoutMs = timeoutMs;
  }
}

export default ConflictResolutionService;