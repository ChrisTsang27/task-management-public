"use client";

import { useEffect, useState } from "react";

import RoleGuard from "@/components/auth/RoleGuard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useSupabaseProfile } from "@/hooks/useSupabaseProfile";
import supabase from "@/lib/supabaseBrowserClient";

import type { User } from "@supabase/supabase-js";

function DashboardContent() {
  const { profile, loading } = useSupabaseProfile();
  const { userRole } = useRoleAccess();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);



  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'member': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Welcome Back!</CardTitle>
            <CardDescription>
              {profile?.full_name || user?.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Email:</strong> {user?.email}</p>
              <div className="flex items-center gap-2">
                <strong>Role:</strong> 
                <Badge variant={getRoleBadgeVariant(userRole)}>
                  {userRole}
                </Badge>
              </div>
              {profile?.department && (
                <p><strong>Department:</strong> {profile.department}</p>
              )}
              {profile?.location && (
                <p><strong>Location:</strong> {profile.location}</p>
              )}
            </div>
          </CardContent>
        </Card>



        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current system information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Status:</strong> <span className="text-green-600">Online</span></p>
              <p><strong>Last Login:</strong> {new Date().toLocaleDateString()}</p>
              <p><strong>Account Type:</strong> {profile?.role || 'Standard'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RoleGuard requiredRoles={['member', 'admin']}>
      <DashboardContent />
    </RoleGuard>
  );
}