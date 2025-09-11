import { NextRequest } from 'next/server';

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Log entry interface
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
  userId?: string;
  requestId?: string;
  endpoint?: string;
  userAgent?: string;
  ip?: string;
}

// Logger configuration
interface LoggerConfig {
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  minLevel: LogLevel;
  remoteEndpoint?: string;
  apiKey?: string;
}

class Logger {
  private config: LoggerConfig;
  private requestCounter = 0;

  constructor() {
    this.config = {
      enableConsole: true,
      enableFile: process.env.NODE_ENV === 'production',
      enableRemote: process.env.NODE_ENV === 'production' && !!process.env.LOGGING_ENDPOINT,
      minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      remoteEndpoint: process.env.LOGGING_ENDPOINT,
      apiKey: process.env.LOGGING_API_KEY
    };
  }

  // Generate unique request ID
  generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestCounter}`;
  }

  // Extract request context
  extractRequestContext(request?: NextRequest): Partial<LogEntry> {
    if (!request) return {};

    return {
      requestId: this.generateRequestId(),
      endpoint: request.nextUrl?.pathname,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown'
    };
  }

  // Core logging method
  private async log(entry: LogEntry): Promise<void> {
    // Check if log level meets minimum threshold
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const entryLevelIndex = levels.indexOf(entry.level);
    const minLevelIndex = levels.indexOf(this.config.minLevel);
    
    if (entryLevelIndex < minLevelIndex) {
      return;
    }

    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // File logging (in production)
    if (this.config.enableFile) {
      await this.logToFile(entry);
    }

    // Remote logging (if configured)
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      await this.logToRemote(entry);
    }
  }

  // Console logging with colors
  private logToConsole(entry: LogEntry): void {
    const colors = {
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.INFO]: '\x1b[36m',  // Cyan
      [LogLevel.DEBUG]: '\x1b[37m'  // White
    };
    const reset = '\x1b[0m';
    
    const color = colors[entry.level];
    const prefix = `${color}[${entry.level.toUpperCase()}]${reset}`;
    const timestamp = `[${entry.timestamp}]`;
    
    let logMessage = `${prefix} ${timestamp} ${entry.message}`;
    
    if (entry.context) {
      logMessage += ` | Context: ${JSON.stringify(entry.context)}`;
    }
    
    if (entry.requestId) {
      logMessage += ` | RequestID: ${entry.requestId}`;
    }
    
    if (entry.endpoint) {
      logMessage += ` | Endpoint: ${entry.endpoint}`;
    }

    console.log(logMessage);
    
    if (entry.error) {
      console.error('Error details:', entry.error);
      if (entry.error.stack) {
        console.error('Stack trace:', entry.error.stack);
      }
    }
  }

  // File logging (for production)
  private async logToFile(entry: LogEntry): Promise<void> {
    try {
      // In a real implementation, you might use a file system or database
      // For now, we'll use console.log with structured format for production
      const logData = {
        ...entry,
        environment: process.env.NODE_ENV,
        service: 'task-tracking-api'
      };
      
      // This would typically write to a file or send to a logging service
      console.log('STRUCTURED_LOG:', JSON.stringify(logData));
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  // Remote logging (e.g., to external monitoring service)
  private async logToRemote(entry: LogEntry): Promise<void> {
    try {
      if (!this.config.remoteEndpoint || !this.config.apiKey) {
        return;
      }

      const payload = {
        ...entry,
        service: 'task-tracking-api',
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0'
      };

      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      // Don't log remote logging failures to avoid infinite loops
      console.error('Failed to send log to remote endpoint:', error);
    }
  }

  // Public logging methods
  async error(message: string, error?: Error, context?: Record<string, unknown>, request?: NextRequest): Promise<void> {
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message,
      timestamp: new Date().toISOString(),
      error,
      context,
      ...this.extractRequestContext(request)
    };
    
    await this.log(entry);
  }

  async warn(message: string, context?: Record<string, unknown>, request?: NextRequest): Promise<void> {
    const entry: LogEntry = {
      level: LogLevel.WARN,
      message,
      timestamp: new Date().toISOString(),
      context,
      ...this.extractRequestContext(request)
    };
    
    await this.log(entry);
  }

  async info(message: string, context?: Record<string, unknown>, request?: NextRequest): Promise<void> {
    const entry: LogEntry = {
      level: LogLevel.INFO,
      message,
      timestamp: new Date().toISOString(),
      context,
      ...this.extractRequestContext(request)
    };
    
    await this.log(entry);
  }

  async debug(message: string, context?: Record<string, unknown>, request?: NextRequest): Promise<void> {
    const entry: LogEntry = {
      level: LogLevel.DEBUG,
      message,
      timestamp: new Date().toISOString(),
      context,
      ...this.extractRequestContext(request)
    };
    
    await this.log(entry);
  }

  // API-specific logging methods
  async logAPIRequest(request: NextRequest, userId?: string): Promise<string> {
    const requestId = this.generateRequestId();
    
    await this.info('API Request', {
      method: request.method,
      url: request.url,
      userId,
      headers: Object.fromEntries(request.headers.entries())
    }, request);
    
    return requestId;
  }

  async logAPIResponse(requestId: string, status: number, duration: number, request?: NextRequest): Promise<void> {
    await this.info('API Response', {
      requestId,
      status,
      duration: `${duration}ms`
    }, request);
  }

  async logAPIError(error: Error, endpoint: string, userId?: string, request?: NextRequest): Promise<void> {
    await this.error(`API Error in ${endpoint}`, error, {
      endpoint,
      userId,
      errorName: error.name,
      errorMessage: error.message
    }, request);
  }

  // Database operation logging
  async logDatabaseOperation(operation: string, table: string, success: boolean, duration?: number, error?: Error): Promise<void> {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `Database ${operation} on ${table} ${success ? 'succeeded' : 'failed'}`;
    
    const context: Record<string, unknown> = {
      operation,
      table,
      success,
      duration: duration ? `${duration}ms` : undefined
    };

    if (level === LogLevel.ERROR) {
      await this.error(message, error, context);
    } else {
      await this.info(message, context);
    }
  }

  // Authentication logging
  async logAuthEvent(event: string, userId?: string, success: boolean = true, details?: Record<string, unknown>, request?: NextRequest): Promise<void> {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const message = `Auth event: ${event} ${success ? 'succeeded' : 'failed'}`;
    
    const context = {
      event,
      userId,
      success,
      ...details
    };

    if (level === LogLevel.WARN) {
      await this.warn(message, context, request);
    } else {
      await this.info(message, context, request);
    }
  }

  // Security event logging
  async logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high', details: Record<string, unknown>, request?: NextRequest): Promise<void> {
    const level = severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    const message = `Security event: ${event} (${severity} severity)`;
    
    const context = {
      securityEvent: event,
      severity,
      ...details
    };

    if (level === LogLevel.ERROR) {
      await this.error(message, undefined, context, request);
    } else {
      await this.warn(message, context, request);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for external use
export type { LogEntry, LoggerConfig };