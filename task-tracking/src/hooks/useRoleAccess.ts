"use client";

import { useSupabaseProfile } from './useSupabaseProfile';

type UserRole = 'admin' | 'member';

interface RolePermissions {
  canAccessAdmin: boolean;
  canManageUsers: boolean;
  canManageTeams: boolean;
  canCreateTasks: boolean;
  canEditAllTasks: boolean;
  canDeleteTasks: boolean;
  canViewReports: boolean;
}

const roleHierarchy: Record<UserRole, number> = {
  member: 1,
  admin: 2,
};

const getPermissions = (role: UserRole): RolePermissions => {
  const level = roleHierarchy[role];
  
  return {
    canAccessAdmin: level >= roleHierarchy.admin,
    canManageUsers: level >= roleHierarchy.admin,
    canManageTeams: level >= roleHierarchy.admin,
    canCreateTasks: true, // All users can create tasks
    canEditAllTasks: level >= roleHierarchy.admin,
    canDeleteTasks: level >= roleHierarchy.admin,
    canViewReports: level >= roleHierarchy.admin,
  };
};

export const useRoleAccess = () => {
  const { profile, loading } = useSupabaseProfile();
  
  const userRole = (profile?.role as UserRole) || 'member';
  const permissions = getPermissions(userRole);
  
  const hasRole = (requiredRole: UserRole): boolean => {
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  };
  
  const hasPermission = (permission: keyof RolePermissions): boolean => {
    return permissions[permission];
  };
  
  const canAccess = (requiredRoles: UserRole[]): boolean => {
    return requiredRoles.some(role => hasRole(role));
  };
  
  return {
    userRole,
    permissions,
    hasRole,
    hasPermission,
    canAccess,
    loading,
    isAdmin: hasRole('admin'),
    isMember: userRole === 'member',
  };
};

export type { UserRole, RolePermissions };