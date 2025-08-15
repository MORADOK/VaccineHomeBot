import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Bot, UserPlus, Users, Shield, User, LogOut, Activity, TrendingUp } from 'lucide-react';
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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check roles
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
                
                // If user is healthcare staff but not admin, redirect to staff portal
                if (staffCheck && !adminCheck) {
                  navigate('/staff-portal');
                  return;
                }
              }
            } catch (error) {
              console.error('Role check failed:', error);
            }
          }, 0);
        } else {
          // Not logged in, redirect to auth
          navigate('/auth');
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        navigate('/auth');
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">กำลังโหลด...</p>
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
      <div className="mb-8">
        <div className="text-center mb-8">
          <div className="mb-6">
            <img 
              src="/lovable-uploads/1b8e7853-1bde-4b32-b01d-6dad1be1008c.png" 
              alt="โรงพยาบาลโฮม" 
              className="mx-auto h-32 w-auto object-contain animate-float"
            />
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            ระบบจัดการวัคซีน
          </h1>
          <h2 className="text-2xl text-muted-foreground mb-2">โรงพยาบาลโฮม</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            ระบบจัดการที่ครบครันสำหรับการดูแลผู้ป่วยและการจัดการวัคซีน
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card-balanced p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">นัดหมายวันนี้</p>
              <p className="text-2xl font-bold text-primary">12</p>
            </div>
            <Activity className="h-8 w-8 text-primary" />
          </div>
        </div>
        
        <div className="card-balanced p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">ผู้ป่วยทั้งหมด</p>
              <p className="text-2xl font-bold text-medical-success">156</p>
            </div>
            <Users className="h-8 w-8 text-medical-success" />
          </div>
        </div>
        
        <div className="card-balanced p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">เจ้าหน้าที่</p>
              <p className="text-2xl font-bold text-medical-info">8</p>
            </div>
            <Shield className="h-8 w-8 text-medical-info" />
          </div>
        </div>
      </div>

      {/* Main Navigation Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="card-balanced hover:shadow-lg group transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                <Users className="h-6 w-6 text-primary" />
              </div>
              จัดการนัดหมาย
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              หน้าสำหรับเจ้าหน้าที่จัดการนัดหมายผู้ป่วยและติดตามการฉีดวัคซีน
            </p>
            <Button asChild className="w-full btn-primary">
              <Link to="/staff-portal">เข้าสู่ระบบ</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="card-balanced hover:shadow-lg group transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-3 bg-medical-info/10 rounded-xl group-hover:bg-medical-info/20 transition-colors">
                <Bot className="h-6 w-6 text-medical-info" />
              </div>
              LINE Bot Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              จัดการการตั้งค่า LINE Bot และทดสอบการเชื่อมต่อกับผู้ป่วย
            </p>
            <Button asChild className="w-full" variant="outline">
              <Link to="/LineBot">เข้าสู่ระบบ</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="card-balanced hover:shadow-lg group transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-3 bg-medical-accent/10 rounded-xl group-hover:bg-medical-accent/20 transition-colors">
                <UserPlus className="h-6 w-6 text-medical-accent" />
              </div>
              ลงทะเบียนผู้ป่วย
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              หน้าสำหรับผู้ป่วยลงทะเบียนฉีดวัคซีนและจองนัดหมาย
            </p>
            <Button asChild className="w-full" variant="outline">
              <Link to="/PatientPortal">เข้าสู่ระบบ</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Admin Privileges Card */}
      <Card className="bg-gradient-card border-primary/20 shadow-glow">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">สิทธิ์ผู้ดูแลระบบ</h3>
          </div>
          <p className="text-center text-muted-foreground leading-relaxed">
            คุณมีสิทธิ์เข้าถึงทุกระบบและจัดการข้อมูลทั้งหมด รวมถึงการตั้งค่าระบบและจัดการผู้ใช้งาน
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default HomePage;
