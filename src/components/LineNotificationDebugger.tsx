/**
 * LINE Notification Debugger
 * ตรวจสอบและ debug ปัญหาการส่งแจ้งเตือนผ่าน LINE
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  RefreshCw,
  User,
  Key,
  Shield,
  MessageSquare
} from 'lucide-react';

interface CheckResult {
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function LineNotificationDebugger() {
  const [testUserId, setTestUserId] = useState('');
  const [testMessage, setTestMessage] = useState('🔔 ทดสอบการส่งข้อความจากระบบ VCHome Hospital');

  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);

  const [checks, setChecks] = useState<{
    auth?: CheckResult;
    role?: CheckResult;
    userId?: CheckResult;
    config?: CheckResult;
    send?: CheckResult;
  }>({});

  const { toast } = useToast();

  const validateLineUserId = (userId: string): boolean => {
    return /^U[0-9a-f]{32}$/i.test(userId);
  };

  const runDiagnostics = async () => {
    setChecking(true);
    const results: typeof checks = {};

    try {
      // 1. Check Authentication
      console.log('🔍 ตรวจสอบ Authentication...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        results.auth = {
          status: 'error',
          message: 'ไม่ได้เข้าสู่ระบบ',
          details: sessionError?.message || 'ไม่พบ session'
        };
      } else {
        results.auth = {
          status: 'success',
          message: 'เข้าสู่ระบบแล้ว',
          details: `User ID: ${session.user.id}`
        };

        // 2. Check Role
        console.log('🔍 ตรวจสอบสิทธิ์ Healthcare Staff...');
        try {
          const { data: isStaff, error: roleError } = await supabase.rpc('is_healthcare_staff', {
            _user_id: session.user.id
          });

          if (roleError) {
            results.role = {
              status: 'error',
              message: 'ไม่สามารถตรวจสอบสิทธิ์ได้',
              details: roleError.message
            };
          } else if (!isStaff) {
            results.role = {
              status: 'error',
              message: 'ไม่มีสิทธิ์ Healthcare Staff',
              details: 'ต้องการสิทธิ์ healthcare staff เพื่อส่งแจ้งเตือน'
            };
          } else {
            results.role = {
              status: 'success',
              message: 'มีสิทธิ์ Healthcare Staff',
              details: 'สามารถส่งแจ้งเตือนได้'
            };
          }
        } catch (roleErr: any) {
          results.role = {
            status: 'error',
            message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์',
            details: roleErr.message
          };
        }
      }

      // 3. Check LINE User ID Format
      console.log('🔍 ตรวจสอบ LINE User ID Format...');
      if (!testUserId) {
        results.userId = {
          status: 'warning',
          message: 'ยังไม่ได้ใส่ LINE User ID',
          details: 'กรุณาใส่ LINE User ID เพื่อทดสอบ'
        };
      } else if (!validateLineUserId(testUserId)) {
        results.userId = {
          status: 'error',
          message: 'LINE User ID ไม่ถูกต้อง',
          details: 'รูปแบบต้องเป็น U ตามด้วย hex 32 ตัว (เช่น U1234567890abcdef1234567890abcdef)'
        };
      } else {
        results.userId = {
          status: 'success',
          message: 'LINE User ID ถูกต้อง',
          details: `Format: ${testUserId.substring(0, 8)}...${testUserId.substring(testUserId.length - 4)}`
        };
      }

      // 4. Check LINE Configuration (ทดสอบเรียก Edge Function)
      console.log('🔍 ตรวจสอบการตั้งค่า LINE Channel...');
      try {
        // Try to invoke the function (will fail if config missing, but we can check the error)
        const { error: configError } = await supabase.functions.invoke('send-line-message', {
          body: {
            userId: 'U00000000000000000000000000000000', // Fake ID for testing config only
            message: 'test'
          }
        });

        if (configError) {
          if (configError.message.includes('LINE Channel Access Token not configured')) {
            results.config = {
              status: 'error',
              message: 'LINE Channel Access Token ไม่ได้ตั้งค่า',
              details: 'กรุณาตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ใน Supabase Edge Function secrets'
            };
          } else if (configError.message.includes('Invalid LINE userId')) {
            // This means config is OK, just userId is invalid (expected)
            results.config = {
              status: 'success',
              message: 'LINE Channel ตั้งค่าถูกต้อง',
              details: 'พร้อมส่งข้อความ'
            };
          } else if (configError.message.includes('Access denied')) {
            results.config = {
              status: 'warning',
              message: 'ไม่มีสิทธิ์เข้าถึง',
              details: 'ต้องการสิทธิ์ healthcare staff'
            };
          } else {
            results.config = {
              status: 'warning',
              message: 'ตรวจสอบไม่สมบูรณ์',
              details: configError.message
            };
          }
        } else {
          results.config = {
            status: 'success',
            message: 'LINE Channel ตั้งค่าถูกต้อง',
            details: 'พร้อมส่งข้อความ'
          };
        }
      } catch (configErr: any) {
        results.config = {
          status: 'error',
          message: 'ไม่สามารถตรวจสอบการตั้งค่าได้',
          details: configErr.message
        };
      }

      setChecks(results);

    } catch (error: any) {
      console.error('Error in diagnostics:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || 'ไม่สามารถตรวจสอบได้',
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const sendTestMessage = async () => {
    if (!testUserId || !validateLineUserId(testUserId)) {
      toast({
        title: "ข้อมูลไม่ถูกต้อง",
        description: "กรุณาใส่ LINE User ID ที่ถูกต้อง",
        variant: "destructive",
      });
      return;
    }

    if (!testMessage || testMessage.length === 0) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาใส่ข้อความที่ต้องการส่ง",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    const results = { ...checks };

    try {
      console.log('📤 กำลังส่งข้อความทดสอบ...');

      const { data, error } = await supabase.functions.invoke('send-line-message', {
        body: {
          userId: testUserId,
          message: testMessage
        }
      });

      console.log('Response:', data, error);

      if (error) {
        results.send = {
          status: 'error',
          message: 'ส่งข้อความไม่สำเร็จ',
          details: error.message
        };

        toast({
          title: "ส่งข้อความไม่สำเร็จ",
          description: error.message,
          variant: "destructive",
        });
      } else {
        results.send = {
          status: 'success',
          message: 'ส่งข้อความสำเร็จ',
          details: 'ข้อความถูกส่งไปยัง LINE แล้ว'
        };

        toast({
          title: "ส่งข้อความสำเร็จ",
          description: `ส่งข้อความไปยัง ${testUserId} แล้ว`,
        });
      }

      setChecks(results);

    } catch (error: any) {
      console.error('Error sending message:', error);

      results.send = {
        status: 'error',
        message: 'เกิดข้อผิดพลาด',
        details: error.message
      };

      setChecks(results);

      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || 'ไม่สามารถส่งข้อความได้',
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusIcon = (status?: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status?: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🔧 LINE Notification Debugger</h1>
        <p className="text-sm text-muted-foreground">
          ตรวจสอบและแก้ไขปัญหาการส่งแจ้งเตือนผ่าน LINE
        </p>
      </div>

      {/* Diagnostics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            ตรวจสอบระบบ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runDiagnostics} disabled={checking} className="w-full">
            {checking ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                กำลังตรวจสอบ...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                เริ่มตรวจสอบ
              </>
            )}
          </Button>

          {Object.keys(checks).length > 0 && (
            <div className="space-y-3">
              {/* Authentication Check */}
              {checks.auth && (
                <Alert className={getStatusColor(checks.auth.status)}>
                  <div className="flex items-start gap-3">
                    {getStatusIcon(checks.auth.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{checks.auth.message}</span>
                      </div>
                      {checks.auth.details && (
                        <p className="text-sm text-muted-foreground">{checks.auth.details}</p>
                      )}
                    </div>
                  </div>
                </Alert>
              )}

              {/* Role Check */}
              {checks.role && (
                <Alert className={getStatusColor(checks.role.status)}>
                  <div className="flex items-start gap-3">
                    {getStatusIcon(checks.role.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-4 w-4" />
                        <span className="font-medium">{checks.role.message}</span>
                      </div>
                      {checks.role.details && (
                        <p className="text-sm text-muted-foreground">{checks.role.details}</p>
                      )}
                    </div>
                  </div>
                </Alert>
              )}

              {/* User ID Check */}
              {checks.userId && (
                <Alert className={getStatusColor(checks.userId.status)}>
                  <div className="flex items-start gap-3">
                    {getStatusIcon(checks.userId.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{checks.userId.message}</span>
                      </div>
                      {checks.userId.details && (
                        <p className="text-sm text-muted-foreground">{checks.userId.details}</p>
                      )}
                    </div>
                  </div>
                </Alert>
              )}

              {/* Config Check */}
              {checks.config && (
                <Alert className={getStatusColor(checks.config.status)}>
                  <div className="flex items-start gap-3">
                    {getStatusIcon(checks.config.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Key className="h-4 w-4" />
                        <span className="font-medium">{checks.config.message}</span>
                      </div>
                      {checks.config.details && (
                        <p className="text-sm text-muted-foreground">{checks.config.details}</p>
                      )}
                    </div>
                  </div>
                </Alert>
              )}

              {/* Send Result */}
              {checks.send && (
                <Alert className={getStatusColor(checks.send.status)}>
                  <div className="flex items-start gap-3">
                    {getStatusIcon(checks.send.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-4 w-4" />
                        <span className="font-medium">{checks.send.message}</span>
                      </div>
                      {checks.send.details && (
                        <p className="text-sm text-muted-foreground">{checks.send.details}</p>
                      )}
                    </div>
                  </div>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Message Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            ทดสอบส่งข้อความ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-user-id">LINE User ID</Label>
            <Input
              id="test-user-id"
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              placeholder="U1234567890abcdef1234567890abcdef"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              รูปแบบ: U ตามด้วย hex 32 ตัว (ยาว 33 ตัวอักษร)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-message">ข้อความทดสอบ</Label>
            <Textarea
              id="test-message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="ข้อความที่ต้องการส่ง..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              ความยาว: {testMessage.length}/2000 ตัวอักษร
            </p>
          </div>

          <Button
            onClick={sendTestMessage}
            disabled={sending || !testUserId || !testMessage}
            className="w-full"
          >
            {sending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                กำลังส่ง...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                ส่งข้อความทดสอบ
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>💡 วิธีแก้ไขปัญหาที่พบบ่อย</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">1. LINE User ID ไม่ถูกต้อง</h3>
            <p className="text-sm text-muted-foreground">
              - LINE User ID ต้องเป็นรูปแบบ <code className="bg-gray-100 px-1">U</code> ตามด้วย hex 32 ตัว<br />
              - ตรวจสอบใน LINE Developer Console หรือ webhook events
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2">2. ไม่มีสิทธิ์ Healthcare Staff</h3>
            <p className="text-sm text-muted-foreground">
              - กรุณาติดต่อ Admin เพื่อเพิ่มสิทธิ์<br />
              - ตรวจสอบใน /manage-staff
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2">3. LINE Channel Access Token ไม่ได้ตั้งค่า</h3>
            <p className="text-sm text-muted-foreground">
              - ตั้งค่าใน Supabase Dashboard → Edge Functions → Secrets<br />
              - เพิ่ม secret: <code className="bg-gray-100 px-1">LINE_CHANNEL_ACCESS_TOKEN</code>
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-2">4. Session หมดอายุ</h3>
            <p className="text-sm text-muted-foreground">
              - ลองเข้าสู่ระบบใหม่<br />
              - ตรวจสอบว่า JWT token ยังใช้งานได้
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LineNotificationDebugger;
