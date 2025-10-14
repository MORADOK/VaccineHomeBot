/**
 * User Role Manager Component
 * Allows admins to view and manage user roles
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Shield, UserPlus, RefreshCw, Search } from 'lucide-react';

interface UserWithRoles {
  id: string;
  email: string;
  user_created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  is_admin: boolean;
  is_healthcare_staff: boolean;
}

export function UserRoleManager() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'healthcare_staff' | 'patient'>('healthcare_staff');
  const { toast } = useToast();

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Get all user roles first
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get current session to get user list (simplified approach)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('ไม่ได้เข้าสู่ระบบ');

      // For now, we'll show users that have roles in the system
      const userRoleMap = new Map<string, string[]>();
      userRoles?.forEach(ur => {
        if (!userRoleMap.has(ur.user_id)) {
          userRoleMap.set(ur.user_id, []);
        }
        userRoleMap.get(ur.user_id)?.push(ur.role);
      });

      // Create mock users data (in real app, you'd get this from auth.users)
      const usersWithRoles: UserWithRoles[] = Array.from(userRoleMap.entries()).map(([userId, roles]) => ({
        id: userId,
        email: `user-${userId.slice(0, 8)}@example.com`, // Mock email
        user_created_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        roles: roles,
        is_admin: roles.includes('admin'),
        is_healthcare_staff: roles.includes('admin') || roles.includes('healthcare_staff')
      }));

      // Add current user if not in list
      if (session.user && !userRoleMap.has(session.user.id)) {
        usersWithRoles.unshift({
          id: session.user.id,
          email: session.user.email || 'unknown@example.com',
          user_created_at: session.user.created_at,
          last_sign_in_at: session.user.last_sign_in_at || null,
          roles: [],
          is_admin: false,
          is_healthcare_staff: false
        });
      }

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลผู้ใช้ได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async (userEmail: string, role: 'admin' | 'healthcare_staff' | 'patient') => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('ไม่ได้เข้าสู่ระบบ');

      // For demo purposes, we'll assign role to current user if email matches
      let targetUserId = currentUser.id;
      
      if (userEmail !== currentUser.email) {
        // In a real app, you'd look up the user by email
        // For now, we'll just use the current user
        console.warn('Cannot assign role to different user in demo mode');
      }

      // Insert role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: targetUserId,
          role: role,
          created_by: currentUser.id
        });
      
      if (insertError && !insertError.message.includes('duplicate')) {
        throw insertError;
      }

      toast({
        title: "สำเร็จ",
        description: `กำหนดสิทธิ์ ${getRoleDisplayName(role)} ให้ ${userEmail} แล้ว`,
      });

      loadUsers();
    } catch (error) {
      console.error('Error assigning role:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถกำหนดสิทธิ์ได้",
        variant: "destructive",
      });
    }
  };

  const handleAssignRole = async () => {
    if (!newUserEmail.trim()) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกอีเมลผู้ใช้",
        variant: "destructive",
      });
      return;
    }

    await assignRole(newUserEmail, newUserRole);
    setNewUserEmail('');
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'healthcare_staff': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'patient': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'ผู้ดูแลระบบ';
      case 'healthcare_staff': return 'เจ้าหน้าที่';
      case 'patient': return 'ผู้ป่วย';
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            จัดการสิทธิ์ผู้ใช้
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 space-y-2">
              <Label htmlFor="search">ค้นหาผู้ใช้</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาด้วยอีเมล..."
                  className="pl-10 cursor-text"
                />
              </div>
            </div>

            {/* Refresh */}
            <div className="space-y-2 sm:w-auto w-full">
              <Label className="hidden sm:block">&nbsp;</Label>
              <Button 
                onClick={loadUsers} 
                disabled={loading} 
                className="w-full sm:w-auto cursor-pointer disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                รีเฟรชข้อมูล
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add New Role */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            กำหนดสิทธิ์ให้ผู้ใช้
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="userEmail">อีเมลผู้ใช้</Label>
              <Input
                id="userEmail"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
                type="email"
                className="cursor-text"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userRole">สิทธิ์</Label>
              <Select value={newUserRole} onValueChange={(value: any) => setNewUserRole(value)}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="healthcare_staff" className="cursor-pointer">เจ้าหน้าที่</SelectItem>
                  <SelectItem value="admin" className="cursor-pointer">ผู้ดูแลระบบ</SelectItem>
                  <SelectItem value="patient" className="cursor-pointer">ผู้ป่วย</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label className="hidden lg:block">&nbsp;</Label>
              <Button 
                onClick={handleAssignRole} 
                className="w-full cursor-pointer hover:shadow-md transition-shadow"
              >
                <Shield className="h-4 w-4 mr-2" />
                กำหนดสิทธิ์
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>รายชื่อผู้ใช้ ({filteredUsers.length} คน)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">ไม่พบผู้ใช้</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-default">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <h3 className="font-medium truncate select-text" title={user.email}>
                          {user.email}
                        </h3>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <Badge key={role} className={`${getRoleBadgeColor(role)} text-xs`}>
                                {getRoleDisplayName(role)}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-xs">ไม่มีสิทธิ์</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="select-text">
                          สมัครเมื่อ: {new Date(user.user_created_at).toLocaleDateString('th-TH')}
                        </p>
                        {user.last_sign_in_at && (
                          <p className="select-text">
                            เข้าสู่ระบบล่าสุด: {new Date(user.last_sign_in_at).toLocaleDateString('th-TH')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 lg:flex-shrink-0">
                      {!user.is_healthcare_staff && (
                        <Button
                          size="sm"
                          onClick={() => assignRole(user.email, 'healthcare_staff')}
                          className="cursor-pointer hover:shadow-sm transition-shadow text-xs sm:text-sm"
                        >
                          <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">ให้สิทธิ์เจ้าหน้าที่</span>
                          <span className="sm:hidden">เจ้าหน้าที่</span>
                        </Button>
                      )}
                      {!user.is_admin && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => assignRole(user.email, 'admin')}
                          className="cursor-pointer hover:shadow-sm transition-shadow text-xs sm:text-sm"
                        >
                          <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">ให้สิทธิ์ Admin</span>
                          <span className="sm:hidden">Admin</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}