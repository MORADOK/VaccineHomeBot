/**
 * Secure Admin Authentication Hook
 * ✅ No hardcoded passwords
 * ✅ Full Supabase integration
 * ✅ Proper session management
 * ✅ Role-based access control via database
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

// Permission sets based on roles
const PERMISSIONS_MAP: Record<string, string[]> = {
  admin: [
    'domain:read',
    'domain:write',
    'domain:delete',
    'vaccine:read',
    'vaccine:write',
    'appointments:read',
    'appointments:write',
    'system:settings'
  ],
  superadmin: [
    'domain:read',
    'domain:write',
    'domain:delete',
    'domain:force_delete',
    'vaccine:read',
    'vaccine:write',
    'appointments:read',
    'appointments:write',
    'users:manage',
    'system:admin',
    'system:settings'
  ],
  healthcare_staff: [
    'appointments:read',
    'appointments:write',
    'vaccine:read',
    'vaccine:write'
  ]
};

/**
 * Get permissions array for a given role
 */
function getPermissionsForRole(role: string): string[] {
  return PERMISSIONS_MAP[role] || [];
}

/**
 * Fetch user role from Supabase
 */
async function fetchUserRole(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching user role:', error);
    return null;
  }

  return data?.role || null;
}

/**
 * Create AdminUser object from Supabase user
 */
async function createAdminUser(userId: string, email: string): Promise<AdminUser | null> {
  // Fetch role from database
  const role = await fetchUserRole(userId);

  if (!role) {
    return null;
  }

  // Check if user has admin privileges
  const isAdmin = role === 'admin' || role === 'superadmin';
  const isSuperAdmin = role === 'superadmin';

  // Get permissions based on role
  const permissions = getPermissionsForRole(role);

  return {
    id: userId,
    email,
    role,
    permissions,
    isAdmin,
    isSuperAdmin
  };
}

export function useAdminAuth(): UseAdminAuthReturn {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        // Create admin user object
        const adminUser = await createAdminUser(
          session.user.id,
          session.user.email!
        );

        if (adminUser) {
          setUser(adminUser);
        } else {
          // User exists but has no role
          console.warn('User has no role assigned');
        }

      } catch (error) {
        console.error('Auth check error:', error);
        setError(error instanceof Error ? error.message : 'Authentication failed');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setError(null);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const adminUser = await createAdminUser(
            session.user.id,
            session.user.email!
          );

          if (adminUser) {
            setUser(adminUser);
            setError(null);
          } else {
            setError('User does not have required permissions');
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Sign in with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!data.user) {
        throw new Error('No user data returned');
      }

      // Create admin user object
      const adminUser = await createAdminUser(data.user.id, data.user.email!);

      if (!adminUser) {
        // User exists but doesn't have admin role
        await supabase.auth.signOut();
        throw new Error('Access denied. Admin privileges required.');
      }

      setUser(adminUser);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
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
