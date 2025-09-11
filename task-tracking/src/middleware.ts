import { NextRequest, NextResponse } from 'next/server';
import { corsMiddleware, corsResponseMiddleware } from './lib/middleware/cors';
import { logger } from './lib/logger';
import { monitoring } from './lib/monitoring';

// Paths that should be excluded from middleware processing
const excludedPaths = [
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
  '/sw.js',
  '/workbox-',
  '/static'
];

// API paths that require CORS handling
const apiPaths = ['/api'];

// Check if path should be processed by middleware
function shouldProcessPath(pathname: string): boolean {
  // Skip excluded paths
  if (excludedPaths.some(path => pathname.startsWith(path))) {
    return false;
  }
  
  // Process API routes
  if (apiPaths.some(path => pathname.startsWith(path))) {
    return true;
  }
  
  // Process other routes in production for security headers
  return process.env.NODE_ENV === 'production';
}

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  
  // Skip processing for excluded paths
  if (!shouldProcessPath(pathname)) {
    return NextResponse.next();
  }
  
  try {
    // Log request for monitoring
    const requestId = await logger.logAPIRequest(request);
    
    // Apply CORS middleware for API routes
    if (pathname.startsWith('/api')) {
      const corsResponse = corsMiddleware(request);
      if (corsResponse) {
        // CORS middleware returned a response (preflight or blocked request)
        const responseTime = Date.now() - startTime;
        monitoring.recordRequest(responseTime, corsResponse.status >= 400);
        
        await logger.logAPIResponse(requestId, corsResponse.status, responseTime, request);
        return corsResponse;
      }
    }
    
    // Continue with the request
    const response = NextResponse.next();
    
    // Apply security headers and CORS headers to the response
    const enhancedResponse = enhanceResponse(request, response);
    
    // Record successful middleware processing
    const responseTime = Date.now() - startTime;
    monitoring.recordRequest(responseTime, false);
    
    await logger.logAPIResponse(requestId, enhancedResponse.status, responseTime, request);
    
    return enhancedResponse;
    
  } catch (error) {
    // Log middleware error
    await logger.error('Middleware error', error as Error, {
      pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent')
    }, request);
    
    // Record error
    const responseTime = Date.now() - startTime;
    monitoring.recordRequest(responseTime, true);
    
    // Return a generic error response
    return new NextResponse(JSON.stringify({
      error: 'Internal server error',
      message: 'An error occurred while processing your request'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// Enhance response with security headers and CORS
function enhanceResponse(request: NextRequest, response: NextResponse): NextResponse {
  const { pathname } = request.nextUrl;
  
  // Apply CORS headers for API routes
  if (pathname.startsWith('/api')) {
    response = corsResponseMiddleware(request, response);
  }
  
  // Apply security headers
  response = addSecurityHeaders(response);
  
  // Add monitoring headers
  response = addMonitoringHeaders(response);
  
  return response;
}

// Add security headers to response
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval and unsafe-inline
    "style-src 'self' 'unsafe-inline'", // Allow inline styles for CSS-in-JS
    "img-src 'self' data: https:", // Allow images from self, data URLs, and HTTPS
    "font-src 'self' data:", // Allow fonts from self and data URLs
    "connect-src 'self' https:", // Allow connections to self and HTTPS
    "frame-ancestors 'none'", // Prevent framing
    "base-uri 'self'", // Restrict base URI
    "form-action 'self'" // Restrict form actions
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Other security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  return response;
}

// Add monitoring and debugging headers
function addMonitoringHeaders(response: NextResponse): NextResponse {
  // Add server information (non-sensitive)
  response.headers.set('X-Powered-By', 'Next.js');
  response.headers.set('X-Environment', process.env.NODE_ENV || 'development');
  
  // Add timestamp for debugging
  response.headers.set('X-Timestamp', new Date().toISOString());
  
  // Add request ID for tracing (if available)
  const requestId = response.headers.get('x-request-id');
  if (requestId) {
    response.headers.set('X-Request-ID', requestId);
  }
  
  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
  ],
};