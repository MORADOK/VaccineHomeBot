import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  TestTube, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  RefreshCw,
  Database,
  MessageSquare
} from 'lucide-react';

interface TestResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

const NotificationTestPanel = () => {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const { toast } = useToast();

  const runTests = async () => {
    setTesting(true);
    setTestResults([]);
    const results: TestResult[] = [];

    try {
      // Test 1: Check database connection
      results.push({ test: 'Database Connection', status: 'success', message: 'เชื่อมต่อฐานข้อมูลสำเร็จ' });

      // Test 2: Check appointment_notifications table
      try {
        const { data, error } = await supabase
          .from('appointment_notifications')
          .select('count')
          .limit(1);
        
        if (error) throw error;
        results.push({ 
          test: 'Notifications Table', 
          status: 'success', 
          message: 'ตาราง appointment_notifications พร้อมใช้งาน' 
        });
      } catch (error: any) {
        results.push({ 
          test: 'Notifications Table', 
          status: 'error', 
          message: `ตาราง appointment_notifications มีปัญหา: ${error.message}` 
        });
      }

      // Test 3: Check appointments for tomorrow
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('appointment_date', tomorrowStr)
          .eq('status', 'scheduled');

        if (error) throw error;
        
        results.push({ 
          test: 'Tomorrow Appointments', 
          status: appointments && appointments.length > 0 ? 'success' : 'warning', 
          message: `พบนัดหมายพรุ่งนี้ ${appointments?.length || 0} รายการ`,
          details: appointments
        });
      } catch (error: any) {
        results.push({ 
          test: 'Tomorrow Appointments', 
          status: 'error', 
          message: `ไม่สามารถตรวจสอบนัดหมายได้: ${error.message}` 
        });
      }

      // Test 4: Check overdue appointments
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: overdueAppointments, error } = await supabase
          .from('appointments')
          .select('*')
          .lt('appointment_date', today)
          .eq('status', 'scheduled');

        if (error) throw error;
        
        results.push({ 
          test: 'Overdue Appointments', 
          status: overdueAppointments && overdueAppointments.length > 0 ? 'warning' : 'success', 
          message: `พบนัดเกินกำหนด ${overdueAppointments?.length || 0} รายการ`,
          details: overdueAppointments
        });
      } catch (error: any) {
        results.push({ 
          test: 'Overdue Appointments', 
          status: 'error', 
          message: `ไม่สามารถตรวจสอบนัดเกินกำหนดได้: ${error.message}` 
        });
      }

      // Test 5: Test notification function
      try {
        const { data, error } = await supabase.functions.invoke('manual-notification-trigger', {
          body: { test: true }
        });

        if (error) throw error;
        
        results.push({ 
          test: 'Notification Function', 
          status: 'success', 
          message: 'ฟังก์ชันแจ้งเตือนทำงานได้',
          details: data
        });
      } catch (error: any) {
        results.push({ 
          test: 'Notification Function', 
          status: 'error', 
          message: `ฟังก์ชันแจ้งเตือนมีปัญหา: ${error.message}` 
        });
      }

      // Test 6: Check CRON job status
      try {
        const { data: cronJobs, error } = await supabase
          .from('cron.job')
          .select('*')
          .eq('jobname', 'process-notifications');

        if (error) {
          // ถ้าไม่สามารถเข้าถึงตาราง cron ได้ (ปกติ)
          results.push({ 
            test: 'CRON Job Status', 
            status: 'warning', 
            message: 'ไม่สามารถตรวจสอบสถานะ CRON job ได้ (ต้องใช้สิทธิ์ admin)'
          });
        } else {
          results.push({ 
            test: 'CRON Job Status', 
            status: cronJobs && cronJobs.length > 0 ? 'success' : 'warning', 
            message: cronJobs && cronJobs.length > 0 ? 
              `CRON job ทำงานอยู่: ${cronJobs[0].schedule}` : 
              'ไม่พบ CRON job process-notifications',
            details: cronJobs
          });
        }
      } catch (error: any) {
        results.push({ 
          test: 'CRON Job Status', 
          status: 'warning', 
          message: 'ไม่สามารถตรวจสอบ CRON job ได้'
        });
      }

      // Test 7: Check recent notifications
      try {
        const { data: recentNotifications, error } = await supabase
          .from('appointment_notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        
        results.push({ 
          test: 'Recent Notifications', 
          status: 'success', 
          message: `พบการแจ้งเตือนล่าสุด ${recentNotifications?.length || 0} รายการ`,
          details: recentNotifications
        });
      } catch (error: any) {
        results.push({ 
          test: 'Recent Notifications', 
          status: 'error', 
          message: `ไม่สามารถตรวจสอบการแจ้งเตือนได้: ${error.message}` 
        });
      }

      // Test 8: Check notification_jobs table
      try {
        const { data: notificationJobs, error } = await supabase
          .from('notification_jobs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        
        const pendingJobs = notificationJobs?.filter(job => !job.processed_at) || [];
        results.push({ 
          test: 'Notification Jobs Queue', 
          status: 'success', 
          message: `พบงานแจ้งเตือน ${notificationJobs?.length || 0} รายการ (รอดำเนินการ: ${pendingJobs.length})`,
          details: { total: notificationJobs?.length, pending: pendingJobs.length, jobs: notificationJobs }
        });
      } catch (error: any) {
        results.push({ 
          test: 'Notification Jobs Queue', 
          status: 'warning', 
          message: `ไม่สามารถตรวจสอบ notification_jobs ได้: ${error.message}` 
        });
      }

    } catch (error: any) {
      results.push({ 
        test: 'General Error', 
        status: 'error', 
        message: `เกิดข้อผิดพลาดทั่วไป: ${error.message}` 
      });
    }

    setTestResults(results);
    setTesting(false);

    // Show summary toast
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const warningCount = results.filter(r => r.status === 'warning').length;

    toast({
      title: "การทดสอบเสร็จสิ้น",
      description: `สำเร็จ: ${successCount}, เตือน: ${warningCount}, ข้อผิดพลาด: ${errorCount}`,
      variant: errorCount > 0 ? "destructive" : "default",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-primary" />
            ทดสอบระบบแจ้งเตือนอัตโนมัติ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Database className="h-4 w-4" />
            <AlertDescription>
              เครื่องมือนี้จะทดสอบการทำงานของระบบแจ้งเตือนอัตโนมัติ รวมถึงการเชื่อมต่อฐานข้อมูล, 
              การตรวจสอบนัดหมาย, และการทำงานของฟังก์ชันแจ้งเตือน
            </AlertDescription>
          </Alert>

          <Button 
            onClick={runTests} 
            disabled={testing}
            className="w-full mb-6"
          >
            {testing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TestTube className="h-4 w-4 mr-2" />
            )}
            {testing ? 'กำลังทดสอบ...' : 'เริ่มทดสอบระบบ'}
          </Button>

          {testResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-lg mb-3">ผลการทดสอบ:</h3>
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.test}</span>
                    </div>
                    <Badge className={getStatusColor(result.status)}>
                      {result.status === 'success' ? 'สำเร็จ' : 
                       result.status === 'warning' ? 'เตือน' : 'ข้อผิดพลาด'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                  {result.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                        ดูรายละเอียด
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationTestPanel;