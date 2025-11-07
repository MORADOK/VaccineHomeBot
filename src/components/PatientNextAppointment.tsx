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
  last_dose_date: string | null;
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
      console.log('🔍 เริ่มโหลดข้อมูลการติดตามผู้ป่วย...');
      
      // Get all appointments for this user (both completed and scheduled)
      const { data: appointmentData, error: apptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('line_user_id', userId)
        .order('appointment_date', { ascending: false });

      if (apptError) throw apptError;

      console.log('📊 ข้อมูลนัดทั้งหมด:', appointmentData?.length || 0, 'รายการ');

      const completedAppointments = appointmentData?.filter(a => a.status === 'completed') || [];
      const scheduledAppointments = appointmentData?.filter(a => ['scheduled', 'pending'].includes(a.status)) || [];

      console.log('✅ การฉีดที่เสร็จสิ้น:', completedAppointments.length, 'รายการ');
      console.log('📅 นัดที่มีอยู่แล้ว:', scheduledAppointments.length, 'รายการ');

      // Get vaccine schedules for calculating next doses
      const { data: vaccineSchedules } = await supabase
        .from('vaccine_schedules')
        .select('*')
        .eq('active', true);

      console.log('💉 โหลดข้อมูลวัคซีน:', vaccineSchedules?.length || 0, 'ประเภท');

      const allNextAppointments: NextAppointment[] = [];

      // 1. First add existing scheduled appointments that haven't passed
      for (const scheduledAppt of scheduledAppointments) {
        if (new Date(scheduledAppt.appointment_date) > new Date()) {
          // Count completed doses for this vaccine type
          const completedDoses = completedAppointments.filter(a => 
            a.vaccine_type.toLowerCase() === scheduledAppt.vaccine_type.toLowerCase()
          );

          // Find vaccine schedule
          const schedule = vaccineSchedules?.find(vs => 
            vs.vaccine_type.toLowerCase() === scheduledAppt.vaccine_type.toLowerCase()
          );

          if (schedule) {
            allNextAppointments.push({
              id: `scheduled-${scheduledAppt.id}`,
              patient_id: userId,
              patient_name: scheduledAppt.patient_name || 'ผู้ใช้',
              vaccine_name: scheduledAppt.vaccine_name || schedule.vaccine_name,
              vaccine_type: scheduledAppt.vaccine_type,
              current_dose: completedDoses.length,
              total_doses: schedule.total_doses,
              next_dose_due: scheduledAppt.appointment_date,
              last_dose_date: completedDoses.length > 0 ? 
                completedDoses.reduce((latest, current) => 
                  new Date(current.appointment_date) > new Date(latest.appointment_date) ? current : latest
                ).appointment_date : '',
              completion_status: 'scheduled'
            });
            
            console.log(`📅 นัดที่มีอยู่: ${scheduledAppt.vaccine_type} วันที่ ${scheduledAppt.appointment_date}`);
          }
        }
      }

      // 2. Group completed appointments by vaccine type to calculate needed appointments
      const vaccineMap = new Map();
      
      for (const appt of completedAppointments || []) {
        const key = appt.vaccine_type;
        
        if (!vaccineMap.has(key)) {
          // Count completed doses for this vaccine type
          const completedDoses = completedAppointments.filter(a => 
            a.vaccine_type.toLowerCase() === appt.vaccine_type.toLowerCase()
          );

          console.log(`💉 วัคซีน: ${appt.vaccine_type}, โดสที่ฉีดแล้ว: ${completedDoses.length}`);

          // Find latest dose date
          const latestDose = completedDoses.reduce((latest, current) => 
            new Date(current.appointment_date) > new Date(latest.appointment_date) ? current : latest
          );

          console.log(`📅 เข็มล่าสุด: ${latestDose.appointment_date}`);

          vaccineMap.set(key, {
            vaccine_type: appt.vaccine_type,
            doses_received: completedDoses.length,
            latest_date: latestDose.appointment_date,
            patient_name: appt.patient_name
          });
        }
      }

      // 3. Calculate new appointments needed for completed patients
      const nextAppointmentPromises = Array.from(vaccineMap.values()).map(async (vaccine) => {
        try {
          // Find vaccine schedule
          const schedule = vaccineSchedules?.find(vs => 
            vs.vaccine_type.toLowerCase() === vaccine.vaccine_type.toLowerCase()
          );

          if (!schedule) {
            console.log(`❌ ไม่พบข้อมูลวัคซีน: ${vaccine.vaccine_type}`);
            return null;
          }

          // Check if patient needs next dose
          if (vaccine.doses_received >= schedule.total_doses) {
            console.log(`✅ ได้รับวัคซีน ${vaccine.vaccine_type} ครบแล้ว`);
            return null; // Already completed
          }

          // Check if patient already has a future appointment for this vaccine type
          const existingFutureAppointment = scheduledAppointments.find(appt => 
            appt.vaccine_type.toLowerCase() === vaccine.vaccine_type.toLowerCase() &&
            new Date(appt.appointment_date) > new Date()
          );

          if (existingFutureAppointment) {
            console.log(`📅 มีนัด ${vaccine.vaccine_type} แล้วในวันที่ ${existingFutureAppointment.appointment_date} - ข้าม`);
            return null; // Already has appointment (will be shown from existing appointments above)
          }

          // Calculate next dose date from FIRST dose + cumulative intervals
          const intervals = Array.isArray(schedule.dose_intervals) ? 
            schedule.dose_intervals : 
            JSON.parse(schedule.dose_intervals?.toString() || '[]');

          console.log(`📊 ข้อมูลจาก vaccine_schedules สำหรับ ${vaccine.patient_name}:`, {
            vaccine_type: schedule.vaccine_type,
            total_doses: schedule.total_doses,
            dose_intervals: intervals,
            current_dose: vaccine.doses_received,
            first_dose_date: vaccine.first_dose_date
          });

          // Calculate from the FIRST dose date, not the latest
          let baseDate = new Date(vaccine.first_dose_date);

          // Sum up all intervals up to the current dose to get the correct next dose date
          let totalDaysFromFirstDose = 0;
          for (let i = 0; i < vaccine.doses_received; i++) {
            const intervalDays = typeof intervals[i] === 'number' ? intervals[i] : 0;
            totalDaysFromFirstDose += intervalDays;
            console.log(`  เข็มที่ ${i + 1} -> ${i + 2}: +${intervalDays} วัน (รวม: ${totalDaysFromFirstDose} วัน)`);
          }

          // Calculate next dose date from first dose + cumulative intervals
          const nextDoseDate = new Date(baseDate);
          nextDoseDate.setDate(nextDoseDate.getDate() + totalDaysFromFirstDose);

          const nextDoseNumber = vaccine.doses_received + 1;
          const nextDoseIntervalFromSchedule = intervals[vaccine.doses_received] || 0;

          console.log(`🎯 ${vaccine.patient_name}: คำนวณจาก vaccine_schedules`);
          console.log(`   - เข็มแรก: ${vaccine.first_dose_date}`);
          console.log(`   - รวมระยะห่าง: ${totalDaysFromFirstDose} วัน`);
          console.log(`   - ต้องการโดส: ${nextDoseNumber}/${schedule.total_doses}`);
          console.log(`   - นัดคำนวน: ${nextDoseDate.toISOString().split('T')[0]}`);
          console.log(`   - ช่วงห่างจาก vaccine_schedules: ${nextDoseIntervalFromSchedule} วัน`);

          return {
            id: `new-${userId}-${vaccine.vaccine_type}`,
            patient_id: userId,
            patient_name: vaccine.patient_name || 'ผู้ใช้',
            vaccine_name: schedule.vaccine_name,
            vaccine_type: vaccine.vaccine_type,
            current_dose: vaccine.doses_received, // จำนวนโดสที่ฉีดแล้วจริง
            total_doses: schedule.total_doses,
            next_dose_due: nextDoseDate.toISOString().split('T')[0],
            last_dose_date: vaccine.latest_date, // วันที่ฉีดเข็มล่าสุดจริง
            completion_status: 'needs_appointment'
          };
        } catch (error) {
          console.error('Error processing vaccine:', vaccine.vaccine_type, error);
          return null;
        }
      });

      const results = await Promise.all(nextAppointmentPromises);
      const validNewAppointments = results.filter(appt => appt !== null);
      
      // 4. Combine existing and new appointments
      const allAppointments = [...allNextAppointments, ...validNewAppointments]
        .sort((a, b) => new Date(a.next_dose_due).getTime() - new Date(b.next_dose_due).getTime());
      
      console.log('✅ ข้อมูลการติดตามที่คำนวณได้:', allAppointments.length, 'รายการ');
      console.log('📅 นัดที่มีอยู่แล้ว:', allNextAppointments.length, 'รายการ');
      console.log('🆕 นัดใหม่ที่ต้องสร้าง:', validNewAppointments.length, 'รายการ');
      
      allAppointments.forEach(appt => {
        const status = appt.completion_status === 'scheduled' ? '(มีนัดแล้ว)' : '(ต้องสร้างนัด)';
        console.log(`- วัคซีน: ${appt.vaccine_name}, โดส ${appt.current_dose + 1}/${appt.total_doses}, นัด: ${appt.next_dose_due}, เข็มล่าสุด: ${appt.last_dose_date || 'ยังไม่มี'} ${status}`);
      });
      
      setNextAppointments(allAppointments);
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
                      {appointment.completion_status === 'scheduled' ? 
                        '✅ มีนัดหมายแล้ว - กรุณามาตามเวลาที่นัด' :
                        '💡 กรุณาติดต่อโรงพยาบาลโฮม เพื่อนัดหมายฉีดวัคซีนเข็มถัดไป'
                      }
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