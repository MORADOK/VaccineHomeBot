import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, LogOut, User, Calculator, Bell, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import StaffPortal from './StaffPortal';
import VaccineScheduleCalculator from './VaccineScheduleCalculator';
import PatientRegistrationsList from './PatientRegistrationsList';
import NextAppointments from './NextAppointments';
import PastVaccinations from './PastVaccinations';
import AutoNotificationSystem from './AutoNotificationSystem';
import PatientAppointmentManager from './GoogleSheetsIntegration';
import EditPatientAppointment from './EditPatientAppointment';
import NotificationTestPanel from './NotificationTestPanel';

const AuthenticatedStaffPortal = () => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
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
          setIsAuthorized(false);
        } else {
          setIsAuthorized(isStaff);
        }

        // Check if user is admin
        const { data: hasAdminRole, error: adminError } = await supabase
          .rpc('has_role', { _user_id: session.user.id, _role: 'admin' });

        if (adminError) {
          console.error('Error checking admin status:', adminError);
          setIsAdmin(false);
        } else {
          setIsAdmin(hasAdminRole);
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
    navigate('/auth');
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
            <p className="text-center text-muted-foreground">
              คุณไม่มีสิทธิ์เข้าถึงระบบจัดการเจ้าหน้าที่ กรุณาติดต่อผู้ดูแลระบบ
            </p>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              ออกจากระบบ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100/30 to-white">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md">
                <img
                  src={`${import.meta.env.BASE_URL}images/hospital-logo.png`}
                  alt="โลโก้โรงพยาบาลโฮม"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">ระบบจัดการวัคซีน</h1>
                <p className="text-sm text-muted-foreground">โรงพยาบาลโฮม</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'}
                </p>
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
              >
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">ออกจากระบบ</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="staff-portal" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-7 mb-6">
            <TabsTrigger value="staff-portal">นัดวันนี้</TabsTrigger>
            <TabsTrigger value="registrations">รายการลงทะเบียน</TabsTrigger>
            <TabsTrigger value="next-appointments">นัดครั้งถัดไป</TabsTrigger>
            <TabsTrigger value="past-vaccinations">ประวัติการฉีด</TabsTrigger>
            <TabsTrigger value="edit-appointments">แก้ไขนัด</TabsTrigger>
            <TabsTrigger value="vaccine-calculator">คำนวณวัคซีน</TabsTrigger>
            {isAdmin && <TabsTrigger value="settings">ตั้งค่า</TabsTrigger>}
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