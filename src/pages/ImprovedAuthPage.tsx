import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn, UserPlus, Home, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/** Build correct site URL for redirects */
const BASE_URL = (import.meta.env.BASE_URL || '/');
const SITE_URL = (
  import.meta.env.VITE_PUBLIC_SITE_URL
    ?? (window.location.origin + BASE_URL)
).replace(/\/+$/, '');

/**
 * Improved Auth Page - Enhanced version with better UX
 *
 * Improvements:
 * - Clearer error messages
 * - Better visual feedback
 * - Simplified recovery flow
 * - Loading states
 * - Success confirmations
 */
const ImprovedAuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Success states for better UX
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const isRecoveryRef = useRef(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const query = url.searchParams;
    const hashParams = new URLSearchParams(url.hash.slice(1));

    const type = query.get('type') || hashParams.get('type');
    const code = query.get('code') || hashParams.get('code');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    // Handle password recovery
    if (type === 'recovery') {
      isRecoveryRef.current = true;
      setShowResetPassword(true);

      // Modern flow with code
      if (code) {
        supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
          if (error) {
            console.error('Recovery link error:', error);
            showErrorToast(
              'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง',
              'ลิงก์อาจหมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่'
            );
            setShowResetPassword(false);
            isRecoveryRef.current = false;
          }
        });
      }
      // Legacy flow with tokens
      else if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).then(({ error }) => {
          if (error) {
            console.error('Session error:', error);
            showErrorToast(
              'ไม่สามารถรีเซ็ตรหัสผ่านได้',
              'กรุณาขอลิงก์รีเซ็ตรหัสผ่านใหม่'
            );
            setShowResetPassword(false);
            isRecoveryRef.current = false;
          }
        });
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setShowResetPassword(true);
          isRecoveryRef.current = true;
          return;
        }

        // Redirect to staff portal after successful auth
        if (session?.user && !isRecoveryRef.current) {
          navigate('/staff-portal', { replace: true });
          toast({
            title: '✅ เข้าสู่ระบบสำเร็จ',
            description: `ยินดีต้อนรับ ${session.user.email}`,
          });
        }
      }
    );

    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !isRecoveryRef.current) {
        navigate('/staff-portal', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  // Helper to show user-friendly error messages
  const showErrorToast = (title: string, description: string) => {
    toast({ title, description, variant: 'destructive' });
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        // User-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          showErrorToast(
            '❌ เข้าสู่ระบบไม่สำเร็จ',
            'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง'
          );
        } else if (error.message.includes('Email not confirmed')) {
          showErrorToast(
            '⚠️ โปรดยืนยันอีเมล',
            'กรุณาตรวจสอบอีเมลของคุณและคลิกลิงก์ยืนยันก่อนเข้าสู่ระบบ'
          );
        } else if (error.message.includes('Email')) {
          showErrorToast(
            '❌ รูปแบบอีเมลไม่ถูกต้อง',
            'กรุณากรอกอีเมลในรูปแบบที่ถูกต้อง เช่น example@email.com'
          );
        } else {
          showErrorToast(
            'เกิดข้อผิดพลาด',
            'ไม่สามารถเข้าสู่ระบบได้ในขณะนี้ กรุณาลองใหม่ภายหลัง'
          );
        }
        return;
      }
      // Success handled by onAuthStateChange
    } catch (error) {
      console.error('Sign in error:', error);
      showErrorToast(
        'เกิดข้อผิดพลาด',
        'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    try {
      const redirectUrl = `${SITE_URL}/auth`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          showErrorToast(
            '❌ อีเมลนี้ถูกใช้งานแล้ว',
            'กรุณาใช้อีเมลอื่น หรือเข้าสู่ระบบหากคุณมีบัญชีอยู่แล้ว'
          );
        } else if (error.message.includes('Password should be at least')) {
          showErrorToast(
            '❌ รหัสผ่านไม่ปลอดภัยพอ',
            'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
          );
        } else if (error.message.includes('password')) {
          showErrorToast(
            '❌ รหัสผ่านไม่ถูกต้อง',
            'กรุณาตั้งรหัสผ่านที่มีความยาวอย่างน้อย 6 ตัวอักษร'
          );
        } else {
          showErrorToast('เกิดข้อผิดพลาด', error.message);
        }
        return;
      }

      // Show success message
      setSignUpSuccess(true);
      setEmail('');
      setPassword('');

      // Auto switch to sign in tab after 5 seconds
      setTimeout(() => {
        setSignUpSuccess(false);
        setIsSignUp(false);
      }, 5000);

    } catch (error) {
      console.error('Sign up error:', error);
      showErrorToast(
        'เกิดข้อผิดพลาด',
        'ไม่สามารถลงทะเบียนได้ในขณะนี้ กรุณาลองใหม่ภายหลัง'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      showErrorToast(
        '⚠️ กรุณากรอกอีเมล',
        'กรุณากรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน'
      );
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${SITE_URL}/auth?type=recovery`,
      });

      if (error) {
        showErrorToast('เกิดข้อผิดพลาด', 'ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่');
      } else {
        setResetEmailSent(true);

        // Auto hide after 10 seconds
        setTimeout(() => {
          setResetEmailSent(false);
          setShowForgotPassword(false);
        }, 10000);
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      showErrorToast(
        'เกิดข้อผิดพลาด',
        'ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้ กรุณาลองใหม่'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      showErrorToast(
        '⚠️ กรุณากรอกรหัสผ่าน',
        'กรุณากรอกรหัสผ่านใหม่และยืนยันรหัสผ่าน'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showErrorToast(
        '❌ รหัสผ่านไม่ตรงกัน',
        'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง'
      );
      return;
    }

    if (newPassword.length < 6) {
      showErrorToast(
        '❌ รหัสผ่านสั้นเกินไป',
        'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
      );
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        showErrorToast('เกิดข้อผิดพลาด', 'ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่');
      } else {
        toast({
          title: '✅ เปลี่ยนรหัสผ่านสำเร็จ',
          description: 'รหัสผ่านของคุณได้รับการอัปเดตแล้ว กำลังนำคุณเข้าสู่ระบบ...',
        });

        // Redirect to staff portal
        setTimeout(() => {
          isRecoveryRef.current = false;
          setShowResetPassword(false);
          navigate('/staff-portal', { replace: true });
        }, 1500);
      }
    } catch (error) {
      console.error('Update password error:', error);
      showErrorToast(
        'เกิดข้อผิดพลาด',
        'ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่'
      );
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-gradient-to-br from-primary/20 via-green-400/10 to-blue-500/20 rounded-full blur-2xl animate-pulse"></div>
            </div>
            <div className="relative z-10 space-y-3">
              <h1 className="text-5xl font-black bg-gradient-to-r from-primary via-green-600 to-blue-600 bg-clip-text text-transparent">
                โรงพยาบาลโฮม
              </h1>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-blue-500 mx-auto rounded-full"></div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xl font-semibold text-foreground/90">ระบบจัดการการนัดหมายและวัคซีน</p>
            <p className="text-sm text-muted-foreground">🔐 ปลอดภัย • 🚀 ใช้งานง่าย • ⚡ รวดเร็ว</p>
          </div>
        </div>

        {/* Reset Password Form */}
        {showResetPassword ? (
          <Card className="border-2 border-blue-200 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <LogIn className="h-4 w-4 text-white" />
                </div>
                ตั้งรหัสผ่านใหม่
              </CardTitle>
              <CardDescription>
                กรุณาสร้างรหัสผ่านใหม่สำหรับบัญชีของคุณ (อย่างน้อย 6 ตัวอักษร)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
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
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="border-2 border-blue-300 focus:border-blue-500"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  อัปเดตรหัสผ่าน
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowResetPassword(false);
                    isRecoveryRef.current = false;
                    navigate('/auth', { replace: true });
                  }}
                  className="w-full"
                >
                  กลับไปเข้าสู่ระบบ
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-green-200 shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-green-500 rounded-lg flex items-center justify-center">
                  <LogIn className="h-4 w-4 text-white" />
                </div>
                เข้าสู่ระบบ
              </CardTitle>
              <CardDescription>
                เลือกระหว่างเข้าสู่ระบบหรือสร้างบัญชีใหม่
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Sign Up Success Alert */}
              {signUpSuccess && (
                <Alert className="mb-4 border-green-500 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">✅ ลงทะเบียนสำเร็จ!</AlertTitle>
                  <AlertDescription className="text-green-700">
                    กรุณาตรวจสอบอีเมลของคุณและคลิกลิงก์ยืนยันเพื่อเปิดใช้งานบัญชี
                    จากนั้นกลับมาเข้าสู่ระบบที่นี่
                  </AlertDescription>
                </Alert>
              )}

              {/* Reset Email Sent Alert */}
              {resetEmailSent && (
                <Alert className="mb-4 border-blue-500 bg-blue-50">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">📧 ส่งอีเมลแล้ว!</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลของคุณแล้ว
                    กรุณาตรวจสอบอีเมล (รวมถึงโฟลเดอร์ spam) และคลิกลิงก์เพื่อรีเซ็ตรหัสผ่าน
                  </AlertDescription>
                </Alert>
              )}

              {!showForgotPassword ? (
                <Tabs value={isSignUp ? 'signup' : 'signin'} onValueChange={(v) => setIsSignUp(v === 'signup')}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="signin" className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      เข้าสู่ระบบ
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      ลงทะเบียน
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin" className="space-y-4">
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
                          className="border-2"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">รหัสผ่าน</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="border-2"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-primary to-green-500 hover:from-primary/90 hover:to-green-500/90"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            กำลังเข้าสู่ระบบ...
                          </>
                        ) : (
                          <>
                            <LogIn className="mr-2 h-4 w-4" />
                            เข้าสู่ระบบ
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setShowForgotPassword(true)}
                        className="w-full"
                      >
                        ลืมรหัสผ่าน?
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="space-y-4">
                    <Alert className="border-blue-500 bg-blue-50">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-800">ℹ️ ข้อมูลสำคัญ</AlertTitle>
                      <AlertDescription className="text-blue-700 text-sm">
                        หลังจากลงทะเบียน คุณจะได้รับอีเมลยืนยัน กรุณาคลิกลิงก์ในอีเมลเพื่อเปิดใช้งานบัญชี
                      </AlertDescription>
                    </Alert>
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
                          className="border-2"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">รหัสผ่าน</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="อย่างน้อย 6 ตัวอักษร"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className="border-2"
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            กำลังลงทะเบียน...
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-2 h-4 w-4" />
                            ลงทะเบียน
                          </>
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="space-y-4">
                  <div className="text-center space-y-2 mb-4">
                    <h3 className="text-lg font-semibold">รีเซ็ตรหัสผ่าน</h3>
                    <p className="text-sm text-muted-foreground">
                      กรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน
                    </p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">อีเมล</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="example@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="border-2"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          กำลังส่งอีเมล...
                        </>
                      ) : (
                        '📧 ส่งลิงก์รีเซ็ตรหัสผ่าน'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowForgotPassword(false)}
                      className="w-full"
                    >
                      กลับไปเข้าสู่ระบบ
                    </Button>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Back to Home Button */}
        {!showResetPassword && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 mx-auto"
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

export default ImprovedAuthPage;
