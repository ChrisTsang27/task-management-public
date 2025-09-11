import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) { // 15 minutes default
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getClientId(request: NextRequest): string {
    // Try to get user ID from auth header first
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      // Use a hash of the auth token as identifier
      const token = authHeader.replace('Bearer ', '');
      return `auth:${token.substring(0, 20)}`; // Use first 20 chars as identifier
    }
    
    // Fallback to IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    return `ip:${ip}`;
  }

  public isRateLimited(request: NextRequest): { limited: boolean; remaining: number; resetTime: number } {
    const clientId = this.getClientId(request);
    const now = Date.now();
    const resetTime = now + this.windowMs;

    if (!this.store[clientId] || this.store[clientId].resetTime < now) {
      // First request or window expired
      this.store[clientId] = {
        count: 1,
        resetTime
      };
      return {
        limited: false,
        remaining: this.maxRequests - 1,
        resetTime
      };
    }

    this.store[clientId].count++;
    const remaining = Math.max(0, this.maxRequests - this.store[clientId].count);

    return {
      limited: this.store[clientId].count > this.maxRequests,
      remaining,
      resetTime: this.store[clientId].resetTime
    };
  }
}

// Create different rate limiters for different endpoints
const generalLimiter = new RateLimiter(
  parseInt(process.env.RATE_LIMIT_MAX || '100'),
  parseInt(process.env.RATE_LIMIT_WINDOW || '900000') // 15 minutes
);

const authLimiter = new RateLimiter(20, 15 * 60 * 1000); // 20 requests per 15 minutes for auth
const uploadLimiter = new RateLimiter(10, 60 * 60 * 1000); // 10 uploads per hour

export function createRateLimitMiddleware(limiter: RateLimiter) {
  return (request: NextRequest) => {
    const { limited, remaining, resetTime } = limiter.isRateLimited(request);

    if (limited) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limiter['maxRequests'].toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }

    return null; // No rate limit hit
  };
}

export const rateLimiters = {
  general: createRateLimitMiddleware(generalLimiter),
  auth: createRateLimitMiddleware(authLimiter),
  upload: createRateLimitMiddleware(uploadLimiter)
};

export { generalLimiter, authLimiter, uploadLimiter };