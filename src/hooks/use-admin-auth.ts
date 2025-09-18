/**
 * Admin Authentication Hook
 * Manages admin role verification and access control
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export interface UseAdminAuthReturn {
  user: AdminUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

// Default admin permissions
const ADMIN_PERMISSIONS = [
  'domain:read',
  'domain:write',
  'domain:delete',
  'vaccine:read',
  'vaccine:write',
  'appointments:read',
  'appointments:write',
  'system:settings'
];

const SUPER_ADMIN_PERMISSIONS = [
  ...ADMIN_PERMISSIONS,
  'users:manage',
  'system:admin',
  'domain:force_delete'
];

// Temporary admin users (in production, this should come from database)
const ADMIN_USERS = [
  {
    email: 'admin@vchomehospital.co.th',
    password: 'admin123', // In production, use proper hashing
    role: 'admin',
    permissions: ADMIN_PERMISSIONS
  },
  {
    email: 'superadmin@vchomehospital.co.th', 
    password: 'superadmin123',
    role: 'superadmin',
    permissions: SUPER_ADMIN_PERMISSIONS
  }
];

export function useAdminAuth(): UseAdminAuthReturn {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('admin_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (err) {
        localStorage.removeItem('admin_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Find admin user (in production, verify against database)
      const adminUser = ADMIN_USERS.find(
        u => u.email === email && u.password === password
      );

      if (!adminUser) {
        throw new Error('Invalid admin credentials');
      }

      const user: AdminUser = {
        id: `admin_${Date.now()}`,
        email: adminUser.email,
        role: adminUser.role,
        permissions: adminUser.permissions,
        isAdmin: true,
        isSuperAdmin: adminUser.role === 'superadmin'
      };

      setUser(user);
      localStorage.setItem('admin_user', JSON.stringify(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setUser(null);
    localStorage.removeItem('admin_user');
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions.includes(permission) || false;
  };

  return {
    user,
    isLoading,
    isAdmin: user?.isAdmin || false,
    isSuperAdmin: user?.isSuperAdmin || false,
    hasPermission,
    login,
    logout,
    error
  };
}