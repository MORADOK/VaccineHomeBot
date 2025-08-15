import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn, UserPlus, Home } from 'lucide-react';
import { User, Session } from '@supabase/supabase-js';

const AuthPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for password reset parameters in URL
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    
    // Check for parameters in hash (Supabase often returns them in hash)
    let accessToken = urlParams.get('access_token');
    let refreshToken = urlParams.get('refresh_token');
    let type = urlParams.get('type');
    
    if (!accessToken && hash) {
      // Try to parse from hash
      const hashParams = new URLSearchParams(hash.substring(1));
      accessToken = hashParams.get('access_token');
      refreshToken = hashParams.get('refresh_token');
      type = hashParams.get('type');
    }
    
    console.log('URL params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
    
    if (type === 'recovery' && accessToken && refreshToken) {
      console.log('Setting up password recovery...');
      setShowResetPassword(true);
      // Set the session from the URL parameters
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) {
          console.error('Session error:', error);
          toast({
            title: "เกิดข้อผิดพลาด",
            description: "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว",
            variant: "destructive",
          });
          setShowResetPassword(false);
        } else {
          console.log('Session set successfully for password recovery');
        }
      });
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, !!session);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle password recovery
        if (event === 'PASSWORD_RECOVERY') {
          console.log('PASSWORD_RECOVERY event received');
          setShowResetPassword(true);
          return;
        }
        
        // Redirect authenticated users to staff portal (but not during password recovery)
        if (session?.user && !showResetPassword && type !== 'recovery') {
          navigate('/staff-portal');
          toast({
            title: "เข้าสู่ระบบสำเร็จ",
            description: "ยินดีต้อนรับเข้าสู่ระบบจัดการนัดหมาย",
          });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user && !showResetPassword && type !== 'recovery') {
        navigate('/staff-portal');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "ข้อผิดพลาด",
            description: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
            variant: "destructive",
          });
        } else if (error.message.includes('Email not confirmed')) {
          toast({
            title: "ยืนยันอีเมล",
            description: "กรุณาตรวจสอบอีเมลและคลิกลิงก์ยืนยัน",
            variant: "destructive",
          });
        } else {
          toast({
            title: "เกิดข้อผิดพลาด",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: "ข้อผิดพลาด",
            description: "อีเมลนี้ได้รับการลงทะเบียนแล้ว กรุณาเข้าสู่ระบบ",
            variant: "destructive",
          });
        } else if (error.message.includes('Password should be at least 6 characters')) {
          toast({
            title: "รหัสผ่านไม่ถูกต้อง",
            description: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
            variant: "destructive",
          });
        } else {
          toast({
            title: "เกิดข้อผิดพลาด",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "ลงทะเบียนสำเร็จ",
          description: "กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี",
        });
        setIsSignUp(false);
      }
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "กรุณากรอกอีเมล",
        description: "กรุณากรอกอีเมลของคุณเพื่อรีเซ็ตรหัสผ่าน",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });

      if (error) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว",
          description: "กรุณาตรวจสอบอีเมลของคุณและคลิกลิงก์เพื่อรีเซ็ตรหัสผ่าน",
        });
        setShowForgotPassword(false);
      }
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "กรุณากรอกรหัสผ่าน",
        description: "กรุณากรอกรหัสผ่านใหม่และยืนยันรหัสผ่าน",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "รหัสผ่านไม่ตรงกัน",
        description: "รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "รหัสผ่านสั้นเกินไป",
        description: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "เปลี่ยนรหัสผ่านสำเร็จ",
          description: "รหัสผ่านของคุณได้รับการอัปเดตแล้ว กำลังนำคุณเข้าสู่ระบบ",
        });
        // Clear the URL parameters
        window.history.replaceState({}, document.title, '/auth');
        setTimeout(() => {
          navigate('/staff-portal');
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showResetPassword) {
      handleUpdatePassword();
    } else if (showForgotPassword) {
      handleForgotPassword();
    } else if (isSignUp) {
      handleSignUp();
    } else {
      handleSignIn();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100/30 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Modern Header with Gradient */}
        <div className="text-center space-y-6">
          <div className="relative">
            {/* Gradient Background Circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-gradient-to-br from-primary/20 via-green-400/10 to-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
            </div>
            
            {/* Main Title with Gradient Text */}
            <div className="relative z-10 space-y-3">
              <h1 className="text-5xl font-black bg-gradient-to-r from-primary via-green-600 to-emerald-600 bg-clip-text text-transparent animate-fade-in">
                โรงพยาบาลโฮม
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-emerald-500 mx-auto rounded-full"></div>
            </div>
          </div>
          
          {/* Subtitle with Enhanced Typography */}
          <div className="space-y-2">
            <p className="text-xl font-semibold text-foreground/90">ระบบจัดการการนัดหมายและวัคซีน</p>
            <p className="text-sm text-muted-foreground font-medium">เข้าสู่ระบบเพื่อจัดการข้อมูลอย่างปลอดภัย</p>
          </div>
        </div>

        {showResetPassword ? (
          <Card className="border-2 border-blue-200 shadow-xl bg-white/95 backdrop-blur-sm animate-scale-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-center">
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                      <LogIn className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                      ตั้งรหัสผ่านใหม่
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    กรุณาสร้างรหัสผ่านใหม่สำหรับบัญชีของคุณ
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="border-2 border-blue-300 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="ยืนยันรหัสผ่านใหม่"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="border-2 border-blue-300 focus:border-blue-500"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-500/90 hover:to-purple-500/90 shadow-lg hover:shadow-xl transition-all duration-300" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  ) : null}
                  อัปเดตรหัสผ่าน
                </Button>
                <div className="text-center">
                  <Button 
                    type="button"
                    variant="link"
                    onClick={() => {
                      setShowResetPassword(false);
                      window.history.replaceState({}, document.title, '/auth');
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground font-medium"
                  >
                    กลับไปเข้าสู่ระบบ
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-green-200 shadow-xl bg-white/95 backdrop-blur-sm animate-scale-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-center">
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-emerald-500 rounded-lg flex items-center justify-center">
                      <LogIn className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
                      เข้าสู่ระบบ
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    เลือกระหว่างเข้าสู่ระบบหรือสร้างบัญชีใหม่
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
            {!showForgotPassword ? (
              <Tabs value={isSignUp ? "signup" : "signin"} onValueChange={(value) => setIsSignUp(value === "signup")}>
                <TabsList className="grid w-full grid-cols-2 bg-green-50 p-1 rounded-xl border border-green-200">
                  <TabsTrigger 
                    value="signin" 
                    className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-green-200 rounded-lg font-semibold transition-all duration-300"
                  >
                    <LogIn className="h-4 w-4" />
                    เข้าสู่ระบบ
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup" 
                    className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-green-200 rounded-lg font-semibold transition-all duration-300"
                  >
                    <UserPlus className="h-4 w-4" />
                    ลงทะเบียน
                  </TabsTrigger>
                </TabsList>
              
              <TabsContent value="signin" className="mt-8 animate-fade-in">
                <div className="mb-6 text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">ยินดีต้อนรับกลับ</h3>
                  <p className="text-sm text-muted-foreground">กรอกข้อมูลเพื่อเข้าสู่ระบบ</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">อีเมล</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="border-2 border-green-300 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">รหัสผ่าน</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="รหัสผ่าน"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="border-2 border-green-300 focus:border-primary"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 shadow-lg hover:shadow-xl transition-all duration-300" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    ) : (
                      <LogIn className="h-5 w-5 mr-3" />
                    )}
                    เข้าสู่ระบบ
                  </Button>
                  <div className="text-center mt-4">
                    <Button 
                      type="button"
                      variant="link"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      ลืมรหัสผ่าน?
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-8 animate-fade-in">
                <div className="mb-6 text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">สร้างบัญชีใหม่</h3>
                  <p className="text-sm text-muted-foreground">เริ่มต้นใช้งานระบบจัดการการนัดหมาย</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">อีเมล</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="border-2 border-green-300 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">รหัสผ่าน</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="border-2 border-green-300 focus:border-primary"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-500/90 hover:to-green-500/90 shadow-lg hover:shadow-xl transition-all duration-300" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    ) : (
                      <UserPlus className="h-5 w-5 mr-3" />
                    )}
                    ลงทะเบียน
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            ) : (
              <div className="mt-8 animate-fade-in">
                <div className="mb-6 text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">รีเซ็ตรหัสผ่าน</h3>
                  <p className="text-sm text-muted-foreground">กรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">อีเมล</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="border-2 border-green-300 focus:border-primary"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-500/90 hover:to-purple-500/90 shadow-lg hover:shadow-xl transition-all duration-300" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    ) : null}
                    ส่งลิงก์รีเซ็ตรหัสผ่าน
                  </Button>
                  <div className="text-center">
                    <Button 
                      type="button"
                      variant="link"
                      onClick={() => setShowForgotPassword(false)}
                      className="text-sm text-muted-foreground hover:text-foreground font-medium"
                    >
                      กลับไปเข้าสู่ระบบ
                    </Button>
                  </div>
                </form>
              </div>
            )}
            </CardContent>
          </Card>
        )}

        {!showResetPassword && (
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 border-2 border-green-200 hover:bg-green-50 hover:border-primary transition-all duration-300 font-medium"
            >
              <Home className="h-4 w-4" />
              กลับหน้าหลัก
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;