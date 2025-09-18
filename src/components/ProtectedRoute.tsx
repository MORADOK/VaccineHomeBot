/**
 * Protected Route Component
 * Wraps components that require admin access
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, Lock, LogOut } from 'lucide-react';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { AdminLogin } from './AdminLogin';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  fallback?: React.ReactNode;
  showLoginForm?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requiredPermission,
  fallback,
  showLoginForm = true
}: ProtectedRouteProps) {
  const { user, isLoading, isAdmin, hasPermission, logout } = useAdminAuth();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Shield className="h-8 w-8 animate-pulse text-blue-500 mx-auto mb-4" />
            <p className="text-muted-foreground">กำลังตรวจสอบสิทธิ์...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    if (showLoginForm) {
      return <AdminLogin />;
    }

    return fallback || (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <Lock className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-red-700">Access Restricted</h3>
              <p className="text-sm text-muted-foreground mt-2">
                คุณต้องเป็น Admin เพื่อเข้าถึงส่วนนี้
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <Lock className="h-12 w-12 text-orange-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-orange-700">Insufficient Permissions</h3>
              <p className="text-sm text-muted-foreground mt-2">
                คุณไม่มีสิทธิ์เข้าถึงฟีเจอร์นี้
              </p>
              <p className="text-xs text-muted-foreground">
                Required: {requiredPermission}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {/* Admin Status Bar */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Admin Mode: {user?.email}
            </span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {user?.role}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={logout}
            className="text-blue-600 hover:text-blue-800"
          >
            <LogOut className="h-3 w-3 mr-1" />
            Logout
          </Button>
        </div>
      </div>

      {children}
    </div>
  );
}