import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { CookieOptions } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Get the current session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Define protected routes (excluding root to prevent loops)
  const protectedRoutes = [
    '/dashboard',
    '/teams',
    '/tasks',
    '/admin'
  ];

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  ) || req.nextUrl.pathname === '/';

  // If accessing a protected route without authentication, redirect to sign-in
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/auth/sign-in', req.url);
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If authenticated and trying to access auth pages, redirect to main dashboard
  if (session && req.nextUrl.pathname.startsWith('/auth/sign-in')) {
    const redirectTo = req.nextUrl.searchParams.get('redirectTo') || '/dashboard';
    // Prevent redirect loops by checking if redirectTo is the same as current path
    if (redirectTo !== req.nextUrl.pathname) {
      return NextResponse.redirect(new URL(redirectTo, req.url));
    }
  }

  // If authenticated and accessing /dashboard, allow it (no redirect to root)
  // The dashboard page will handle the display logic

  // Allow auth pages to load without interference
  if (req.nextUrl.pathname.startsWith('/auth/')) {
    return response;
  }

  // Add user ID to headers for API routes if authenticated
  if (session && req.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('x-user-id', session.user.id);
  }

  // Add caching headers for static assets
  if (req.nextUrl.pathname.startsWith('/_next/static/') || 
      req.nextUrl.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // Add caching headers for API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    // Default cache for API routes (can be overridden in individual routes)
    if (!response.headers.get('Cache-Control')) {
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    }
  }

  // Add security and performance headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};