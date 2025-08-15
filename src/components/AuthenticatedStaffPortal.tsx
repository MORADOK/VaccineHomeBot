import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Shield, User, Settings, Calculator, Bell } from 'lucide-react';
import StaffPortal from './StaffPortal';
import GoogleSheetsIntegration from './GoogleSheetsIntegration';
import VaccineScheduleCalculator from './VaccineScheduleCalculator';
import AutoNotificationSystem from './AutoNotificationSystem';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

const AuthenticatedStaffPortal = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check if user has healthcare staff role
          setTimeout(async () => {
            try {
              const { data: roleCheck, error } = await supabase
                .rpc('is_healthcare_staff', { _user_id: session.user.id });
              
              if (error) {
                console.error('Role check error:', error);
                setIsAuthorized(false);
              } else {
                setIsAuthorized(roleCheck);
                if (!roleCheck) {
                  toast({
                    title: "ไม่มีสิทธิ์เข้าถึง",
                    description: "คุณไม่มีสิทธิ์เข้าถึงระบบเจ้าหน้าที่",
                    variant: "destructive",
                  });
                }
              }
            } catch (error) {
              console.error('Authorization check failed:', error);
              setIsAuthorized(false);
            }
          }, 0);
        } else {
          setIsAuthorized(false);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถออกจากระบบได้",
        variant: "destructive",
      });
    } else {
      navigate('/');
      toast({
        title: "ออกจากระบบสำเร็จ",
        description: "คุณได้ออกจากระบบเรียบร้อยแล้ว",
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
            <div className="flex gap-2">
              <Button 
                onClick={handleSignOut} 
                variant="outline"
                className="flex-1"
              >
                <LogOut className="h-4 w-4 mr-2" />
                ออกจากระบบ
              </Button>
            <Button 
              onClick={() => navigate('/')} 
              className="flex-1"
            >
              กลับหน้าแอดมิน
            </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Mobile-optimized header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              <div>
                <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">
                  ระบบเจ้าหน้าที่
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                  {user.email}
                </p>
              </div>
            </div>
            <Button 
              onClick={handleSignOut} 
              variant="outline" 
              size="sm"
              className="h-8 px-2 md:h-9 md:px-3"
            >
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">ออกจากระบบ</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-6">
        <Card className="w-full">
          <CardHeader className="text-center px-4 py-4 md:px-6 md:py-6">
            <CardTitle className="flex items-center justify-center gap-2 text-xl md:text-3xl">
              <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              <span className="hidden sm:inline">ระบบจัดการวัคซีนสำหรับเจ้าหน้าที่</span>
              <span className="sm:hidden">ระบบจัดการวัคซีน</span>
            </CardTitle>
            <CardDescription className="text-sm md:text-base">
              ระบบครบถ้วนสำหรับการจัดการวัคซีน การติดตาม และการแจ้งเตือน
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <Tabs defaultValue="portal" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1 h-auto">
                <TabsTrigger value="portal" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Staff Portal</span>
                  <span className="sm:hidden">Portal</span>
                </TabsTrigger>
                <TabsTrigger value="calculator" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3">
                  <Calculator className="h-4 w-4" />
                  <span className="hidden sm:inline">คำนวณวัคซีน</span>
                  <span className="sm:hidden">คำนวณ</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3 md:col-span-1 col-span-2">
                  <Bell className="h-4 w-4" />
                  <span>แจ้งเตือน</span>
                </TabsTrigger>
                <TabsTrigger value="sheets" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Google Sheets</span>
                  <span className="sm:hidden">Sheets</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                  <span className="sm:hidden">ตั้งค่า</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="portal" className="mt-6">
                <StaffPortal />
              </TabsContent>

              <TabsContent value="calculator" className="mt-6">
                <VaccineScheduleCalculator />
              </TabsContent>

              <TabsContent value="notifications" className="mt-6">
                <AutoNotificationSystem />
              </TabsContent>

              <TabsContent value="sheets" className="mt-6">
                <GoogleSheetsIntegration />
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>การตั้งค่าระบบ</CardTitle>
                    <CardDescription>
                      จัดการการตั้งค่าระบบและสิทธิ์การเข้าถึง
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium mb-2">ข้อมูลผู้ใช้</h3>
                      <p className="text-sm text-muted-foreground">อีเมล: {user.email}</p>
                      <p className="text-sm text-muted-foreground">สิทธิ์: เจ้าหน้าที่ด้านสุขภาพ</p>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium mb-2">สถานะระบบ</h3>
                      <p className="text-sm text-green-600">✅ ระบบคำนวณวัคซีน: ใช้งานได้</p>
                      <p className="text-sm text-green-600">✅ ระบบแจ้งเตือน: ใช้งานได้</p>
                      <p className="text-sm text-green-600">✅ Google Sheets: เชื่อมต่อแล้ว</p>
                      <p className="text-sm text-green-600">✅ LINE Integration: เชื่อมต่อแล้ว</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthenticatedStaffPortal;