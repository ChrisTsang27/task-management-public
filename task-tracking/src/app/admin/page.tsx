"use client";

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingCard } from '@/components/ui/LoadingSpinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/hooks/useRoleAccess';
import supabase from '@/lib/supabaseBrowserClient';
import { Trash2, ArrowLeft } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

// Lazy load RoleGuard for better code splitting
const RoleGuard = lazy(() => import('@/components/auth/RoleGuard'));
const BulkUserImport = lazy(() => import('@/components/admin/BulkUserImport'));


interface UserProfile {
  id: string;
  full_name: string;
  role: UserRole;
  department?: string;
  location?: string;
  created_at: string;
}

function AdminPanelContent() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, userId: '', userName: '' });
  const [deletingUser, setDeletingUser] = useState(false);
  const { toast } = useToast();


  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('full_name', 'like', '%[DELETED USER]%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));

      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    setDeleteConfirmation({
      open: true,
      userId,
      userName
    });
  };

  const confirmDeleteUser = async () => {
    try {
      setDeletingUser(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/users/${deleteConfirmation.userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to delete user';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(`${errorMessage} (${response.status})`);
      }

      // Remove user from local state
      setUsers(prev => prev.filter(user => user.id !== deleteConfirmation.userId));
      setDeleteConfirmation({ open: false, userId: '', userName: '' });
      
      toast({
        title: 'Success',
        description: 'User deleted successfully!',
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete user. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingUser(false);
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'member': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex flex-col gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 w-fit bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Task Management
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/dashboard'}
            className="flex items-center gap-2 w-fit bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-gray-600 mt-2">Manage users and system settings</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
            <CardDescription>
              Quick statistics about your system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{users.length}</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {users.filter(u => u.role === 'admin').length}
                </div>
                <div className="text-sm text-gray-600">Admins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {users.filter(u => u.role === 'member').length}
                </div>
                <div className="text-sm text-gray-600">Members</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage user roles and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="group hover:bg-slate-100 hover:text-slate-900 transition-colors">
                    <TableCell className="font-medium hover:text-slate-900">
                      {user.full_name || 'Unknown'}
                    </TableCell>
                    <TableCell className="hover:text-slate-900">{user.department || '-'}</TableCell>
                    <TableCell className="hover:text-slate-900">{user.location || '-'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={getRoleBadgeVariant(user.role)}
                        className="cursor-pointer hover:opacity-80 transition-opacity group-hover:bg-slate-700 group-hover:text-white"
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="hover:text-slate-900">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(newRole: UserRole) => 
                          updateUserRole(user.id, newRole)
                        }
                      >
                        <SelectTrigger className="w-32 group-hover:bg-white group-hover:text-slate-900 group-hover:border-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member" className="cursor-pointer">Member</SelectItem>
                          <SelectItem value="admin" className="cursor-pointer">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id, user.full_name || 'Unknown')}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Bulk User Import */}
        <Suspense fallback={<LoadingCard />}>
          <BulkUserImport onImportComplete={fetchUsers} />
        </Suspense>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteConfirmation.open}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmation({ open: false, userId: '', userName: '' });
        }}
        title="Delete User"
        description={`Are you sure you want to delete "${deleteConfirmation.userName}"? This action cannot be undone and will remove the user from both the application and authentication system.`}
        confirmText="Delete User"
        cancelText="Cancel"
        onConfirm={confirmDeleteUser}
        loading={deletingUser}
        variant="destructive"
      />
     </div>
   );
 }

export default function AdminPage() {
  return (
    <Suspense fallback={<LoadingCard />}>
      <RoleGuard requiredRoles={['admin']}>
        <AdminPanelContent />
      </RoleGuard>
    </Suspense>
  );
}