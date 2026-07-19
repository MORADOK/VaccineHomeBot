import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RequireAdminProps {
  children: ReactNode;
}

/**
 * RequireAdmin Component - Route Protection for Admin Pages
 *
 * ✅ Checks if user is authenticated
 * ✅ Checks if user has admin role (from user_roles table)
 * ✅ Shows loading state while checking
 * ✅ Redirects to /auth if not admin
 * ✅ Shows toast notification when access denied
 *
 * Usage:
 * <Route
 *   path="/admin-page"
 *   element={<RequireAdmin><AdminPage /></RequireAdmin>}
 * />
 */
export const RequireAdmin: React.FC<RequireAdminProps> = ({ children }) => {
  const location = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAdminAccess();
  }, [location.pathname]);

  const checkAdminAccess = async () => {
    try {
      // Step 1: Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[RequireAdmin] Session error:', sessionError);
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      if (!session?.user) {
        console.log('[RequireAdmin] No authenticated user');
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      setUser(session.user);

      // Step 2: Check user role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      if (roleError) {
        console.error('[RequireAdmin] Role check error:', roleError);
        setIsAdmin(false);
        setIsLoading(false);

        // Show toast notification
        toast({
          title: '❌ ไม่มีสิทธิ์เข้าถึง',
          description: 'บัญชีของคุณยังไม่ได้รับสิทธิ์ กรุณาติดต่อผู้ดูแลระบบ',
          variant: 'destructive',
        });
        return;
      }

      // Step 3: Check if role is admin or superadmin
      const userRole = roleData?.role;
      const hasAdminAccess = userRole === 'admin' || userRole === 'superadmin';

      console.log('[RequireAdmin] User role:', userRole);
      console.log('[RequireAdmin] Has admin access:', hasAdminAccess);

      setIsAdmin(hasAdminAccess);
      setIsLoading(false);

      // Show access denied notification if not admin
      if (!hasAdminAccess) {
        toast({
          title: '⛔ ไม่อนุญาต',
          description: 'หน้านี้สำหรับผู้ดูแลระบบเท่านั้น',
          variant: 'destructive',
        });
      }

    } catch (error) {
      console.error('[RequireAdmin] Unexpected error:', error);
      setIsAdmin(false);
      setIsLoading(false);

      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถตรวจสอบสิทธิ์การเข้าถึงได้',
        variant: 'destructive',
      });
    }
  };

  // Loading state - show spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-medium">
            กำลังตรวจสอบสิทธิ์การเข้าถึง...
          </p>
        </div>
      </div>
    );
  }

  // Not admin - redirect to auth page
  if (!isAdmin) {
    console.log('[RequireAdmin] Access denied, redirecting to /auth');
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Admin - allow access
  console.log('[RequireAdmin] Access granted for:', user?.email);
  return <>{children}</>;
};

// Named export as default
export default RequireAdmin;
