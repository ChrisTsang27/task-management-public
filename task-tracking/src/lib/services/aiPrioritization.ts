import { Task, AIInsights } from '@/types/tasks';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface PriorityFactors {
  urgency: number;        // 0-40 points (due date proximity)
  complexity: number;     // 0-25 points (task complexity)
  age: number;           // 0-20 points (how long task has been waiting)
  dependencies: number;   // 0-10 points (number of blocking dependencies)
  teamWorkload: number;  // 0-5 points (current team capacity)
}

export interface AIRecommendation {
  type: 'priority' | 'assignment' | 'deadline' | 'dependency' | 'risk';
  message: string;
  confidence: number; // 0-1
  actionable: boolean;
}

export class AIPrioritizationService {
  /**
   * Calculate AI-powered priority score for a task
   */
  static async calculatePriorityScore(
    task: Task,
    teamTasks: Task[] = [],
    teamWorkload: number = 5
  ): Promise<{ score: number; factors: PriorityFactors; insights: AIInsights }> {
    const factors = this.analyzePriorityFactors(task, teamWorkload);
    const score = this.computeFinalScore(factors);
    const insights = await this.generateInsights(task, factors, teamTasks);

    return { score, factors, insights };
  }

  /**
   * Analyze individual priority factors
   */
  private static analyzePriorityFactors(
    task: Task,
    teamWorkload: number
  ): PriorityFactors {
    // Calculate urgency based on due date
    const urgency = this.calculateUrgencyScore(task.due_date);
    
    // Calculate complexity weight
    const complexity = this.calculateComplexityScore(task.complexity_score || 1);
    
    // Calculate age factor (how long task has been waiting)
    const age = this.calculateAgeScore(task.created_at);
    
    // Calculate dependency impact
    const dependencies = this.calculateDependencyScore(task.dependencies || []);
    
    // Calculate team workload factor
    const teamWorkloadScore = this.calculateTeamWorkloadScore(teamWorkload);

    return {
      urgency,
      complexity,
      age,
      dependencies,
      teamWorkload: teamWorkloadScore
    };
  }

  /**
   * Calculate urgency score based on due date (0-40 points)
   */
  private static calculateUrgencyScore(dueDate?: string): number {
    if (!dueDate) return 10; // Default for tasks without due date
    
    const due = new Date(dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue < 0) return 40; // Overdue
    if (daysUntilDue === 0) return 35; // Due today
    if (daysUntilDue === 1) return 30; // Due tomorrow
    if (daysUntilDue <= 3) return 25; // Due within 3 days
    if (daysUntilDue <= 7) return 20; // Due within a week
    if (daysUntilDue <= 14) return 15; // Due within 2 weeks
    if (daysUntilDue <= 30) return 10; // Due within a month
    
    return 5; // Due in more than a month
  }

  /**
   * Calculate complexity score (0-25 points)
   */
  private static calculateComplexityScore(complexity: number): number {
    return Math.min(25, complexity * 2.5);
  }

  /**
   * Calculate age score based on creation date (0-20 points)
   */
  private static calculateAgeScore(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const daysOld = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.min(20, daysOld * 0.5);
  }

  /**
   * Calculate dependency score (0-10 points)
   */
  private static calculateDependencyScore(dependencies: string[]): number {
    return Math.min(10, dependencies.length * 2);
  }

  /**
   * Calculate team workload score (0-5 points)
   */
  private static calculateTeamWorkloadScore(workload: number): number {
    return Math.max(0, 5 - (workload * 0.5));
  }

  /**
   * Compute final priority score
   */
  private static computeFinalScore(factors: PriorityFactors): number {
    const total = factors.urgency + factors.complexity + factors.age + 
                 factors.dependencies + factors.teamWorkload;
    return Math.min(100, Math.max(0, total));
  }

  /**
   * Generate AI insights and recommendations
   */
  private static async generateInsights(
    task: Task,
    factors: PriorityFactors,
    teamTasks: Task[]
  ): Promise<AIInsights> {
    const recommendations = this.generateRecommendations(task, factors);
    const riskFactors = this.identifyRiskFactors(task, factors);
    const estimatedCompletion = this.estimateCompletion(task, factors);
    const similarTasks = this.findSimilarTasks(task, teamTasks);
    const bottleneckPrediction = this.predictBottleneck(task, factors);

    return {
      auto_generated: true,
      priority_factors: {
        urgency: factors.urgency,
        complexity: factors.complexity,
        dependencies: factors.dependencies,
        team_workload: factors.teamWorkload
      },
      recommendations,
      risk_factors: riskFactors,
      estimated_completion: estimatedCompletion,
      similar_tasks: similarTasks,
      bottleneck_prediction: bottleneckPrediction
    };
  }

  /**
   * Generate actionable recommendations
   */
  private static generateRecommendations(
    task: Task,
    factors: PriorityFactors
  ): string[] {
    const recommendations: string[] = [];

    // Urgency-based recommendations
    if (factors.urgency > 30) {
      recommendations.push('🚨 High priority: Due date is approaching or overdue');
    } else if (factors.urgency < 10) {
      recommendations.push('📅 Consider setting a more specific due date');
    }

    // Complexity-based recommendations
    if (factors.complexity > 20) {
      recommendations.push('🧩 Complex task: Consider breaking into smaller subtasks');
      recommendations.push('👥 Assign to experienced team member');
    }

    // Age-based recommendations
    if (factors.age > 15) {
      recommendations.push('⏰ Task has been waiting: Prioritize for immediate action');
    }

    // Dependency recommendations
    if (factors.dependencies > 5) {
      recommendations.push('🔗 Multiple dependencies: Review blocking tasks first');
    }

    // Team workload recommendations
    if (factors.teamWorkload < 2) {
      recommendations.push('⚡ Team is busy: Consider reassigning or extending deadline');
    }

    return recommendations;
  }

  /**
   * Identify potential risk factors
   */
  private static identifyRiskFactors(task: Task, factors: PriorityFactors): string[] {
    const risks: string[] = [];

    if (factors.urgency > 35 && factors.complexity > 20) {
      risks.push('High complexity task with tight deadline');
    }

    if (factors.dependencies > 8) {
      risks.push('Multiple dependencies may cause delays');
    }

    if (factors.age > 18) {
      risks.push('Task has been stagnant for too long');
    }

    if (!task.assignee_id) {
      risks.push('No assignee - task may be overlooked');
    }

    return risks;
  }

  /**
   * Estimate completion timeframe
   */
  private static estimateCompletion(task: Task, factors: PriorityFactors): string {
    const baseHours = task.estimated_hours || this.estimateHoursFromComplexity(task.complexity_score || 1);
    const complexityMultiplier = 1 + (factors.complexity / 100);
    const dependencyDelay = factors.dependencies * 0.5; // days
    
    const estimatedHours = baseHours * complexityMultiplier;
    const estimatedDays = Math.ceil(estimatedHours / 8) + dependencyDelay;
    
    if (estimatedDays <= 1) return 'Within 1 day';
    if (estimatedDays <= 3) return 'Within 3 days';
    if (estimatedDays <= 7) return 'Within 1 week';
    if (estimatedDays <= 14) return 'Within 2 weeks';
    
    return 'More than 2 weeks';
  }

  /**
   * Estimate hours from complexity score
   */
  private static estimateHoursFromComplexity(complexity: number): number {
    const baseHours = [1, 2, 4, 8, 16, 24, 40, 60, 80, 120];
    return baseHours[Math.min(complexity - 1, 9)] || 1;
  }

  /**
   * Find similar tasks for pattern recognition
   */
  private static findSimilarTasks(task: Task, teamTasks: Task[]): string[] {
    return teamTasks
      .filter(t => 
        t.id !== task.id &&
        (t.complexity_score === task.complexity_score ||
         t.tags?.some(tag => task.tags?.includes(tag)))
      )
      .slice(0, 3)
      .map(t => t.id);
  }

  /**
   * Predict if task might become a bottleneck
   */
  private static predictBottleneck(
    task: Task,
    factors: PriorityFactors
  ): boolean {
    // High complexity + many dependencies + tight deadline = potential bottleneck
    return factors.complexity > 20 && 
           factors.dependencies > 5 && 
           factors.urgency > 25;
  }

  /**
   * Bulk update priority scores for multiple tasks
   */
  static async updateTasksPriorityScores(teamId: string): Promise<void> {
    try {
      // Fetch all active tasks for the team
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('team_id', teamId)
        .not('status', 'eq', 'done');

      if (error) throw error;
      if (!tasks) return;

      // Calculate team workload
      const teamWorkload = tasks.filter(t => 
        ['approved', 'in_progress', 'pending_review'].includes(t.status)
      ).length;

      // Update each task's priority score
      for (const task of tasks) {
        const { score, insights } = await this.calculatePriorityScore(
          task,
          tasks,
          teamWorkload
        );

        await supabase
          .from('tasks')
          .update({
            priority_score: score,
            ai_insights: insights,
            ai_last_updated: new Date().toISOString()
          })
          .eq('id', task.id);
      }
    } catch (error) {
      console.error('Error updating task priority scores:', error);
      throw error;
    }
  }

  /**
   * Get AI-prioritized tasks for a team
   */
  static async getAIPrioritizedTasks(
    teamId: string,
    limit: number = 50
  ): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_ai_prioritized_tasks', {
          team_uuid: teamId,
          limit_count: limit
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching AI-prioritized tasks:', error);
      throw error;
    }
  }
}

export default AIPrioritizationService;