import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Send,
  RefreshCw,
  Activity,
  Calendar,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface NotificationLog {
  id: string;
  appointment_id: string;
  notification_type: string;
  sent_to: string;
  message_content: string;
  status: string;
  sent_at: string;
  created_at: string;
}

interface NotificationStats {
  appointmentsChecked: number;
  overdueAppointmentsChecked: number;
  notificationsSent: number;
  errors: number;
}

const AutoNotificationSystem = () => {
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<{ statistics?: NotificationStats; timestamp?: string } | null>(null);
  const { toast } = useToast();

  // โหลดประวัติการแจ้งเตือน
  const loadNotificationHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('appointment_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error('Error loading notification history:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดประวัติการแจ้งเตือนได้",
        variant: "destructive",
      });
    }
  };

  // เรียกใช้ระบบแจ้งเตือนอัตโนมัติ
  const runAutoNotifications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manual-notification-trigger', {
        body: {}
      });

      if (error) throw error;

      setLastRunResult(data.result);
      
      toast({
        title: "ระบบแจ้งเตือนทำงานสำเร็จ",
        description: `ส่งการแจ้งเตือน ${data.result?.statistics?.notificationsSent || 0} รายการ`,
      });

      // โหลดประวัติใหม่หลังจากส่งการแจ้งเตือน
      setTimeout(() => {
        loadNotificationHistory();
      }, 2000);
      
    } catch (error: any) {
      console.error('Error running auto notifications:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถเรียกใช้ระบบแจ้งเตือนได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case 'reminder': return <Clock className="h-4 w-4" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationTypeText = (type: string) => {
    switch (type) {
      case 'reminder': return 'แจ้งเตือนล่วงหน้า';
      case 'overdue': return 'การนัดเกินกำหนด';
      default: return type;
    }
  };

  useEffect(() => {
    loadNotificationHistory();
  }, []);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ส่วนควบคุมระบบ */}
      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Activity className="h-5 w-5 text-primary" />
            ระบบแจ้งเตือนอัตโนมัติ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <Alert>
            <Bell className="h-4 w-4" />
            <AlertDescription className="text-sm md:text-base">
              ระบบจะตรวจสอบและส่งการแจ้งเตือนล่วงหน้าอัตโนมัติ:
              <br />• แจ้งเตือน 1 วันก่อนวันนัด และ 8 ชั่วโมงก่อนวันนัด
              <br />• ตรวจสอบการนัดเกินกำหนดและส่งการแจ้งเตือน
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={runAutoNotifications} 
              disabled={isLoading}
              className="flex-1 h-11"
            >
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? 'กำลังดำเนินการ...' : 'เรียกใช้ระบบแจ้งเตือน'}
            </Button>
            <Button 
              onClick={loadNotificationHistory} 
              variant="outline"
              className="h-11"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              รีเฟรช
            </Button>
          </div>

          {/* สถิติการทำงานล่าสุด */}
          {lastRunResult?.statistics && (
            <div className="mt-4 p-3 md:p-4 bg-muted/50 rounded-lg border">
              <h3 className="font-medium text-sm md:text-base mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                ผลการทำงานล่าสุด
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-lg">{lastRunResult.statistics.appointmentsChecked}</div>
                  <div className="text-muted-foreground">นัดพรุ่งนี้</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg">{lastRunResult.statistics.overdueAppointmentsChecked}</div>
                  <div className="text-muted-foreground">นัดเกินกำหนด</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg text-green-600">{lastRunResult.statistics.notificationsSent}</div>
                  <div className="text-muted-foreground">ส่งสำเร็จ</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg text-red-600">{lastRunResult.statistics.errors}</div>
                  <div className="text-muted-foreground">ข้อผิดพลาด</div>
                </div>
              </div>
              {lastRunResult.timestamp && (
                <div className="text-xs text-muted-foreground mt-2">
                  เมื่อ: {new Date(lastRunResult.timestamp).toLocaleString('th-TH')}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ประวัติการแจ้งเตือน */}
      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Calendar className="h-5 w-5 text-primary" />
            ประวัติการแจ้งเตือน ({notifications.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>ยังไม่มีการแจ้งเตือน</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="border rounded-lg p-3 md:p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {getNotificationTypeIcon(notification.notification_type)}
                      <span className="font-medium text-sm md:text-base">
                        {getNotificationTypeText(notification.notification_type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(notification.status) + ' text-xs'}>
                        {notification.status === 'sent' ? 'ส่งแล้ว' : 
                         notification.status === 'failed' ? 'ไม่สำเร็จ' : 
                         notification.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString('th-TH')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-2">
                    ส่งถึง: {notification.sent_to}
                  </div>
                  
                  <div className="text-xs md:text-sm bg-background p-2 rounded border border-border/30 max-h-20 overflow-y-auto">
                    {notification.message_content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoNotificationSystem;