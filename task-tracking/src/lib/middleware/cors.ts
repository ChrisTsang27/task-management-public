import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../logger';

// CORS configuration interface
interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
  preflightContinue: boolean;
  optionsSuccessStatus: number;
}

// Default CORS configuration
const defaultConfig: CORSConfig = {
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:3000',
    'https://localhost:3001'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Per-Page'
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Get CORS configuration based on environment
function getCORSConfig(): CORSConfig {
  const config = { ...defaultConfig };
  
  // Production origins from environment variables
  if (process.env.NODE_ENV === 'production') {
    const productionOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || [];
    
    if (productionOrigins.length > 0) {
      config.allowedOrigins = productionOrigins;
    } else {
      // Default production origins if not specified
      config.allowedOrigins = [
        process.env.NEXTAUTH_URL || 'https://yourdomain.com',
        process.env.FRONTEND_URL || 'https://app.yourdomain.com',
        'https://task-manager-eta-livid-23.vercel.app' // Add Vercel deployment URL
      ].filter(Boolean);
    }
    
    // More restrictive settings for production
    config.credentials = process.env.CORS_CREDENTIALS === 'true';
    config.maxAge = parseInt(process.env.CORS_MAX_AGE || '3600'); // 1 hour default for production
  }
  
  // Development origins
  if (process.env.NODE_ENV === 'development') {
    const devOrigins = process.env.DEV_ALLOWED_ORIGINS?.split(',').map(origin => origin.trim());
    if (devOrigins && devOrigins.length > 0) {
      config.allowedOrigins = [...config.allowedOrigins, ...devOrigins];
    }
  }
  
  return config;
}

// Check if origin is allowed
function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) {
    // Allow requests with no origin (e.g., mobile apps, Postman)
    return process.env.NODE_ENV === 'development' || process.env.ALLOW_NO_ORIGIN === 'true';
  }
  
  // Exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // Wildcard matching for development
  if (process.env.NODE_ENV === 'development') {
    return allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const regex = new RegExp(allowedOrigin.replace(/\*/g, '.*'));
        return regex.test(origin);
      }
      return false;
    });
  }
  
  return false;
}

// Apply CORS headers to response
function applyCORSHeaders(response: NextResponse, origin: string | null, config: CORSConfig): NextResponse {
  // Set Access-Control-Allow-Origin
  if (isOriginAllowed(origin, config.allowedOrigins)) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
  }
  
  // Set other CORS headers
  response.headers.set('Access-Control-Allow-Methods', config.allowedMethods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
  
  if (config.exposedHeaders.length > 0) {
    response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
  }
  
  if (config.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  response.headers.set('Access-Control-Max-Age', config.maxAge.toString());
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}

// CORS middleware function
export function corsMiddleware(request: NextRequest): NextResponse | null {
  const config = getCORSConfig();
  const origin = request.headers.get('origin');
  const method = request.method;
  
  // Log CORS request for monitoring
  logger.info('CORS request', {
    origin,
    method,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  }, request);
  
  // Handle preflight OPTIONS request
  if (method === 'OPTIONS') {
    // Check if origin is allowed for preflight
    if (!isOriginAllowed(origin, config.allowedOrigins)) {
      logger.warn('CORS preflight request blocked', {
        origin,
        allowedOrigins: config.allowedOrigins,
        reason: 'origin_not_allowed'
      }, request);
      
      return new NextResponse(null, {
        status: 403,
        statusText: 'Forbidden - CORS policy violation'
      });
    }
    
    // Create preflight response
    const response = new NextResponse(null, {
      status: config.optionsSuccessStatus,
      statusText: 'OK'
    });
    
    return applyCORSHeaders(response, origin, config);
  }
  
  // For non-preflight requests, check origin if present
  if (origin && !isOriginAllowed(origin, config.allowedOrigins)) {
    logger.warn('CORS request blocked', {
      origin,
      method,
      allowedOrigins: config.allowedOrigins,
      reason: 'origin_not_allowed'
    }, request);
    
    return new NextResponse(JSON.stringify({
      error: 'CORS policy violation',
      message: 'Origin not allowed'
    }), {
      status: 403,
      statusText: 'Forbidden',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  // Return null to continue with the request
  // CORS headers will be applied in the response middleware
  return null;
}

// Response middleware to add CORS headers to successful responses
export function corsResponseMiddleware(request: NextRequest, response: NextResponse): NextResponse {
  const config = getCORSConfig();
  const origin = request.headers.get('origin');
  
  // Only apply CORS headers if origin is allowed or if no origin (for same-origin requests)
  if (!origin || isOriginAllowed(origin, config.allowedOrigins)) {
    return applyCORSHeaders(response, origin, config);
  }
  
  return response;
}

// Utility function to validate CORS configuration
export function validateCORSConfig(): { valid: boolean; errors: string[] } {
  const config = getCORSConfig();
  const errors: string[] = [];
  
  // Check if origins are valid URLs
  config.allowedOrigins.forEach(origin => {
    if (origin !== '*' && !origin.includes('*')) {
      try {
        new URL(origin);
      } catch {
        errors.push(`Invalid origin URL: ${origin}`);
      }
    }
  });
  
  // Check methods
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
  config.allowedMethods.forEach(method => {
    if (!validMethods.includes(method.toUpperCase())) {
      errors.push(`Invalid HTTP method: ${method}`);
    }
  });
  
  // Check max age
  if (config.maxAge < 0 || config.maxAge > 86400) {
    errors.push(`Invalid max age: ${config.maxAge}. Should be between 0 and 86400 seconds.`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Export configuration getter for testing
export { getCORSConfig };

// Export types
export type { CORSConfig };