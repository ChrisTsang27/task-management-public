import { Task, TaskStatus } from '@/types/tasks';

interface UserPresence {
  userId: string;
  userName: string;
  taskId?: string;
  timestamp: number;
  status: 'active' | 'idle' | 'offline';
}

interface TaskMovementData {
  type: 'task_movement';
  taskId: string;
  task: Task;
  userId: string;
  userName: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  timestamp: number;
}

interface ConflictResolutionData {
  conflictId: string;
  resolution: 'accept' | 'reject' | 'merge';
  selectedStatus?: TaskStatus;
  timestamp: number;
}

interface PresenceUpdateMessage {
  type: 'presence_update';
  userId: string;
  userName: string;
  taskId?: string;
  timestamp: number;
  status: 'active' | 'idle' | 'offline';
}

interface ConflictResolutionMessage {
  type: 'conflict_resolution';
  conflictId: string;
  resolution: 'accept' | 'reject' | 'merge';
  selectedStatus?: TaskStatus;
  timestamp: number;
}

interface JoinTeamMessage {
  type: 'join_team';
  teamId: string;
  userId: string;
  userName: string;
  timestamp: number;
}

interface LeaveTeamMessage {
  type: 'leave_team';
  teamId: string;
  userId: string;
  timestamp: number;
}

type RealtimeMessage = TaskMovementData | PresenceUpdateMessage | ConflictResolutionMessage | JoinTeamMessage | LeaveTeamMessage;

export class RealtimeCollaborationService {
  private static instance: RealtimeCollaborationService;
  private ws: WebSocket | null = null;
  private teamId: string | null = null;
  private userId: string | null = null;
  private userName: string | null = null;
  private presenceCallbacks: ((users: Record<string, UserPresence[]>) => void)[] = [];
  private taskMovementCallbacks: ((data: TaskMovementData) => void)[] = [];
  private conflictResolutionCallbacks: ((data: ConflictResolutionData) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private constructor() {}

  static getInstance(): RealtimeCollaborationService {
    if (!RealtimeCollaborationService.instance) {
      RealtimeCollaborationService.instance = new RealtimeCollaborationService();
    }
    return RealtimeCollaborationService.instance;
  }

  // Initialize connection
  async connect(teamId: string, userId: string, userName: string): Promise<void> {
    this.teamId = teamId;
    this.userId = userId;
    this.userName = userName;

    return new Promise((resolve, reject) => {
      try {
        // In a real implementation, this would connect to your WebSocket server
        // For now, we'll simulate the connection
        
        // Simulate WebSocket connection
        setTimeout(() => {
          this.reconnectAttempts = 0;
          resolve();
        }, 100);
      } catch (error) {
        console.error('Failed to connect to realtime service:', error);
        reject(error);
      }
    });
  }

  // Join a team for collaboration
  async joinTeam(teamId: string): Promise<void> {
    if (!this.userId || !this.userName) {
      throw new Error('User not authenticated');
    }

    this.teamId = teamId;
    
    // Send join team message
    if (this.userId && this.userName) {
      this.sendMessage({
        type: 'join_team',
        teamId,
        userId: this.userId,
        userName: this.userName,
        timestamp: Date.now()
      });
    }
  }

  // Leave current team
  async leaveTeam(): Promise<void> {
    if (!this.teamId) return;

    if (this.userId) {
      this.sendMessage({
        type: 'leave_team',
        teamId: this.teamId,
        userId: this.userId,
        timestamp: Date.now()
      });
    }

    this.teamId = null;
  }

  // Update user presence on a specific task
  updateTaskPresence(taskId: string | null): void {
    if (!this.teamId || !this.userId || !this.userName) return;

    this.sendMessage({
      type: 'presence_update',
      userId: this.userId,
      userName: this.userName,
      taskId: taskId || undefined,
      timestamp: Date.now(),
      status: 'active'
    });
  }

  // Broadcast task movement
  broadcastTaskMovement(data: {
    taskId: string;
    task: Task;
    fromStatus: TaskStatus;
    toStatus: TaskStatus;
  }): void {
    if (!this.teamId || !this.userId || !this.userName) return;

    const message: TaskMovementData = {
      type: 'task_movement',
      taskId: data.taskId,
      task: data.task,
      userId: this.userId,
      userName: this.userName,
      fromStatus: data.fromStatus,
      toStatus: data.toStatus,
      timestamp: Date.now()
    };

    this.sendMessage(message);
  }

  // Broadcast conflict resolution
  broadcastConflictResolution(data: ConflictResolutionData): void {
    if (!this.teamId) return;

    this.sendMessage({
      type: 'conflict_resolution',
      ...data
    });
  }

  // Subscribe to presence updates
  onPresenceUpdate(callback: (users: Record<string, UserPresence[]>) => void) {
    this.presenceCallbacks.push(callback);
    
    return () => {
      const index = this.presenceCallbacks.indexOf(callback);
      if (index > -1) {
        this.presenceCallbacks.splice(index, 1);
      }
    };
  }

  // Subscribe to task movements
  onTaskMovement(callback: (data: TaskMovementData) => void) {
    this.taskMovementCallbacks.push(callback);
    
    return () => {
      const index = this.taskMovementCallbacks.indexOf(callback);
      if (index > -1) {
        this.taskMovementCallbacks.splice(index, 1);
      }
    };
  }

  // Subscribe to conflict resolutions
  onConflictResolution(callback: (data: ConflictResolutionData) => void) {
    this.conflictResolutionCallbacks.push(callback);
    
    return () => {
      const index = this.conflictResolutionCallbacks.indexOf(callback);
      if (index > -1) {
        this.conflictResolutionCallbacks.splice(index, 1);
      }
    };
  }

  // Send message through WebSocket
  private sendMessage(message: RealtimeMessage): void {
    // In a real implementation, this would send through WebSocket
    // For now, we'll simulate the behavior
    
    // Simulate receiving the message back for testing
    setTimeout(() => {
      this.handleMessage(message);
    }, 50);
  }

  // Handle incoming messages
  private handleMessage(message: RealtimeMessage): void {
    switch (message.type) {
      case 'presence_update':
        // Simulate presence data
        const presenceData: Record<string, UserPresence[]> = {
          [message.taskId || 'general']: [{
            userId: message.userId,
            userName: message.userName,
            taskId: message.taskId,
            timestamp: message.timestamp,
            status: message.status
          }]
        };
        this.presenceCallbacks.forEach(callback => callback(presenceData));
        break;

      case 'task_movement':
        // Only notify if it's from another user
        if (message.userId !== this.userId) {
          this.taskMovementCallbacks.forEach(callback => callback(message));
        }
        break;

      case 'conflict_resolution':
        this.conflictResolutionCallbacks.forEach(callback => callback(message));
        break;

      default:
        // Unknown message type - ignore
    }
  }

  // Disconnect from service
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.teamId = null;
    this.userId = null;
    this.userName = null;
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN || this.teamId !== null;
  }

  // Get current user info
  getCurrentUser(): { userId: string; userName: string } | null {
    if (!this.userId || !this.userName) return null;
    return { userId: this.userId, userName: this.userName };
  }

  // Simulate user activity for demo purposes
  simulateUserActivity(taskId: string, userCount: number = 2): void {
    const users = Array.from({ length: userCount }, (_, i) => ({
      userId: `user_${i + 1}`,
      userName: `User ${i + 1}`,
      taskId,
      timestamp: Date.now(),
      status: 'active' as const
    }));

    const presenceData: Record<string, UserPresence[]> = {
      [taskId]: users
    };

    this.presenceCallbacks.forEach(callback => callback(presenceData));
  }
}

export default RealtimeCollaborationService;