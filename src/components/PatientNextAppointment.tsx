import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, MapPin, Syringe, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface NextAppointment {
  id: string;
  patient_id: string;
  patient_name: string;
  vaccine_name: string;
  vaccine_type: string;
  current_dose: number;
  total_doses: number;
  next_dose_due: string;
  last_dose_date: string;
  completion_status: string;
}

interface UpcomingAppointment {
  appointment_id: string;
  appointment_date: string;
  appointment_time: string;
  vaccine_name: string;
  vaccine_type: string;
  location: string;
  patient_name: string;
  status: string;
}

const PatientNextAppointment = () => {
  const [nextAppointments, setNextAppointments] = useState<NextAppointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lineUserId, setLineUserId] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    // ตรวจสอบ LINE User ID
    const checkLineUserId = async () => {
      try {
        if (window.liff && window.liff.isLoggedIn()) {
          const profile = await window.liff.getProfile();
          setLineUserId(profile.userId);
          loadNextAppointments(profile.userId);
          loadUpcomingAppointments(profile.userId);
        } else {
          console.log('LINE LIFF not available or not logged in');
        }
      } catch (error) {
        console.log('Error getting LINE profile:', error);
      }
    };

    checkLineUserId();
  }, []);

  const loadNextAppointments = async (userId: string) => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // ใช้ API function สำหรับดึงข้อมูลนัดครั้งต่อไป
      const { data, error } = await supabase.rpc('api_next_dose_for_patient', {
        _line_user_id: userId,
        _vaccine_type: 'all' // ดึงทุกประเภทวัคซีน
      });

      if (error) throw error;

      if (data && data.length > 0) {
        // แปลงข้อมูลให้เข้ากับ interface
        const appointments: NextAppointment[] = data.map((item: any) => ({
          id: item.vaccine_schedule_id,
          patient_id: userId,
          patient_name: 'ผู้ใช้',
          vaccine_name: item.vaccine_name,
          vaccine_type: item.vaccine_type,
          current_dose: item.doses_received,
          total_doses: item.total_doses,
          next_dose_due: item.recommended_date,
          last_dose_date: item.last_dose_date,
          completion_status: item.doses_received >= item.total_doses ? 'completed' : 'in_progress'
        })).filter((apt: NextAppointment) => apt.completion_status === 'in_progress' && apt.next_dose_due);

        setNextAppointments(appointments);
      }
    } catch (error: any) {
      console.error('Error loading next appointments:', error);
      toast({
        title: "ไม่สามารถโหลดข้อมูลได้",
        description: "กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUpcomingAppointments = async (userId: string) => {
    if (!userId) return;
    
    try {
      // ใช้ API function สำหรับดึงนัดหมายที่จะมาถึง
      const { data, error } = await supabase.rpc('api_next_appointments', {
        _line_user_id: userId,
        _limit: 5
      });

      if (error) throw error;

      if (data) {
        setUpcomingAppointments(data);
      }
    } catch (error: any) {
      console.error('Error loading upcoming appointments:', error);
    }
  };

  const refreshData = () => {
    if (lineUserId) {
      loadNextAppointments(lineUserId);
      loadUpcomingAppointments(lineUserId);
    }
  };

  const formatThaiDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (!lineUserId) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert>
          <AlertDescription>
            กรุณาเข้าสู่ระบบผ่าน LINE เพื่อดูข้อมูลนัดหมายของคุณ
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">นัดหมายของฉัน</h1>
          <p className="text-muted-foreground">ตรวจสอบนัดหมายและวัคซีนครั้งถัดไป</p>
        </div>
        <Button onClick={refreshData} disabled={isLoading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </div>

      {/* นัดหมายที่จะมาถึง */}
      {upcomingAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              นัดหมายที่จะมาถึง
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingAppointments.map((appointment, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{appointment.vaccine_name}</h3>
                  <Badge className={getStatusColor(appointment.status)}>
                    {appointment.status === 'scheduled' ? 'นัดแล้ว' : appointment.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatThaiDate(appointment.appointment_date)}
                  </div>
                  {appointment.appointment_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {appointment.appointment_time}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {appointment.location}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* วัคซีนครั้งถัดไปที่ต้องฉีด */}
      {nextAppointments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Syringe className="h-5 w-5" />
              วัคซีนครั้งถัดไปที่ต้องฉีด
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextAppointments.map((appointment) => {
              const daysUntil = getDaysUntilDue(appointment.next_dose_due);
              const isOverdue = daysUntil < 0;
              const isUrgent = daysUntil <= 7 && daysUntil >= 0;
              
              return (
                <div key={appointment.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{appointment.vaccine_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        เข็มที่ {appointment.current_dose + 1} จาก {appointment.total_doses} เข็ม
                      </p>
                    </div>
                    <Badge 
                      variant={isOverdue ? "destructive" : isUrgent ? "secondary" : "outline"}
                      className={isOverdue ? "bg-red-100 text-red-800" : isUrgent ? "bg-yellow-100 text-yellow-800" : ""}
                    >
                      {isOverdue ? `เลยกำหนด ${Math.abs(daysUntil)} วัน` : 
                       isUrgent ? `อีก ${daysUntil} วัน` : 
                       `อีก ${daysUntil} วัน`}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">วันที่ควรฉีด:</span>
                      <p className="font-medium">{formatThaiDate(appointment.next_dose_due)}</p>
                    </div>
                    {appointment.last_dose_date && (
                      <div>
                        <span className="text-muted-foreground">เข็มล่าสุด:</span>
                        <p className="font-medium">{formatThaiDate(appointment.last_dose_date)}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 กรุณาติดต่อโรงพยาบาลโฮม เพื่อนัดหมายฉีดวัคซีนเข็มถัดไป
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="font-semibold mb-2">ไม่มีวัคซีนที่ต้องฉีดครั้งถัดไป</h3>
            <p className="text-muted-foreground">
              วัคซีนทั้งหมดของคุณครบตามกำหนดแล้ว หรือยังไม่มีการลงทะเบียนฉีดวัคซีน
            </p>
          </CardContent>
        </Card>
      )}

      {/* ข้อมูลติดต่อ */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="font-semibold mb-2">โรงพยาบาลโฮม</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>📞 โทร: 02-xxx-xxxx</p>
              <p>📍 ที่อยู่: [ใส่ที่อยู่โรงพยาบาล]</p>
              <p>🕐 เวลาทำการ: จันทร์-ศุกร์ 08:00-17:00</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientNextAppointment;