import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserPlus, Trash2, Shield, Users, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface StaffMember {
  id: string;
  email: string;
  role: string;
  created_at: string;
  email_confirmed_at?: string | null;
}

/**
 * Staff Management Page - For Admin Only
 *
 * ✅ Uses Supabase Edge Functions (Secure!)
 *
 * Features:
 * - View all staff members (via list-staff function)
 * - Create new staff accounts (via create-staff function)
 * - Assign roles (admin, healthcare_staff)
 * - Delete staff accounts (via delete-staff function)
 * - User-friendly UI with confirmations
 */
const StaffManagementPage = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'healthcare_staff'>('healthcare_staff');

  const { toast } = useToast();

  useEffect(() => {
    loadStaffMembers();
  }, []);

  /**
   * Load staff members using Edge Function
   * ✅ Secure: Uses Edge Function instead of admin API
   */
  const loadStaffMembers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-staff');

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.success) {
        setStaffMembers(data.data || []);
      } else {
        throw new Error(data?.error || 'Failed to load staff');
      }
    } catch (error) {
      console.error('Error loading staff:', error);
      toast({
        title: '❌ ไม่สามารถโหลดรายการพนักงาน',
        description: 'เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create staff using Edge Function
   * ✅ Secure: Uses Edge Function instead of admin API
   */
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-staff', {
        body: {
          email: newEmail,
          password: newPassword,
          role: newRole,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.success) {
        // Success!
        toast({
          title: '✅ สร้างบัญชีพนักงานสำเร็จ',
          description: `สร้างบัญชี ${newEmail} (${newRole}) เรียบร้อยแล้ว`,
        });

        // Reset form
        setNewEmail('');
        setNewPassword('');
        setNewRole('healthcare_staff');
        setShowCreateForm(false);

        // Reload staff list
        loadStaffMembers();
      } else {
        // Handle specific errors
        const errorMessage = data?.error || 'Unknown error';
        const errorDetails = data?.details || '';

        if (errorMessage.includes('Email already registered')) {
          toast({
            title: '❌ อีเมลนี้ถูกใช้งานแล้ว',
            description: 'กรุณาใช้อีเมลอื่น',
            variant: 'destructive',
          });
        } else if (errorMessage.includes('Password too short')) {
          toast({
            title: '❌ รหัสผ่านสั้นเกินไป',
            description: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
            variant: 'destructive',
          });
        } else {
          toast({
            title: '❌ ไม่สามารถสร้างบัญชีได้',
            description: errorDetails || errorMessage,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Create staff error:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถสร้างบัญชีพนักงานได้ กรุณาลองใหม่',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Delete staff using Edge Function
   * ✅ Secure: Uses Edge Function instead of admin API
   */
  const handleDeleteStaff = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke('delete-staff', {
        body: {
          user_id: deleteTarget.id,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.success) {
        toast({
          title: '✅ ลบบัญชีพนักงานสำเร็จ',
          description: `ลบบัญชี ${deleteTarget.email} เรียบร้อยแล้ว`,
        });

        // Reload staff list
        loadStaffMembers();
      } else {
        const errorMessage = data?.error || 'Failed to delete user';
        const errorDetails = data?.details || '';

        toast({
          title: '❌ ไม่สามารถลบบัญชีได้',
          description: errorDetails || errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Delete staff error:', error);
      toast({
        title: '❌ ไม่สามารถลบบัญชีได้',
        description: 'เกิดข้อผิดพลาดในการลบบัญชี กรุณาลองใหม่',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'superadmin':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'healthcare_staff':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
      case 'superadmin':
        return <Shield className="h-3 w-3" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'ผู้ดูแลระบบ';
      case 'superadmin':
        return 'Super Admin';
      case 'healthcare_staff':
        return 'เจ้าหน้าที่';
      default:
        return role;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              จัดการบัญชีพนักงาน
            </h1>
            <p className="text-muted-foreground mt-2">
              เพิ่ม แก้ไข และจัดการบัญชีพนักงานทั้งหมด
            </p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            เพิ่มพนักงานใหม่
          </Button>
        </div>

        {/* Info Alert */}
        <Alert className="border-blue-500 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">ℹ️ ใช้ Edge Functions (Secure)</AlertTitle>
          <AlertDescription className="text-blue-700 text-sm">
            หน้านี้ใช้ Supabase Edge Functions สำหรับการจัดการบัญชี ปลอดภัย 100%
            <br />
            Service Role Key ไม่ได้ถูกเปิดเผยใน frontend
          </AlertDescription>
        </Alert>

        {/* Create Staff Form */}
        {showCreateForm && (
          <Card className="border-2 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-green-600" />
                สร้างบัญชีพนักงานใหม่
              </CardTitle>
              <CardDescription>
                กรอกข้อมูลเพื่อสร้างบัญชีพนักงาน บัญชีจะถูกยืนยันอีเมลอัตโนมัติ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateStaff} className="space-y-4">
                <Alert className="border-blue-500 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">ℹ️ คำแนะนำ</AlertTitle>
                  <AlertDescription className="text-blue-700 text-sm">
                    • รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร<br />
                    • บัญชีที่สร้างจะถูกยืนยันอีเมลอัตโนมัติ<br />
                    • พนักงานสามารถเข้าสู่ระบบได้ทันที
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-email">อีเมล *</Label>
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="staff@hospital.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      disabled={isCreating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">รหัสผ่าน *</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={isCreating}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-role">ตำแหน่ง *</Label>
                  <Select
                    value={newRole}
                    onValueChange={(value: 'admin' | 'healthcare_staff') => setNewRole(value)}
                    disabled={isCreating}
                  >
                    <SelectTrigger id="new-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="healthcare_staff">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          เจ้าหน้าที่ (Healthcare Staff)
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          ผู้ดูแลระบบ (Admin)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังสร้างบัญชี...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        สร้างบัญชี
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewEmail('');
                      setNewPassword('');
                      setNewRole('healthcare_staff');
                    }}
                    disabled={isCreating}
                  >
                    ยกเลิก
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Staff List */}
        <Card>
          <CardHeader>
            <CardTitle>รายการพนักงานทั้งหมด</CardTitle>
            <CardDescription>
              พนักงานทั้งหมด {staffMembers.length} คน
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">กำลังโหลดข้อมูล...</span>
              </div>
            ) : staffMembers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>ยังไม่มีพนักงานในระบบ</p>
                <p className="text-sm">กดปุ่ม "เพิ่มพนักงานใหม่" เพื่อเริ่มต้น</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableCaption>รายการพนักงานทั้งหมดในระบบ</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>อีเมล</TableHead>
                      <TableHead>ตำแหน่ง</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead>สร้างเมื่อ</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffMembers.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell className="font-medium">{staff.email}</TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${getRoleBadgeColor(staff.role)}`}>
                            {getRoleIcon(staff.role)}
                            {getRoleLabel(staff.role)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {staff.email_confirmed_at ? (
                            <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                              <CheckCircle className="h-3 w-3" />
                              ยืนยันแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-orange-600 text-sm">
                              <AlertCircle className="h-3 w-3" />
                              รอยืนยัน
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(staff.created_at).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteTarget(staff)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            ลบ
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => !isDeleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ ยืนยันการลบบัญชี</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี <strong>{deleteTarget?.email}</strong>?
              <br />
              <br />
              การดำเนินการนี้ไม่สามารถย้อนกลับได้ บัญชีและข้อมูลที่เกี่ยวข้องทั้งหมดจะถูกลบถาวร
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStaff}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  ลบบัญชี
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StaffManagementPage;
