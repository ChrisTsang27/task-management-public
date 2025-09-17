import { NextRequest } from 'next/server';

import { createSuccessResponse, createErrorResponse } from '@/lib/api/utils';
import { logger } from '@/lib/logger';
import { monitoring } from '@/lib/monitoring';

// Health check endpoint - no authentication required for monitoring
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Log health check request
    await logger.info('Health check requested', {}, request);
    
    // Get comprehensive health status
    const healthStatus = await monitoring.checkHealth();
    const metrics = monitoring.getMetrics();
    const systemInfo = monitoring.getSystemInfo();
    
    // Determine HTTP status based on health
    let httpStatus = 200;
    if (healthStatus.status === 'degraded') {
      httpStatus = 200; // Still OK, but with warnings
    } else if (healthStatus.status === 'unhealthy') {
      httpStatus = 503; // Service unavailable
    }
    
    const responseData = {
      status: healthStatus.status,
      timestamp: healthStatus.timestamp,
      uptime: Math.floor(metrics.uptime / 1000), // Convert to seconds
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
      checks: healthStatus.checks,
      metrics: {
        requests: {
          total: metrics.requestCount,
          averageResponseTime: Math.round(metrics.averageResponseTime),
          errorRate: Math.round(metrics.errorRate * 100) / 100
        },
        memory: {
          heapUsed: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(metrics.memoryUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(metrics.memoryUsage.external / 1024 / 1024), // MB
          rss: Math.round(metrics.memoryUsage.rss / 1024 / 1024) // MB
        },
        system: {
          nodeVersion: systemInfo.nodeVersion,
          platform: systemInfo.platform,
          arch: systemInfo.arch,
          pid: systemInfo.pid
        }
      },
      errors: healthStatus.errors
    };
    
    // Record response time
    const responseTime = Date.now() - startTime;
    monitoring.recordRequest(responseTime, httpStatus >= 400);
    
    if (httpStatus === 503) {
      return await createErrorResponse(
        'Service unhealthy',
        httpStatus,
        responseData,
        undefined,
        request,
        { healthCheck: true }
      );
    }
    
    return await createSuccessResponse(
      responseData,
      httpStatus,
      request,
      { healthCheck: true, responseTime }
    );
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    monitoring.recordRequest(responseTime, true);
    
    await logger.error('Health check failed', error as Error, {}, request);
    
    return await createErrorResponse(
      'Health check failed',
      500,
      undefined,
      error as Error,
      request,
      { healthCheck: true }
    );
  }
}

// Simple ping endpoint for basic availability checks
export async function HEAD(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Record the ping
    const responseTime = Date.now() - startTime;
    monitoring.recordRequest(responseTime, false);
    
    return new Response(null, { 
      status: 200,
      headers: {
        'X-Health-Status': 'ok',
        'X-Uptime': Math.floor(monitoring.getMetrics().uptime / 1000).toString(),
        'X-Response-Time': responseTime.toString()
      }
    });
  } catch (error) {
    monitoring.recordRequest(0, true);
    return new Response(null, { status: 503 });
  }
}