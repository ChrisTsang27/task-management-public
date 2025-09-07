import { Task } from '@/types/tasks';

interface PriorityFactors {
  urgency: number; // 0-1 scale
  importance: number; // 0-1 scale
  dependencies: number; // 0-1 scale
  teamWorkload: number; // 0-1 scale
  deadline: number; // 0-1 scale
  complexity: number; // 0-1 scale
}

interface AIInsight {
  type: 'priority' | 'recommendation' | 'warning';
  message: string;
  confidence: number; // 0-1 scale
}

interface PriorityResult {
  score: number; // 0-1 scale
  factors: PriorityFactors;
  insights: AIInsight[];
  estimatedHours?: number;
  complexityScore?: number;
  tags?: string[];
  timestamp?: number; // For caching
}

export class AIPrioritizationService {
  private static instance: AIPrioritizationService;
  private apiEndpoint = '/api/ai/prioritization';
  private cache = new Map<string, PriorityResult>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): AIPrioritizationService {
    if (!AIPrioritizationService.instance) {
      AIPrioritizationService.instance = new AIPrioritizationService();
    }
    return AIPrioritizationService.instance;
  }

  // Calculate priority score for a single task
  async calculateTaskPriority(task: Task): Promise<PriorityResult> {
    const cacheKey = `${task.id}_${task.updated_at}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.timestamp && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached;
    }

    try {
      // In a real implementation, this would call your AI service
      // For now, we'll simulate the AI prioritization
      const result = await this.simulateAIPrioritization(task);
      
      // Cache the result
      this.cache.set(cacheKey, { ...result, timestamp: Date.now() });
      
      return result;
    } catch (error) {
      console.error('Failed to calculate task priority:', error);
      return this.getFallbackPriority();
    }
  }

  // Calculate priorities for multiple tasks
  async calculateTeamTaskPriorities(teamId: string, tasks: Task[]): Promise<Record<string, PriorityResult>> {
    try {
      const response = await fetch(`${this.apiEndpoint}/team/${teamId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tasks })
      });

      if (!response.ok) {
        throw new Error('Failed to calculate team priorities');
      }

      const results = await response.json();
      
      // Cache individual results
      Object.entries(results).forEach(([taskId, result]) => {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          const cacheKey = `${task.id}_${task.updated_at}`;
          this.cache.set(cacheKey, { ...result as PriorityResult, timestamp: Date.now() });
        }
      });

      return results;
    } catch (error) {
      console.error('Failed to calculate team priorities:', error);
      
      // Fallback to individual calculations
      const results: Record<string, PriorityResult> = {};
      for (const task of tasks) {
        results[task.id] = await this.calculateTaskPriority(task);
      }
      return results;
    }
  }

  // Simulate AI prioritization (replace with actual AI service)
  private async simulateAIPrioritization(task: Task): Promise<PriorityResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const factors = this.calculateFactors(task);
    const score = this.calculateWeightedScore(factors);
    const insights = this.generateInsights(task, factors, score);
    const estimatedHours = this.estimateHours(task, factors.complexity);
    const complexityScore = Math.round(factors.complexity * 10);
    const tags = this.generateTags(task, factors);

    return {
      score,
      factors,
      insights,
      estimatedHours,
      complexityScore,
      tags
    };
  }

  // Calculate individual priority factors
  private calculateFactors(task: Task): PriorityFactors {
    const now = Date.now();
    const created = new Date(task.created_at).getTime();
    const dueDate = task.due_date ? new Date(task.due_date).getTime() : null;
    
    // Age factor (older tasks get higher urgency)
    const ageInDays = (now - created) / (1000 * 60 * 60 * 24);
    const urgency = Math.min(ageInDays / 30, 1); // Max urgency after 30 days
    
    // Deadline factor
    let deadline = 0.5; // Default medium priority
    if (dueDate) {
      const daysUntilDue = (dueDate - now) / (1000 * 60 * 60 * 24);
      if (daysUntilDue < 1) deadline = 1; // Due today or overdue
      else if (daysUntilDue < 3) deadline = 0.8; // Due within 3 days
      else if (daysUntilDue < 7) deadline = 0.6; // Due within a week
      else deadline = 0.3; // Due later
    }
    
    // Importance based on task content and status
    const importance = this.calculateImportance(task);
    
    // Dependencies (simulated)
    const dependencies = Math.random() * 0.5 + 0.25; // Random between 0.25-0.75
    
    // Team workload (simulated)
    const teamWorkload = Math.random() * 0.4 + 0.3; // Random between 0.3-0.7
    
    // Complexity based on description length and keywords
    const complexity = this.calculateComplexity(task);
    
    return {
      urgency,
      importance,
      dependencies,
      teamWorkload,
      deadline,
      complexity
    };
  }

  // Calculate importance based on task content
  private calculateImportance(task: Task): number {
    let importance = 0.5; // Base importance
    
    const title = task.title.toLowerCase();
    const description = task.description?.toLowerCase() || '';
    
    // High importance keywords
    const highImportanceKeywords = ['critical', 'urgent', 'important', 'priority', 'bug', 'security', 'production'];
    const mediumImportanceKeywords = ['feature', 'enhancement', 'improvement', 'optimization'];
    
    highImportanceKeywords.forEach(keyword => {
      if (title.includes(keyword) || description.includes(keyword)) {
        importance += 0.2;
      }
    });
    
    mediumImportanceKeywords.forEach(keyword => {
      if (title.includes(keyword) || description.includes(keyword)) {
        importance += 0.1;
      }
    });
    
    // Status-based importance
    if (task.status === 'blocked') importance += 0.3;
    if (task.status === 'pending_review') importance += 0.2;
    
    return Math.min(importance, 1);
  }

  // Calculate complexity based on task content
  private calculateComplexity(task: Task): number {
    let complexity = 0.3; // Base complexity
    
    const title = task.title.toLowerCase();
    const description = task.description?.toLowerCase() || '';
    
    // Complexity indicators
    const complexKeywords = ['integration', 'migration', 'refactor', 'architecture', 'database', 'api', 'algorithm'];
    const simpleKeywords = ['fix', 'update', 'change', 'add', 'remove'];
    
    complexKeywords.forEach(keyword => {
      if (title.includes(keyword) || description.includes(keyword)) {
        complexity += 0.2;
      }
    });
    
    simpleKeywords.forEach(keyword => {
      if (title.includes(keyword) || description.includes(keyword)) {
        complexity -= 0.1;
      }
    });
    
    // Length-based complexity
    const descriptionLength = description.length;
    if (descriptionLength > 500) complexity += 0.2;
    else if (descriptionLength > 200) complexity += 0.1;
    
    return Math.max(0.1, Math.min(complexity, 1));
  }

  // Calculate weighted priority score
  private calculateWeightedScore(factors: PriorityFactors): number {
    const weights = {
      urgency: 0.25,
      importance: 0.3,
      dependencies: 0.15,
      teamWorkload: 0.1,
      deadline: 0.15,
      complexity: 0.05
    };
    
    return Object.entries(factors).reduce((score, [factor, value]) => {
      return score + (value * weights[factor as keyof PriorityFactors]);
    }, 0);
  }

  // Generate AI insights
  private generateInsights(task: Task, factors: PriorityFactors, score: number): AIInsight[] {
    const insights: AIInsight[] = [];
    
    // Priority insights
    if (score > 0.8) {
      insights.push({
        type: 'priority',
        message: 'High priority task - consider addressing immediately',
        confidence: 0.9
      });
    } else if (score < 0.3) {
      insights.push({
        type: 'priority',
        message: 'Low priority - can be scheduled for later',
        confidence: 0.8
      });
    }
    
    // Deadline warnings
    if (factors.deadline > 0.8) {
      insights.push({
        type: 'warning',
        message: 'Approaching deadline - immediate attention required',
        confidence: 0.95
      });
    }
    
    // Complexity recommendations
    if (factors.complexity > 0.7) {
      insights.push({
        type: 'recommendation',
        message: 'Complex task - consider breaking into smaller subtasks',
        confidence: 0.85
      });
    }
    
    // Dependencies insights
    if (factors.dependencies > 0.7) {
      insights.push({
        type: 'recommendation',
        message: 'High dependency task - coordinate with team members',
        confidence: 0.8
      });
    }
    
    return insights;
  }

  // Estimate hours based on complexity
  private estimateHours(task: Task, complexity: number): number {
    const baseHours = 2;
    const complexityMultiplier = 1 + (complexity * 3); // 1x to 4x multiplier
    return Math.round(baseHours * complexityMultiplier);
  }

  // Generate tags based on task analysis
  private generateTags(task: Task, factors: PriorityFactors): string[] {
    const tags: string[] = [];
    
    if (factors.urgency > 0.7) tags.push('Urgent');
    if (factors.importance > 0.7) tags.push('Important');
    if (factors.complexity > 0.7) tags.push('Complex');
    if (factors.deadline > 0.8) tags.push('Due Soon');
    if (factors.dependencies > 0.7) tags.push('Dependent');
    
    // Content-based tags
    const title = task.title.toLowerCase();
    const description = task.description?.toLowerCase() || '';
    
    if (title.includes('bug') || description.includes('bug')) tags.push('Bug');
    if (title.includes('feature') || description.includes('feature')) tags.push('Feature');
    if (title.includes('security') || description.includes('security')) tags.push('Security');
    if (title.includes('performance') || description.includes('performance')) tags.push('Performance');
    
    return tags.slice(0, 5); // Limit to 5 tags
  }

  // Fallback priority calculation
  private getFallbackPriority(): PriorityResult {
    return {
      score: 0.5,
      factors: {
        urgency: 0.5,
        importance: 0.5,
        dependencies: 0.5,
        teamWorkload: 0.5,
        deadline: 0.5,
        complexity: 0.5
      },
      insights: [{
        type: 'warning',
        message: 'AI prioritization unavailable - using default priority',
        confidence: 0.5
      }],
      estimatedHours: 4,
      complexityScore: 5,
      tags: ['Default']
    };
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache size
  getCacheSize(): number {
    return this.cache.size;
  }
}

export default AIPrioritizationService;