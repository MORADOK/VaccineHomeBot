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

// Admin users configuration
const ADMIN_USERS = [
  {
    email: 'admin@vchomehospital.co.th',
    password: 'admin123',
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

// Check if user is admin by email domain or specific emails
const isAdminUser = (email: string): boolean => {
  // Allow any @vchomehospital.co.th email as admin
  if (email.endsWith('@vchomehospital.co.th')) {
    return true;
  }
  
  // Allow specific admin emails
  const adminEmails = [
    'admin@gmail.com',
    'admin@example.com',
    'test@admin.com',
    // Add more admin emails here
  ];
  
  return adminEmails.includes(email.toLowerCase());
};

export function useAdminAuth(): UseAdminAuthReturn {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Check Supabase auth first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.email && isAdminUser(session.user.email)) {
        const adminUser: AdminUser = {
          id: session.user.id,
          email: session.user.email,
          role: session.user.email.endsWith('@vchomehospital.co.th') ? 'admin' : 'admin',
          permissions: ADMIN_PERMISSIONS,
          isAdmin: true,
          isSuperAdmin: session.user.email === 'superadmin@vchomehospital.co.th'
        };
        setUser(adminUser);
        localStorage.setItem('admin_user', JSON.stringify(adminUser));
        setIsLoading(false);
        return;
      }

      // Check localStorage for custom admin login
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
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email && isAdminUser(session.user.email)) {
        const adminUser: AdminUser = {
          id: session.user.id,
          email: session.user.email,
          role: session.user.email.endsWith('@vchomehospital.co.th') ? 'admin' : 'admin',
          permissions: ADMIN_PERMISSIONS,
          isAdmin: true,
          isSuperAdmin: session.user.email === 'superadmin@vchomehospital.co.th'
        };
        setUser(adminUser);
        localStorage.setItem('admin_user', JSON.stringify(adminUser));
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('admin_user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // First try Supabase auth for existing users
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (data.user && isAdminUser(email)) {
        // Supabase user is admin
        const adminUser: AdminUser = {
          id: data.user.id,
          email: data.user.email!,
          role: email.endsWith('@vchomehospital.co.th') ? 'admin' : 'admin',
          permissions: ADMIN_PERMISSIONS,
          isAdmin: true,
          isSuperAdmin: email === 'superadmin@vchomehospital.co.th'
        };

        setUser(adminUser);
        localStorage.setItem('admin_user', JSON.stringify(adminUser));
        return;
      }

      // If Supabase auth fails, try demo admin accounts
      if (authError) {
        const adminUser = ADMIN_USERS.find(
          u => u.email === email && u.password === password
        );

        if (!adminUser) {
          throw new Error('Invalid credentials. Please check your email and password.');
        }

        const user: AdminUser = {
          id: `demo_admin_${Date.now()}`,
          email: adminUser.email,
          role: adminUser.role,
          permissions: adminUser.permissions,
          isAdmin: true,
          isSuperAdmin: adminUser.role === 'superadmin'
        };

        setUser(user);
        localStorage.setItem('admin_user', JSON.stringify(user));
        return;
      }

      // User exists but is not admin
      if (data.user && !isAdminUser(email)) {
        await supabase.auth.signOut();
        throw new Error('Access denied. Admin privileges required.');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    // Sign out from Supabase if signed in
    await supabase.auth.signOut();
    
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