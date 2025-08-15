import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Bot, UserPlus, Users, Shield, User, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

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

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถออกจากระบบได้",
        variant: "destructive",
      });
    } else {
      navigate('/auth');
      toast({
        title: "ออกจากระบบสำเร็จ",
        description: "คุณได้ออกจากระบบเรียบร้อยแล้ว",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only admins should see this page
  if (!isAdmin) {
    return null; // This shouldn't happen due to navigation logic above
  }
  return (
    <div className="min-h-screen bg-background p-6">
      {/* Admin Header */}
      <div className="fixed top-4 right-4 z-50">
        <Card className="bg-white/95 backdrop-blur-sm border-2 border-primary/20 shadow-lg">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <div className="text-sm">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {user?.email}
                </p>
                <p className="text-xs text-primary font-medium">ผู้ดูแลระบบ (Admin)</p>
              </div>
            </div>
            <Button 
              onClick={handleSignOut} 
              variant="outline" 
              size="sm"
              className="h-8 px-3"
            >
              <LogOut className="h-4 w-4 mr-1" />
              ออกจากระบบ
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="mb-6">
            <img 
              src="/lovable-uploads/1b8e7853-1bde-4b32-b01d-6dad1be1008c.png" 
              alt="โรงพยาบาลโฮม" 
              className="mx-auto h-32 w-auto object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold mb-4">ระบบจัดการวัคซีน</h1>
          <h2 className="text-2xl text-muted-foreground mb-2">โรงพยาบาลโฮม</h2>
          <p className="text-muted-foreground">สำหรับผู้ดูแลระบบ - เลือกระบบที่ต้องการจัดการ</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                จัดการนัดหมาย
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                หน้าสำหรับเจ้าหน้าที่จัดการนัดหมายผู้ป่วย
              </p>
              <Button asChild className="w-full bg-primary hover:bg-primary/90">
                <Link to="/staff-portal">เข้าสู่ระบบ</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-6 w-6" />
                LINE Bot Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                จัดการการตั้งค่า LINE Bot และทดสอบการเชื่อมต่อ
              </p>
              <Button asChild className="w-full" variant="outline">
                <Link to="/LineBot">เข้าสู่ระบบ</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-6 w-6" />
                ลงทะเบียนผู้ป่วย
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                หน้าสำหรับผู้ป่วยลงทะเบียนฉีดวัคซีน
              </p>
              <Button asChild className="w-full" variant="outline">
                <Link to="/PatientPortal">เข้าสู่ระบบ</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Card className="bg-gradient-to-r from-primary/5 to-emerald-500/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">สิทธิ์ผู้ดูแลระบบ</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                คุณมีสิทธิ์เข้าถึงทุกระบบและจัดการข้อมูลทั้งหมด
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
