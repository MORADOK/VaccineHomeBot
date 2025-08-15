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
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Redirect authenticated users to home page
        if (session?.user) {
          navigate('/');
          toast({
            title: "เข้าสู่ระบบสำเร็จ",
            description: "ยินดีต้อนรับเข้าสู่ระบบ",
          });
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        navigate('/');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      handleSignUp();
    } else {
      handleSignIn();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100/30 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">โรงพยาบาลโฮม</h1>
          <p className="text-muted-foreground">ระบบจัดการการนัดหมายและวัคซีน</p>
        </div>

        <Card className="border-2 border-green-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-xl">
              เข้าสู่ระบบ / ลงทะเบียน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={isSignUp ? "signup" : "signin"} onValueChange={(value) => setIsSignUp(value === "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  เข้าสู่ระบบ
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  ลงทะเบียน
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="mt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <LogIn className="h-4 w-4 mr-2" />
                    )}
                    เข้าสู่ระบบ
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    ลงทะเบียน
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            กลับหน้าหลัก
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;