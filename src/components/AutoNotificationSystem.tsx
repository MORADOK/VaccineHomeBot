import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bell, 
  Clock, 
  Send, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Calendar,
  Users,
  MessageSquare,
  Settings,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { th } from 'date-fns/locale';

interface NotificationSchedule {
  id: string;
  patient_tracking_id: string;
  notification_type: string;
  scheduled_date: string;
  sent: boolean;
  sent_at: string | null;
  message_content: string | null;
  line_user_id: string;
  created_at: string;
}

interface PatientTracking {
  id: string;
  patient_id: string;
  patient_name: string;
  auto_reminder_enabled: boolean;
  reminder_days_before: number;
  next_dose_due: string | null;
  vaccine_schedules?: {
    vaccine_name: string;
    vaccine_type: string;
  };
}

const AutoNotificationSystem: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationSchedule[]>([]);
  const [patients, setPatients] = useState<PatientTracking[]>([]);
  const [loading, setLoading] = useState(false);
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    sent: 0,
    overdue: 0,
    today: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
    loadPatients();
    calculateStats();
  }, []);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_schedules')
        .select('*')
        .order('scheduled_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดตารางการแจ้งเตือนได้",
        variant: "destructive"
      });
    }
  };

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patient_vaccine_tracking')
        .select(`
          *,
          vaccine_schedules(vaccine_name, vaccine_type)
        `)
        .eq('completion_status', 'in_progress')
        .eq('auto_reminder_enabled', true);

      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลผู้ป่วยได้",
        variant: "destructive"
      });
    }
  };

  const calculateStats = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_schedules')
        .select('scheduled_date, sent');

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      
      const stats = {
        total: data?.length || 0,
        pending: data?.filter(n => !n.sent).length || 0,
        sent: data?.filter(n => n.sent).length || 0,
        overdue: data?.filter(n => !n.sent && n.scheduled_date < today).length || 0,
        today: data?.filter(n => n.scheduled_date === today).length || 0
      };

      setStats(stats);
    } catch (error: any) {
      console.error('Error calculating stats:', error);
    }
  };

  const sendDueReminders = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('vaccine-reminder-system', {
        body: { action: 'send_due_reminders' }
      });

      if (response.error) throw response.error;

      const result = response.data;
      toast({
        title: "ส่งการแจ้งเตือนเรียบร้อย",
        description: `ส่งสำเร็จ ${result.sent} ข้อความ, ข้อผิดพลาด ${result.errors} ข้อความ`,
        variant: "default"
      });

      loadNotifications();
      calculateStats();
    } catch (error: any) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถส่งการแจ้งเตือนได้",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendSingleReminder = async (patientId: string) => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('vaccine-reminder-system', {
        body: { 
          action: 'send_single_reminder',
          patient_id: patientId
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "ส่งการแจ้งเตือนเรียบร้อย",
        description: "ส่งข้อความแจ้งเตือนให้ผู้ป่วยแล้ว",
        variant: "default"
      });

      loadNotifications();
    } catch (error: any) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถส่งการแจ้งเตือนได้",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkOverdueAppointments = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('vaccine-reminder-system', {
        body: { action: 'check_overdue' }
      });

      if (response.error) throw response.error;

      const result = response.data;
      toast({
        title: "ตรวจสอบเรียบร้อย",
        description: `พบการนัดที่เกินกำหนด ${result.overdue_count} รายการ, ส่งแจ้งเตือน ${result.notifications_sent} ข้อความ`,
        variant: "default"
      });

      loadNotifications();
      loadPatients();
      calculateStats();
    } catch (error: any) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถตรวจสอบการนัดเกินกำหนดได้",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendCustomMessage = async () => {
    if (!selectedPatient || !customMessage.trim()) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณาเลือกผู้ป่วนและระบุข้อความ",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('send-line-message', {
        body: {
          userId: selectedPatient,
          message: customMessage,
          type: 'text'
        }
      });

      if (response.error) throw response.error;

      // Log the notification
      await supabase
        .from('appointment_notifications')
        .insert({
          sent_to: selectedPatient,
          notification_type: 'custom',
          message_content: customMessage,
          status: 'sent',
          line_user_id: selectedPatient
        });

      toast({
        title: "ส่งข้อความเรียบร้อย",
        description: "ส่งข้อความให้ผู้ป่วยแล้ว",
        variant: "default"
      });

      setCustomMessage('');
      setSelectedPatient('');
    } catch (error: any) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถส่งข้อความได้",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateReminderSettings = async (patientId: string, enabled: boolean, daysBefore: number) => {
    try {
      const { error } = await supabase
        .from('patient_vaccine_tracking')
        .update({
          auto_reminder_enabled: enabled,
          reminder_days_before: daysBefore
        })
        .eq('id', patientId);

      if (error) throw error;

      toast({
        title: "บันทึกการตั้งค่าเรียบร้อย",
        description: "อัพเดทการตั้งค่าการแจ้งเตือนแล้ว",
        variant: "default"
      });

      loadPatients();
    } catch (error: any) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการตั้งค่าได้",
        variant: "destructive"
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reminder': return <Bell className="h-4 w-4 text-blue-500" />;
      case 'due': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'overdue': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'booster': return <RefreshCw className="h-4 w-4 text-purple-500" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getNotificationStatus = (notification: NotificationSchedule) => {
    if (notification.sent) {
      return <Badge className="bg-green-500">ส่งแล้ว</Badge>;
    }

    const scheduledDate = parseISO(notification.scheduled_date);
    if (isPast(scheduledDate) && !isToday(scheduledDate)) {
      return <Badge className="bg-red-500">เกินกำหนด</Badge>;
    }

    if (isToday(scheduledDate)) {
      return <Badge className="bg-orange-500">วันนี้</Badge>;
    }

    if (isTomorrow(scheduledDate)) {
      return <Badge className="bg-blue-500">พรุ่งนี้</Badge>;
    }

    return <Badge variant="outline">รอส่ง</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">ระบบแจ้งเตือนอัตโนมัติ</h1>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">เปิดใช้งานระบบ</span>
          <Switch 
            checked={systemEnabled} 
            onCheckedChange={setSystemEnabled}
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">ทั้งหมด</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">รอส่ง</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">ส่งแล้ว</p>
                <p className="text-2xl font-bold">{stats.sent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">เกินกำหนด</p>
                <p className="text-2xl font-bold">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">วันนี้</p>
                <p className="text-2xl font-bold">{stats.today}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>ควบคุมระบบ</span>
          </CardTitle>
          <CardDescription>
            จัดการการส่งการแจ้งเตือนและตรวจสอบสถานะ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={sendDueReminders} 
              disabled={loading || !systemEnabled}
              className="flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>ส่งการแจ้งเตือนวันนี้</span>
            </Button>

            <Button 
              onClick={checkOverdueAppointments} 
              disabled={loading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>ตรวจสอบเกินกำหนด</span>
            </Button>

            <Button 
              onClick={() => {
                loadNotifications();
                calculateStats();
              }} 
              disabled={loading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>รีเฟรช</span>
            </Button>
          </div>

          {stats.overdue > 0 && (
            <Alert className="border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                พบการแจ้งเตือนที่เกินกำหนด {stats.overdue} รายการ กรุณาตรวจสอบและดำเนินการ
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Custom Message */}
      <Card>
        <CardHeader>
          <CardTitle>ส่งข้อความกำหนดเอง</CardTitle>
          <CardDescription>
            ส่งข้อความแจ้งเตือนพิเศษให้ผู้ป่วยรายบุคคล
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient-select">เลือกผู้ป่วย</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกผู้ป่วย" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.patient_id}>
                      {patient.patient_name} ({patient.vaccine_schedules?.vaccine_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-message">ข้อความ</Label>
            <textarea
              id="custom-message"
              className="w-full min-h-[100px] p-3 border rounded-md resize-vertical"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="ระบุข้อความที่ต้องการส่ง..."
            />
          </div>

          <Button 
            onClick={sendCustomMessage} 
            disabled={loading || !selectedPatient || !customMessage.trim()}
            className="flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>ส่งข้อความ</span>
          </Button>
        </CardContent>
      </Card>

      {/* Patient Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>การตั้งค่าผู้ป่วย</span>
          </CardTitle>
          <CardDescription>
            จัดการการตั้งค่าการแจ้งเตือนสำหรับผู้ป่วยแต่ละคน
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {patients.map((patient) => (
              <div key={patient.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium">{patient.patient_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {patient.vaccine_schedules?.vaccine_name} - 
                        นัดครั้งถัดไป: {patient.next_dose_due ? format(parseISO(patient.next_dose_due), 'dd/MM/yyyy') : 'ไม่กำหนด'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendSingleReminder(patient.patient_id)}
                      disabled={loading}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      ส่งแจ้งเตือน
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={patient.auto_reminder_enabled}
                      onCheckedChange={(checked) => 
                        updateReminderSettings(patient.id, checked, patient.reminder_days_before)
                      }
                    />
                    <Label className="text-sm">การแจ้งเตือนอัตโนมัติ</Label>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">แจ้งเตือนก่อน (วัน)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="7"
                      value={patient.reminder_days_before}
                      onChange={(e) => {
                        const days = parseInt(e.target.value) || 1;
                        updateReminderSettings(patient.id, patient.auto_reminder_enabled, days);
                      }}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            ))}

            {patients.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>ไม่มีผู้ป่วยที่เปิดใช้การแจ้งเตือนอัตโนมัติ</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification History */}
      <Card>
        <CardHeader>
          <CardTitle>ประวัติการแจ้งเตือน</CardTitle>
          <CardDescription>
            รายการการแจ้งเตือนทั้งหมดที่กำหนดไว้ในระบบ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div key={notification.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getNotificationIcon(notification.notification_type)}
                  <div>
                    <p className="font-medium text-sm">
                      ถึง: {notification.line_user_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      กำหนดส่ง: {format(parseISO(notification.scheduled_date), 'dd MMM yyyy', { locale: th })}
                    </p>
                    {notification.sent && notification.sent_at && (
                      <p className="text-xs text-green-600">
                        ส่งแล้ว: {format(parseISO(notification.sent_at), 'dd MMM yyyy HH:mm', { locale: th })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getNotificationStatus(notification)}
                  <Badge variant="outline" className="text-xs">
                    {notification.notification_type}
                  </Badge>
                </div>
              </div>
            ))}

            {notifications.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>ยังไม่มีการแจ้งเตือนในระบบ</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoNotificationSystem;