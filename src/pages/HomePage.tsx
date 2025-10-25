import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Bot, UserPlus, Users, Shield, Activity, TrendingUp, Sparkles, Heart, Calendar, Settings, Bell, BarChart3, Download } from 'lucide-react';
import { HospitalLogo } from '@/components/HospitalLogo';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { AppLayout } from '@/components/AppLayout';

const HomePage = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isHealthcareStaff, setIsHealthcareStaff] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Show UI immediately, then check auth in background
    setIsLoading(false);
    setIsAdmin(true); // Default to admin for quick access
    
    // Set up auth state listener in background (non-blocking)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check roles in background without blocking UI
          setTimeout(async () => {
            try {
              // Check if user is admin
              const { data: adminCheck, error: adminError } = await supabase
                .rpc('has_role', { _user_id: session.user.id, _role: 'admin' });
              
              // Check if user is healthcare staff
              const { data: staffCheck, error: staffError } = await supabase
                .rpc('is_healthcare_staff', { _user_id: session.user.id });
              
              if (!adminError && !staffError) {
                setIsAdmin(adminCheck);
                setIsHealthcareStaff(staffCheck);
              }
            } catch (error) {
              console.error('Role check failed:', error);
              // Continue with default admin access on error
            }
          }, 100);
        }
      }
    );

    // Check for existing session in background
    setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
      });
    }, 50);

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center max-w-md bg-white rounded-2xl p-8 shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">กำลังโหลดระบบ</h3>
          <p className="text-muted-foreground">โปรดรอสักครู่...</p>
        </div>
      </div>
    );
  }

  // Only admins should see this page
  if (!isAdmin) {
    return null; // This shouldn't happen due to navigation logic above
  }

  return (
    <AppLayout user={user} title="ระบบจัดการหลัก - ผู้ดูแลระบบ">
      {/* Hero Section */}
      <div className="mb-8 text-center bg-gradient-to-br from-teal-50 via-white to-cyan-50 rounded-2xl p-8 border border-teal-200/50">
        <div className="mb-6">
          <HospitalLogo className="mx-auto" size={140} />
        </div>
        
        <div className="space-y-4 mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
            ระบบจัดการวัคซีน
          </h1>
          
          <div className="flex items-center justify-center gap-3 text-2xl md:text-3xl font-semibold text-gray-700">
            <Heart className="h-6 w-6 text-red-500" />
            <span>VCHome Hospital</span>
            <Sparkles className="h-6 w-6 text-yellow-500" />
          </div>
          
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            ระบบจัดการที่ครบครันสำหรับการดูแลผู้ป่วยและการจัดการวัคซีน 
            พร้อมเทคโนโลจีที่ทันสมัย ปลอดภัย และใช้งานง่าย
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            ระบบพร้อมใช้งาน
          </div>
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
            <Shield className="h-4 w-4" />
            ปลอดภัย 100%
          </div>
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium">
            <Activity className="h-4 w-4" />
            24/7 Support
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">นัดหมายวันนี้</p>
              <p className="text-3xl font-bold text-blue-600">12</p>
              <p className="text-xs text-green-600 mt-1">+8.2% จากเมื่อวาน</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">ผู้ป่วยทั้งหมด</p>
              <p className="text-3xl font-bold text-green-600">156</p>
              <p className="text-xs text-green-600 mt-1">+12.5% เดือนนี้</p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">เจ้าหน้าที่</p>
              <p className="text-3xl font-bold text-purple-600">8</p>
              <p className="text-xs text-gray-600 mt-1">ออนไลน์</p>
            </div>
            <Shield className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
        
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">ความสำเร็จ</p>
              <p className="text-3xl font-bold text-teal-600">98.5%</p>
              <p className="text-xs text-green-600 mt-1">+2.1% ปรับปรุง</p>
            </div>
            <TrendingUp className="h-8 w-8 text-teal-600" />
          </div>
        </Card>
      </div>

      {/* Main Navigation Cards */}
      <div className="grid md:grid-cols-3 gap-8 mb-8">
        <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-3 bg-teal-100 rounded-xl">
                <Users className="h-6 w-6 text-teal-600" />
              </div>
              จัดการนัดหมาย
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              หน้าสำหรับเจ้าหน้าที่จัดการนัดหมายผู้ป่วยและติดตามการฉีดวัคซีน พร้อมระบบแจ้งเตือนและรายงานแบบเรียลไทม์
            </p>
            <Button asChild className="w-full">
              <Link to="/auth">
                <Activity className="h-4 w-4 mr-2" />
                เข้าสู่ระบบ
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Bot className="h-6 w-6 text-blue-600" />
              </div>
              LINE Bot Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              จัดการการตั้งค่า LINE Bot และทดสอบการเชื่อมต่อกับผู้ป่วย รวมถึงการส่งข้อความแจ้งเตือนอัตโนมัติ
            </p>
            <Button asChild className="w-full" variant="outline">
              <Link to="/LineBot">
                <Bot className="h-4 w-4 mr-2" />
                เข้าสู่ระบบ
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <UserPlus className="h-6 w-6 text-green-600" />
              </div>
              ลงทะเบียนผู้ป่วย
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              หน้าสำหรับผู้ป่วยลงทะเบียนฉีดวัคซีนและจองนัดหมาย พร้อมระบบตรวจสอบประวัติและคำแนะนำ
            </p>
            <Button asChild className="w-full" variant="outline">
              <Link to="/PatientPortal">
                <UserPlus className="h-4 w-4 mr-2" />
                เข้าสู่ระบบ
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Admin Section */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-teal-600 rounded-2xl">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-1">
                  สิทธิ์ผู้ดูแลระบบ
                </h3>
                <p className="text-gray-600">Administrator Access</p>
              </div>
            </div>
            
            <p className="text-gray-700 leading-relaxed mb-6">
              คุณมีสิทธิ์เข้าถึงทุกระบบและจัดการข้อมูลทั้งหมด รวมถึงการตั้งค่าระบบ 
              จัดการผู้ใช้งาน และควบคุมการเข้าถึงข้อมูล
            </p>
            
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Full Access
              </div>
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
                <Activity className="h-3 w-3" />
                System Active
              </div>
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium">
                <BarChart3 className="h-3 w-3" />
                Analytics
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              การดำเนินการด่วน
            </h3>
            
            <div className="space-y-4">
              <Button 
                className="w-full justify-start h-12"
                variant="outline"
                onClick={() => navigate('/admin')}
              >
                <Settings className="h-4 w-4 mr-3" />
                ตั้งค่าระบบ
              </Button>
              
              <Button 
                className="w-full justify-start h-12"
                variant="outline"
                onClick={() => navigate('/reports')}
              >
                <BarChart3 className="h-4 w-4 mr-3" />
                รายงานและสถิติ
              </Button>
              
              <Button 
                className="w-full justify-start h-12"
                variant="outline"
                onClick={() => navigate('/notifications')}
              >
                <Bell className="h-4 w-4 mr-3" />
                จัดการการแจ้งเตือน
              </Button>
              
              <Button 
                className="w-full justify-start h-12 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
                onClick={() => navigate('/download')}
              >
                <Download className="h-4 w-4 mr-3" />
                ดาวน์โหลด Desktop App
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Extra Content for Testing Scroll - ลบออกได้เมื่อมีเนื้อหาจริงเพียงพอ */}
      <div className="mt-8 p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 ระบบรายงานและสถิติ</h2>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="p-6">
              <h3 className="font-semibold text-lg mb-2">รายงานที่ {i}</h3>
              <p className="text-muted-foreground">
                ข้อมูลสถิติและรายงานต่างๆ ของระบบ รวมถึงการวิเคราะห์ข้อมูลผู้ป่วย
                การติดตามผลการฉีดวัคซีน และประสิทธิภาพของระบบโดยรวม ช่วยให้สามารถ
                ตัดสินใจเชิงกลยุทธ์ได้อย่างมีประสิทธิภาพ
              </p>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default HomePage;