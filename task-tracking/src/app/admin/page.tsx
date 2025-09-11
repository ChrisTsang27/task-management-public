"use client";

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingCard } from '@/components/ui/LoadingSpinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/hooks/useRoleAccess';
import supabase from '@/lib/supabaseBrowserClient';
import { Trash2, ArrowLeft, Filter, X } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

// Lazy load RoleGuard for better code splitting
const RoleGuard = lazy(() => import('@/components/auth/RoleGuard'));
const BulkUserImport = lazy(() => import('@/components/admin/BulkUserImport'));


interface UserProfile {
  id: string;
  full_name: string;
  role: UserRole;
  title?: string;
  department?: string;
  location?: string;
  created_at: string;
}

function AdminPanelContent() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, userId: '', userName: '' });
  const [deletingUser, setDeletingUser] = useState(false);
  const [filters, setFilters] = useState({
    title: 'all',
    department: 'all',
    location: 'all'
  });
  const { toast } = useToast();


  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, title, department, location, created_at')
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
      case 'member': return 'default';
      default: return 'outline';
    }
  };

  // Filter logic
  const filteredUsers = users.filter(user => {
    const titleMatch = !filters.title || filters.title === 'all' || (user.title && user.title.toLowerCase().includes(filters.title.toLowerCase()));
    const departmentMatch = !filters.department || filters.department === 'all' || (user.department && user.department.toLowerCase().includes(filters.department.toLowerCase()));
    const locationMatch = !filters.location || filters.location === 'all' || (user.location && user.location.toLowerCase().includes(filters.location.toLowerCase()));
    return titleMatch && departmentMatch && locationMatch;
  });

  // Get unique values for filter options
  const uniqueTitles = [...new Set(users.map(u => u.title).filter(Boolean))].sort();
  const uniqueDepartments = [...new Set(users.map(u => u.department).filter(Boolean))].sort();
  const uniqueLocations = [...new Set(users.map(u => u.location).filter(Boolean))].sort();

  const clearFilters = () => {
    setFilters({ title: 'all', department: 'all', location: 'all' });
  };

  const hasActiveFilters = (filters.title && filters.title !== 'all') || (filters.department && filters.department !== 'all') || (filters.location && filters.location !== 'all');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="relative overflow-hidden border border-slate-700/50 shadow-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 hover:shadow-blue-500/10 hover:border-blue-500/30 transition-all duration-500 group">
             <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
             <CardContent className="relative p-6">
               <div className="flex items-center justify-between">
                 <div className="space-y-2">
                   <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Users</p>
                   <p className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">{users.length}</p>
                   <div className="flex items-center gap-2 text-xs text-slate-500">
                     <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                     <span>Active System</span>
                   </div>
                 </div>
                 <div className="relative">
                   <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl animate-pulse"></div>
                   <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                     <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                     </svg>
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>
           
           <Card className="relative overflow-hidden border border-slate-700/50 shadow-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 hover:shadow-red-500/10 hover:border-red-500/30 transition-all duration-500 group">
             <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-red-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
             <CardContent className="relative p-6">
               <div className="flex items-center justify-between">
                 <div className="space-y-2">
                   <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Administrators</p>
                   <p className="text-4xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                     {users.filter(u => u.role === 'admin').length}
                   </p>
                   <div className="flex items-center gap-2 text-xs text-slate-500">
                     <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                     <span>System Access</span>
                   </div>
                 </div>
                 <div className="relative">
                   <div className="absolute inset-0 bg-red-500/20 rounded-2xl blur-xl animate-pulse"></div>
                   <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                     <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                     </svg>
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>
           
           <Card className="relative overflow-hidden border border-slate-700/50 shadow-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 hover:shadow-green-500/10 hover:border-green-500/30 transition-all duration-500 group">
             <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
             <CardContent className="relative p-6">
               <div className="flex items-center justify-between">
                 <div className="space-y-2">
                   <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Members</p>
                   <p className="text-4xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
                     {users.filter(u => u.role === 'member').length}
                   </p>
                   <div className="flex items-center gap-2 text-xs text-slate-500">
                     <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                     <span>Team Members</span>
                   </div>
                 </div>
                 <div className="relative">
                   <div className="absolute inset-0 bg-green-500/20 rounded-2xl blur-xl animate-pulse"></div>
                   <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                     <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                     </svg>
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>
         </div>

        {/* Filters Section */}
        <Card className="border border-slate-700/50 shadow-lg bg-slate-800/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-400" />
                <CardTitle className="text-lg font-semibold text-slate-100">Filters</CardTitle>
                {hasActiveFilters && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                    {Object.values(filters).filter(Boolean).length} active
                  </span>
                )}
              </div>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 px-3 text-slate-400 border-slate-600 hover:bg-slate-700 hover:text-slate-200"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Title Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Title</label>
                <Select
                  value={filters.title}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, title: value }))}
                >
                  <SelectTrigger className="border-slate-600 bg-slate-700 text-slate-200 hover:border-slate-500">
                    <SelectValue placeholder="All titles" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-600 bg-slate-700">
                     <SelectItem value="all" className="text-slate-200 hover:bg-slate-600">All titles</SelectItem>
                    {uniqueTitles.map(title => (
                      <SelectItem key={title} value={title!} className="text-slate-200 hover:bg-slate-600">
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Department</label>
                <Select
                  value={filters.department}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}
                >
                  <SelectTrigger className="border-slate-600 bg-slate-700 text-slate-200 hover:border-slate-500">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-600 bg-slate-700">
                     <SelectItem value="all" className="text-slate-200 hover:bg-slate-600">All departments</SelectItem>
                    {uniqueDepartments.map(department => (
                      <SelectItem key={department} value={department!} className="text-slate-200 hover:bg-slate-600">
                        {department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Location</label>
                <Select
                  value={filters.location}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}
                >
                  <SelectTrigger className="border-slate-600 bg-slate-700 text-slate-200 hover:border-slate-500">
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-600 bg-slate-700">
                     <SelectItem value="all" className="text-slate-200 hover:bg-slate-600">All locations</SelectItem>
                    {uniqueLocations.map(location => (
                      <SelectItem key={location} value={location!} className="text-slate-200 hover:bg-slate-600">
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-700 shadow-lg bg-slate-800">
           <CardHeader className="pb-6 border-b border-slate-700">
             <div className="flex items-center justify-between">
               <div>
                 <CardTitle className="text-2xl font-bold text-slate-100">User Management</CardTitle>
                 <CardDescription className="text-slate-400 font-medium">
                   Manage user roles and permissions with ease
                 </CardDescription>
               </div>
               <div className="text-right">
                 <p className="text-sm text-slate-400">
                   Showing {filteredUsers.length} of {users.length} users
                   {hasActiveFilters && (
                     <span className="ml-2 text-blue-400">
                       (filtered)
                     </span>
                   )}
                 </p>
               </div>
             </div>
           </CardHeader>
           <CardContent className="p-0">
             <div className="overflow-x-auto">
               <table className="w-full">
                 <thead className="bg-slate-900 border-b border-slate-700">
                   <tr>
                     <th className="text-center py-3 px-4 font-semibold text-slate-300">Full name</th>
                     <th className="text-center py-3 px-4 font-semibold text-slate-300">Role</th>
                     <th className="text-center py-3 px-4 font-semibold text-slate-300">Title</th>
                     <th className="text-center py-3 px-4 font-semibold text-slate-300">Department</th>
                     <th className="text-center py-3 px-4 font-semibold text-slate-300">Location</th>
                     <th className="text-center py-3 px-4 font-semibold text-slate-300">Actions</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filteredUsers.map((user, index) => (
                     <tr key={user.id} className={`border-b border-slate-700 hover:bg-slate-700 transition-colors ${index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'}`}>
                       <td className="py-3 px-4">
                         <div className="flex items-center space-x-3">
                           <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                             <span className="text-sm font-bold text-slate-200">
                               {(user.full_name || 'U').charAt(0).toUpperCase()}
                             </span>
                           </div>
                           <span className="font-medium text-slate-100">{user.full_name || 'Unknown User'}</span>
                         </div>
                       </td>
                       <td className="py-3 px-4 text-center">
                         <Badge 
                           variant={getRoleBadgeVariant(user.role)}
                           className={`font-medium ${
                             user.role === 'member' 
                               ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700' 
                               : ''
                           }`}
                         >
                           {user.role}
                         </Badge>
                       </td>
                       <td className="py-3 px-4 text-center">
                         <span className="text-slate-300">{user.title || 'No Title'}</span>
                       </td>
                       <td className="py-3 px-4 text-center">
                         <span className="text-slate-300">{user.department || 'No Department'}</span>
                       </td>
                       <td className="py-3 px-4 text-center">
                         <span className="text-slate-300">{user.location || 'No Location'}</span>
                       </td>
                       <td className="py-3 px-4 text-center">
                         <div className="flex items-center justify-center gap-2">
                           <Select
                             value={user.role}
                             onValueChange={(newRole: UserRole) => 
                               updateUserRole(user.id, newRole)
                             }
                           >
                             <SelectTrigger className="w-24 h-8 text-xs border-slate-600 hover:border-slate-500 focus:border-slate-400 transition-all duration-200 bg-slate-700 hover:bg-slate-600 text-slate-200">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="border-slate-600 bg-slate-700">
                               <SelectItem value="member" className="cursor-pointer hover:bg-slate-600 focus:bg-slate-600 text-xs text-slate-200">Member</SelectItem>
                               <SelectItem value="admin" className="cursor-pointer hover:bg-slate-600 focus:bg-slate-600 text-xs text-slate-200">Admin</SelectItem>
                             </SelectContent>
                           </Select>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => handleDeleteUser(user.id, user.full_name || 'Unknown')}
                             className="h-8 px-2 text-red-400 border-red-600 hover:bg-red-600 hover:border-red-500 hover:text-white transition-all duration-200 bg-slate-700"
                           >
                             <Trash2 className="w-3 h-3" />
                           </Button>
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </CardContent>
         </Card>

        {/* Bulk User Import */}
        <Card className="border border-slate-700 shadow-lg bg-slate-800">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-xl font-bold text-slate-100">Bulk User Import</CardTitle>
            <CardDescription className="text-slate-400 font-medium">
              Import multiple users from a CSV file
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Suspense fallback={<LoadingCard />}>
              <BulkUserImport onImportComplete={fetchUsers} />
            </Suspense>
          </CardContent>
        </Card>
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