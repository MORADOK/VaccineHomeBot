import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Shield } from 'lucide-react';
import StaffPortal from './StaffPortal';
import { User, Session } from '@supabase/supabase-js';

const AuthenticatedStaffPortal = () => {
  const [user, setUser] = useState<User | null>(null);
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
                กลับหน้าหลัก
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* User info and logout button */}
      <div className="fixed top-4 right-4 z-50">
        <Card className="bg-white/95 backdrop-blur-sm border-2 border-green-200 shadow-lg">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="text-sm">
              <p className="font-semibold text-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">เจ้าหน้าที่</p>
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
      <StaffPortal />
    </div>
  );
};

export default AuthenticatedStaffPortal;