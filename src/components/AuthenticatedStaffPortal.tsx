import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, LogOut, User, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

import StaffPortal from './StaffPortal';
import VaccineScheduleCalculator from './VaccineScheduleCalculator';
import PatientRegistrationsList from './PatientRegistrationsList';
import NextAppointments from './NextAppointments';
import PastVaccinations from './PastVaccinations';
import AutoNotificationSystem from './AutoNotificationSystem';
import PatientAppointmentManager from './GoogleSheetsIntegration';
import EditPatientAppointment from './EditPatientAppointment';
import NotificationTestPanel from './NotificationTestPanel';
import { UserRoleManager } from './UserRoleManager';

const AuthenticatedStaffPortal = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuthAndPermissions = async () => {
      try {
        // Check session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session) {
          setIsLoading(false);
          return;
        }

        setSession(session);
        setUser(session.user);

        // Check if user is healthcare staff
        const { data: isStaff, error: staffError } = await supabase
          .rpc('is_healthcare_staff', { _user_id: session.user.id });

        if (staffError) {
          console.error('Error checking staff status:', staffError);
          // Fallback: Check email domain for hospital staff
          const isHospitalEmail = session.user.email?.endsWith('@vchomehospital.co.th') || false;
          setIsAuthorized(isHospitalEmail);
        } else {
          // If RPC returns false, check fallback conditions
          if (!isStaff) {
            // Fallback: Check email domain or demo accounts
            const isHospitalEmail = session.user.email?.endsWith('@vchomehospital.co.th') || false;
            const isDemoAccount = ['admin@vchomehospital.co.th', 'staff@vchomehospital.co.th'].includes(session.user.email || '');
            setIsAuthorized(isHospitalEmail || isDemoAccount);
          } else {
            setIsAuthorized(isStaff);
          }
        }

        // Check if user is admin
        const { data: hasAdminRole, error: adminError } = await supabase
          .rpc('has_role', { _user_id: session.user.id, _role: 'admin' });

        if (adminError) {
          console.error('Error checking admin status:', adminError);
          // Fallback: Check email for admin access
          const isAdminEmail = session.user.email === 'admin@vchomehospital.co.th' || 
                              session.user.email === 'superadmin@vchomehospital.co.th';
          setIsAdmin(isAdminEmail);
        } else {
          // If RPC returns false, check fallback conditions
          if (!hasAdminRole) {
            const isAdminEmail = session.user.email === 'admin@vchomehospital.co.th' || 
                                session.user.email === 'superadmin@vchomehospital.co.th';
            setIsAdmin(isAdminEmail);
          } else {
            setIsAdmin(hasAdminRole);
          }
        }

      } catch (error) {
        console.error('Auth check error:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถตรวจสอบสิทธิ์การเข้าถึงได้",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndPermissions();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setSession(null);
          setIsAuthorized(false);
          setIsAdmin(false);
          navigate('/auth');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "ออกจากระบบแล้ว",
        description: "คุณได้ออกจากระบบเรียบร้อยแล้ว",
      });

      navigate('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถออกจากระบบได้",
        variant: "destructive",
      });
    }
  };

  const navigateToAuth = () => {
    navigate('/auth-full');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100/30 to-white flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">กำลังตรวจสอบสิทธิ์...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100/30 to-white flex items-center justify-center">
        <Card className="w-96">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Shield className="h-6 w-6 text-primary" />
              ต้องเข้าสู่ระบบ
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-center text-muted-foreground">
              กรุณาเข้าสู่ระบบเพื่อเข้าถึงระบบจัดการเจ้าหน้าที่
            </p>
            <Button
              onClick={navigateToAuth}
              className="w-full"
            >
              เข้าสู่ระบบ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100/30 to-white flex items-center justify-center">
        <Card className="w-96">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl text-destructive">
              <Shield className="h-6 w-6" />
              ไม่มีสิทธิ์เข้าถึง
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                คุณไม่มีสิทธิ์เข้าถึงระบบจัดการเจ้าหน้าที่
              </p>
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                <p><strong>อีเมล:</strong> {user?.email}</p>
                <p><strong>สถานะ:</strong> ไม่มีสิทธิ์เจ้าหน้าที่</p>
              </div>
              <p className="text-xs text-muted-foreground">
                หากคุณเป็นเจ้าหน้าที่ กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์การเข้าถึง
              </p>
            </div>
            <div className="space-y-2">
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                ลองใหม่
              </Button>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                ออกจากระบบ
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100/30 to-white">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden shadow-md flex-shrink-0">
                <img
                  src={`${import.meta.env.BASE_URL}images/hospital-logo.png`}
                  alt="โลโก้โรงพยาบาลโฮม"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                  ระบบจัดการวัคซีน
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  โรงพยาบาลโฮม
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-medium truncate max-w-[200px]" title={user.email}>
                  {user.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'}
                </p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Mobile user info button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden p-2"
                  title={`${user.email} - ${isAdmin ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'}`}
                >
                  <User className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  size="sm"
                  className="px-2 sm:px-4"
                >
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">ออกจากระบบ</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="staff-portal" className="w-full">
          {/* Mobile: Scrollable tabs */}
          <div className="block lg:hidden mb-6">
            <div className="overflow-x-auto scrollbar-thin">
              <TabsList className="flex w-max gap-1 p-1">
                <TabsTrigger value="staff-portal" className="text-xs px-3 py-2 whitespace-nowrap">
                  นัดวันนี้
                </TabsTrigger>
                <TabsTrigger value="registrations" className="text-xs px-3 py-2 whitespace-nowrap">
                  ลงทะเบียน
                </TabsTrigger>
                <TabsTrigger value="next-appointments" className="text-xs px-3 py-2 whitespace-nowrap">
                  นัดถัดไป
                </TabsTrigger>
                <TabsTrigger value="past-vaccinations" className="text-xs px-3 py-2 whitespace-nowrap">
                  ประวัติ
                </TabsTrigger>
                <TabsTrigger value="edit-appointments" className="text-xs px-3 py-2 whitespace-nowrap">
                  แก้ไขนัด
                </TabsTrigger>
                <TabsTrigger value="vaccine-calculator" className="text-xs px-3 py-2 whitespace-nowrap">
                  คำนวณ
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="user-roles" className="text-xs px-3 py-2 whitespace-nowrap">
                    จัดการสิทธิ์
                  </TabsTrigger>
                )}
                {isAdmin && (
                  <TabsTrigger value="settings" className="text-xs px-3 py-2 whitespace-nowrap">
                    ตั้งค่า
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
          </div>

          {/* Desktop: Grid tabs */}
          <TabsList className={`hidden lg:grid w-full mb-6 gap-1 ${isAdmin ? 'grid-cols-8' : 'grid-cols-6'}`}>
            <TabsTrigger value="staff-portal" className="text-sm px-2 py-2">
              นัดวันนี้
            </TabsTrigger>
            <TabsTrigger value="registrations" className="text-sm px-2 py-2">
              รายการลงทะเบียน
            </TabsTrigger>
            <TabsTrigger value="next-appointments" className="text-sm px-2 py-2">
              นัดครั้งถัดไป
            </TabsTrigger>
            <TabsTrigger value="past-vaccinations" className="text-sm px-2 py-2">
              ประวัติการฉีด
            </TabsTrigger>
            <TabsTrigger value="edit-appointments" className="text-sm px-2 py-2">
              แก้ไขนัด
            </TabsTrigger>
            <TabsTrigger value="vaccine-calculator" className="text-sm px-2 py-2">
              คำนวณวัคซีน
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="user-roles" className="text-sm px-2 py-2">
                จัดการสิทธิ์
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="settings" className="text-sm px-2 py-2">
                ตั้งค่า
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="staff-portal">
            <StaffPortal />
          </TabsContent>

          <TabsContent value="registrations">
            <PatientRegistrationsList />
          </TabsContent>

          <TabsContent value="next-appointments">
            <NextAppointments />
          </TabsContent>

          <TabsContent value="past-vaccinations">
            <PastVaccinations />
          </TabsContent>

          <TabsContent value="edit-appointments">
            <EditPatientAppointment />
          </TabsContent>

          <TabsContent value="vaccine-calculator">
            <VaccineScheduleCalculator />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="user-roles">
              <UserRoleManager />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>ตั้งค่าระบบ</CardTitle>
                  <CardDescription>
                    จัดการการตั้งค่าระบบและสิทธิ์การเข้าถึง
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">การจัดการผู้ใช้</h3>
                      <p className="text-sm text-muted-foreground">อีเมล: {user.email}</p>
                      <p className="text-sm text-muted-foreground">สิทธิ์: {isAdmin ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">การตั้งค่าวัคซีน</h3>
                      <p className="text-sm text-muted-foreground">จัดการประเภทวัคซีนและตารางการให้</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">ระบบแจ้งเตือน</h3>
                      <div className="mt-2 space-y-4">
                        <AutoNotificationSystem />
                        <NotificationTestPanel />
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">จัดการนัดหมายผู้ป่วย</h3>
                      <div className="mt-2">
                        <PatientAppointmentManager />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default AuthenticatedStaffPortal;