"use client";

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useRoleAccess, UserRole } from '@/hooks/useRoleAccess';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface RoleGuardProps {
  children: ReactNode;
  requiredRoles: UserRole[];
  fallback?: ReactNode;
  redirectTo?: string;
}

export default function RoleGuard({ 
  children, 
  requiredRoles, 
  fallback,
  redirectTo = '/dashboard'
}: RoleGuardProps) {
  const { canAccess, loading, userRole } = useRoleAccess();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const hasAccess = canAccess(requiredRoles);

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Access Denied
            </CardTitle>
            <CardDescription className="text-gray-600">
              You don&apos;t have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-sm text-gray-500">
              <p>Your current role: <span className="font-medium capitalize">{userRole}</span></p>
              <p>Required roles: <span className="font-medium">{requiredRoles.join(', ')}</span></p>
            </div>
            <div className="space-y-2">
              <Button 
                onClick={() => router.push(redirectTo)} 
                className="w-full"
              >
                Go to Dashboard
              </Button>
              <Button 
                onClick={() => router.back()} 
                variant="outline" 
                className="w-full"
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}