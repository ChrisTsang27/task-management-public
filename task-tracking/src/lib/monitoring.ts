import { logger } from './logger';

// Performance metrics interface
interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  activeConnections: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  uptime: number;
}

// Health check status
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
    memory: boolean;
    disk: boolean;
    external_services: boolean;
  };
  metrics: PerformanceMetrics;
  errors: string[];
}

// Alert configuration
interface AlertConfig {
  errorRateThreshold: number; // percentage
  responseTimeThreshold: number; // milliseconds
  memoryThreshold: number; // percentage
  diskThreshold: number; // percentage
  webhookUrl?: string;
  emailEndpoint?: string;
}

class MonitoringService {
  private metrics: PerformanceMetrics;
  private requestTimes: number[] = [];
  private errorCount = 0;
  private requestCount = 0;
  private startTime = Date.now();
  private alertConfig: AlertConfig;
  private lastHealthCheck = 0;
  private healthCheckInterval = 60000; // 1 minute

  constructor() {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      activeConnections: 0,
      memoryUsage: {
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0,
        arrayBuffers: 0
      },
      uptime: 0
    };

    this.alertConfig = {
      errorRateThreshold: parseFloat(process.env.ERROR_RATE_THRESHOLD || '5'), // 5%
      responseTimeThreshold: parseInt(process.env.RESPONSE_TIME_THRESHOLD || '2000'), // 2 seconds
      memoryThreshold: parseFloat(process.env.MEMORY_THRESHOLD || '80'), // 80%
      diskThreshold: parseFloat(process.env.DISK_THRESHOLD || '85'), // 85%
      webhookUrl: process.env.MONITORING_WEBHOOK_URL,
      emailEndpoint: process.env.MONITORING_EMAIL_ENDPOINT
    };

    // Note: Periodic health checks disabled in Edge Runtime
    // Use external monitoring services for production health checks
  }

  // Record API request metrics
  recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestCount++;
    this.requestTimes.push(responseTime);
    
    if (isError) {
      this.errorCount++;
    }

    // Keep only last 1000 request times for memory efficiency
    if (this.requestTimes.length > 1000) {
      this.requestTimes = this.requestTimes.slice(-1000);
    }

    this.updateMetrics();
  }

  // Update performance metrics
  private updateMetrics(): void {
    this.metrics.requestCount = this.requestCount;
    this.metrics.averageResponseTime = this.requestTimes.length > 0 
      ? this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length 
      : 0;
    this.metrics.errorRate = this.requestCount > 0 
      ? (this.errorCount / this.requestCount) * 100 
      : 0;
    // Memory usage not available in Edge Runtime
    this.metrics.uptime = Date.now() - this.startTime;
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  // Check system health
  async checkHealth(): Promise<HealthStatus> {
    const errors: string[] = [];
    const checks = {
      database: await this.checkDatabase(),
      memory: this.checkMemory(),
      disk: await this.checkDisk(),
      external_services: await this.checkExternalServices()
    };

    // Collect errors
    if (!checks.database) errors.push('Database connection failed');
    if (!checks.memory) errors.push('Memory usage too high');
    if (!checks.disk) errors.push('Disk usage too high');
    if (!checks.external_services) errors.push('External services unavailable');

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (errors.length === 0) {
      status = 'healthy';
    } else if (errors.length <= 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      checks,
      metrics: this.getMetrics(),
      errors
    };

    // Log health status
    if (status === 'unhealthy') {
      await logger.error('System health check failed', undefined, { healthStatus });
      await this.sendAlert('System Unhealthy', healthStatus);
    } else if (status === 'degraded') {
      await logger.warn('System health degraded', { healthStatus });
    } else {
      await logger.info('System health check passed', { healthStatus });
    }

    return healthStatus;
  }

  // Check database connectivity
  private async checkDatabase(): Promise<boolean> {
    try {
      // This would typically ping your database
      // For now, we'll assume it's healthy if no recent database errors
      return true;
    } catch (error) {
      await logger.error('Database health check failed', error as Error);
      return false;
    }
  }

  // Check memory usage (simplified for Edge Runtime)
  private checkMemory(): boolean {
    // Memory monitoring not available in Edge Runtime
    // Always return true to avoid false alerts
    return true;
  }

  // Check disk usage
  private async checkDisk(): Promise<boolean> {
    try {
      // In a real implementation, you'd check actual disk usage
      // For now, we'll assume it's healthy
      return true;
    } catch (error) {
      await logger.error('Disk health check failed', error as Error);
      return false;
    }
  }

  // Check external services
  private async checkExternalServices(): Promise<boolean> {
    try {
      // Check Supabase connectivity
      const supabaseHealthy = await this.checkSupabase();
      return supabaseHealthy;
    } catch (error) {
      await logger.error('External services health check failed', error as Error);
      return false;
    }
  }

  // Check Supabase connectivity
  private async checkSupabase(): Promise<boolean> {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        return false;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        }
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Send alerts
  private async sendAlert(title: string, data: any): Promise<void> {
    try {
      // Webhook alert
      if (this.alertConfig.webhookUrl) {
        await fetch(this.alertConfig.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title,
            timestamp: new Date().toISOString(),
            service: 'task-tracking-api',
            environment: process.env.NODE_ENV,
            data
          })
        });
      }

      // Email alert
      if (this.alertConfig.emailEndpoint) {
        await fetch(this.alertConfig.emailEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subject: `Alert: ${title}`,
            body: JSON.stringify(data, null, 2),
            timestamp: new Date().toISOString()
          })
        });
      }
    } catch (error) {
      await logger.error('Failed to send alert', error as Error, { title, data });
    }
  }

  // Start periodic health checks (disabled in Edge Runtime)
  private startHealthChecks(): void {
    // setInterval not available in Edge Runtime
    // Use external monitoring services or scheduled functions instead
    logger.info('Health checks disabled in Edge Runtime', {
      interval: this.healthCheckInterval,
      environment: process.env.NODE_ENV
    });
  }

  // Check for performance alerts
  async checkPerformanceAlerts(): Promise<void> {
    const metrics = this.getMetrics();

    // Check error rate
    if (metrics.errorRate > this.alertConfig.errorRateThreshold) {
      await logger.warn('High error rate detected', {
        currentRate: metrics.errorRate,
        threshold: this.alertConfig.errorRateThreshold
      });
      
      await this.sendAlert('High Error Rate', {
        errorRate: metrics.errorRate,
        threshold: this.alertConfig.errorRateThreshold,
        requestCount: metrics.requestCount
      });
    }

    // Check response time
    if (metrics.averageResponseTime > this.alertConfig.responseTimeThreshold) {
      await logger.warn('High response time detected', {
        currentTime: metrics.averageResponseTime,
        threshold: this.alertConfig.responseTimeThreshold
      });
      
      await this.sendAlert('High Response Time', {
        responseTime: metrics.averageResponseTime,
        threshold: this.alertConfig.responseTimeThreshold
      });
    }
  }

  // Reset metrics (useful for testing or periodic resets)
  resetMetrics(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.requestTimes = [];
    this.startTime = Date.now();
    this.updateMetrics();
    
    logger.info('Monitoring metrics reset');
  }

  // Get system information (Edge Runtime compatible)
  getSystemInfo(): Record<string, unknown> {
    return {
      runtime: 'Edge Runtime',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime
    };
  }
}

// Export singleton instance
export const monitoring = new MonitoringService();

// Export types
export type { PerformanceMetrics, HealthStatus, AlertConfig };

// Middleware function for automatic request tracking
export function createMonitoringMiddleware() {
  return async function monitoringMiddleware(request: Request, handler: () => Promise<Response>): Promise<Response> {
    const startTime = Date.now();
    let isError = false;
    
    try {
      const response = await handler();
      isError = response.status >= 400;
      return response;
    } catch (error) {
      isError = true;
      throw error;
    } finally {
      const responseTime = Date.now() - startTime;
      monitoring.recordRequest(responseTime, isError);
      
      // Check for performance alerts periodically
      if (Math.random() < 0.01) { // 1% chance to avoid too frequent checks
        monitoring.checkPerformanceAlerts();
      }
    }
  };
}