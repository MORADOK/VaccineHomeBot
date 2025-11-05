import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CalendarPlus, Search, Calendar, Syringe, RefreshCw, Send, Clock } from 'lucide-react';

interface NextAppointment {
  id: string;
  patient_id: string;
  patient_name: string;
  vaccine_name?: string;
  vaccine_type?: string;
  current_dose: number;
  total_doses: number;
  next_dose_due: string;
  last_dose_date: string | null;
  first_dose_date?: string | null;
  completion_status: string;
  line_user_id?: string;
  vaccine_schedule_id?: string;
  is_existing_appointment?: boolean;
}

const NextAppointments = () => {
  const [nextAppointments, setNextAppointments] = useState<NextAppointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingAppointment, setCreatingAppointment] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const { toast } = useToast();

  const loadNextAppointments = async () => {
    setLoading(true);
    try {
      console.log('🔍 เริ่มโหลดข้อมูลนัดครั้งถัดไป...');
      
      // Get all appointments (both completed and scheduled) to check for existing future appointments
      const { data: appointmentData, error: apptError } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: false });

      if (apptError) throw apptError;

      console.log('📊 ข้อมูลนัดทั้งหมด:', appointmentData?.length || 0, 'รายการ');

      const completedAppointments = appointmentData?.filter(a => a.status === 'completed') || [];
      // กรองเฉพาะนัดที่ยังไม่ถูกยกเลิกและยังไม่หมดอายุ
      const scheduledAppointments = appointmentData?.filter(a => 
        ['scheduled', 'pending'].includes(a.status) && 
        new Date(a.appointment_date) >= new Date()
      ) || [];

      console.log('✅ การฉีดที่เสร็จสิ้น:', completedAppointments.length, 'รายการ');
      console.log('📅 นัดที่มีอยู่แล้ว:', scheduledAppointments.length, 'รายการ');

      // Group by patient and vaccine type to get latest doses and calculate actual dose counts
      const patientVaccineMap = new Map();
      
      for (const appt of completedAppointments || []) {
        const patientKey = appt.patient_id_number || appt.line_user_id;
        const key = `${patientKey}-${appt.vaccine_type}`;
        
        if (!patientVaccineMap.has(key)) {
          // Count completed doses for this patient and vaccine type
          const completedDoses = completedAppointments.filter(a => {
            const aPatientKey = a.patient_id_number || a.line_user_id;
            return (aPatientKey === patientKey) &&
                   a.vaccine_type === appt.vaccine_type &&
                   a.status === 'completed';
          });

          console.log(`👤 ผู้ป่วย: ${appt.patient_name}, วัคซีน: ${appt.vaccine_type}, โดสที่ฉีดแล้ว: ${completedDoses.length}`);

          // Find latest dose date
          const latestDose = completedDoses.reduce((latest, current) => 
            new Date(current.appointment_date) > new Date(latest.appointment_date) ? current : latest
          );

          // Find first dose date
          const firstDose = completedDoses.reduce((earliest, current) => 
            new Date(current.appointment_date) < new Date(earliest.appointment_date) ? current : earliest
          );

          console.log(`📅 เข็มล่าสุด: ${latestDose.appointment_date}, เข็มแรก: ${firstDose.appointment_date}`);

          patientVaccineMap.set(key, {
            patient_id: patientKey,
            patient_name: appt.patient_name,
            line_user_id: appt.line_user_id,
            vaccine_type: appt.vaccine_type,
            doses_received: completedDoses.length,
            latest_date: latestDose.appointment_date,
            first_dose_date: firstDose.appointment_date
          });
        }
      }

      // Get vaccine schedules for calculating next doses
      const { data: vaccineSchedules } = await supabase
        .from('vaccine_schedules')
        .select('*')
        .eq('active', true);

      console.log('💉 โหลดข้อมูลวัคซีน:', vaccineSchedules?.length || 0, 'ประเภท');

      // Initialize arrays for storing appointments
      const allNextAppointments: NextAppointment[] = [];

      // Calculate next appointments manually - include both new appointments and existing scheduled ones
      // 1. First add existing scheduled appointments that haven't passed and aren't cancelled
      for (const scheduledAppt of scheduledAppointments) {
        // Double check that appointment is still valid
        if (new Date(scheduledAppt.appointment_date) > new Date() && 
            ['scheduled', 'pending'].includes(scheduledAppt.status)) {
          const patientKey = scheduledAppt.patient_id_number || scheduledAppt.line_user_id;
          
          // Find completed doses for this patient and vaccine
          const completedDoses = completedAppointments.filter(a => {
            const aPatientKey = a.patient_id_number || a.line_user_id;
            return (aPatientKey === patientKey) &&
                   a.vaccine_type.toLowerCase() === scheduledAppt.vaccine_type.toLowerCase();
          });

          // Find vaccine schedule
          const schedule = vaccineSchedules?.find(vs => 
            vs.vaccine_type.toLowerCase() === scheduledAppt.vaccine_type.toLowerCase()
          );

          if (schedule) {
            allNextAppointments.push({
              id: `scheduled-${scheduledAppt.id}`,
              patient_id: patientKey,
              patient_name: scheduledAppt.patient_name,
              vaccine_name: scheduledAppt.vaccine_name || schedule.vaccine_name,
              vaccine_type: scheduledAppt.vaccine_type,
              current_dose: completedDoses.length,
              total_doses: schedule.total_doses,
              next_dose_due: scheduledAppt.appointment_date,
              last_dose_date: completedDoses.length > 0 ? 
                completedDoses.reduce((latest, current) => 
                  new Date(current.appointment_date) > new Date(latest.appointment_date) ? current : latest
                ).appointment_date : null,
              first_dose_date: completedDoses.length > 0 ?
                completedDoses.reduce((earliest, current) => 
                  new Date(current.appointment_date) < new Date(earliest.appointment_date) ? current : earliest
                ).appointment_date : null,
              completion_status: 'scheduled',
              line_user_id: scheduledAppt.line_user_id,
              vaccine_schedule_id: schedule.id,
              is_existing_appointment: true
            });
            
            console.log(`📅 นัดที่มีอยู่: ${scheduledAppt.patient_name} - ${scheduledAppt.vaccine_type} วันที่ ${scheduledAppt.appointment_date}`);
          }
        }
      }
      
      // 2. Then calculate new appointments needed for completed patients
      const nextAppointmentPromises = Array.from(patientVaccineMap.values()).map(async (patient) => {
        try {
          // Find vaccine schedule
          const schedule = vaccineSchedules?.find(vs => 
            vs.vaccine_type.toLowerCase() === patient.vaccine_type.toLowerCase()
          );

          if (!schedule) {
            console.log(`❌ ไม่พบข้อมูลวัคซีน: ${patient.vaccine_type}`);
            return null;
          }

          // Check if patient needs next dose
          if (patient.doses_received >= schedule.total_doses) {
            console.log(`✅ ผู้ป่วย ${patient.patient_name} ได้รับวัคซีน ${patient.vaccine_type} ครบแล้ว`);
            return null; // Already completed
          }

          // Check if patient already has a future appointment for this vaccine type (and not cancelled)
          const existingFutureAppointment = scheduledAppointments.find(appt => {
            const apptPatientKey = appt.patient_id_number || appt.line_user_id;
            return (apptPatientKey === patient.patient_id) &&
                   appt.vaccine_type.toLowerCase() === patient.vaccine_type.toLowerCase() &&
                   new Date(appt.appointment_date) > new Date() &&
                   ['scheduled', 'pending'].includes(appt.status);
          });

          if (existingFutureAppointment) {
            console.log(`📅 ผู้ป่วย ${patient.patient_name} มีนัด ${patient.vaccine_type} แล้วในวันที่ ${existingFutureAppointment.appointment_date} - ข้าม`);
            return null; // Already has appointment (will be shown from existing appointments above)
          }

          // Calculate next dose date from vaccine_schedules (source of truth)
          // Calculate from FIRST dose to ensure accuracy
          const intervals = Array.isArray(schedule.dose_intervals) ?
            schedule.dose_intervals :
            JSON.parse(schedule.dose_intervals?.toString() || '[]');

          console.log(`📊 ข้อมูลจาก vaccine_schedules สำหรับ ${patient.patient_name}:`, {
            vaccine_type: schedule.vaccine_type,
            total_doses: schedule.total_doses,
            dose_intervals: intervals,
            current_dose: patient.doses_received,
            first_dose_date: patient.first_dose_date
          });

          // Calculate from the FIRST dose date, not the latest
          let baseDate = new Date(patient.first_dose_date);

          // Sum up all intervals up to the current dose to get the correct next dose date
          let totalDaysFromFirstDose = 0;
          for (let i = 0; i < patient.doses_received; i++) {
            const intervalDays = typeof intervals[i] === 'number' ? intervals[i] : 0;
            totalDaysFromFirstDose += intervalDays;
            console.log(`  เข็มที่ ${i + 1} -> ${i + 2}: +${intervalDays} วัน (รวม: ${totalDaysFromFirstDose} วัน)`);
          }

          // Calculate next dose date from first dose + cumulative intervals
          const nextDoseDate = new Date(baseDate);
          nextDoseDate.setDate(nextDoseDate.getDate() + totalDaysFromFirstDose);

          const nextDoseNumber = patient.doses_received + 1;
          const nextDoseIntervalFromSchedule = intervals[patient.doses_received] || 0;

          console.log(`🎯 ${patient.patient_name}: คำนวณจาก vaccine_schedules`);
          console.log(`   - เข็มแรก: ${patient.first_dose_date}`);
          console.log(`   - รวมระยะห่าง: ${totalDaysFromFirstDose} วัน`);
          console.log(`   - ต้องการโดส: ${nextDoseNumber}/${schedule.total_doses}`);
          console.log(`   - นัดคำนวน: ${nextDoseDate.toISOString().split('T')[0]}`);
          console.log(`   - ช่วงห่างจาก vaccine_schedules: ${nextDoseIntervalFromSchedule} วัน`);

          return {
            id: `new-${patient.patient_id}-${patient.vaccine_type}`,
            patient_id: patient.patient_id,
            patient_name: patient.patient_name,
            vaccine_name: schedule.vaccine_name,
            vaccine_type: patient.vaccine_type,
            current_dose: patient.doses_received, // จำนวนโดสที่ฉีดแล้วจริง
            total_doses: schedule.total_doses,
            next_dose_due: nextDoseDate.toISOString().split('T')[0],
            last_dose_date: patient.latest_date, // วันที่ฉีดเข็มล่าสุดจริง
            first_dose_date: patient.first_dose_date,
            completion_status: 'needs_appointment',
            line_user_id: patient.line_user_id,
            vaccine_schedule_id: schedule.id,
            is_existing_appointment: false
          };
        } catch (error) {
          console.error('Error processing patient:', patient.patient_id, error);
          return null;
        }
      });

      const results = await Promise.all(nextAppointmentPromises);
      const validNewAppointments = results
        .filter(appt => appt !== null);
      
      // 3. Combine existing and new appointments
      const allAppointments = [...allNextAppointments, ...validNewAppointments]
        .sort((a, b) => new Date(a.next_dose_due).getTime() - new Date(b.next_dose_due).getTime());
      
      console.log('✅ ผลลัพธ์สุดท้าย:', allAppointments.length, 'รายการ');
      console.log('📅 นัดที่มีอยู่แล้ว:', allNextAppointments.length, 'รายการ');
      console.log('🆕 นัดใหม่ที่ต้องสร้าง:', validNewAppointments.length, 'รายการ');
      
      allAppointments.forEach(appt => {
        const status = appt.is_existing_appointment ? '(มีนัดแล้ว)' : '(ต้องสร้างนัด)';
        console.log(`- ${appt.patient_name}: โดส ${appt.current_dose + 1}/${appt.total_doses}, นัด: ${appt.next_dose_due}, เข็มล่าสุด: ${appt.last_dose_date || 'ยังไม่มี'} ${status}`);
      });
      
      setNextAppointments(allAppointments);
    } catch (error) {
      console.error('Error loading next appointments:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลนัดครั้งถัดไปได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const scheduleAppointment = async (patientTracking: NextAppointment) => {
    // ตรวจสอบซ้ำก่อนสร้างนัดว่ามีนัดแล้วหรือยัง
    try {
      const { data: existingAppointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id_number', patientTracking.patient_id)
        .eq('vaccine_type', patientTracking.vaccine_type)
        .in('status', ['scheduled', 'pending'])
        .gte('appointment_date', new Date().toISOString().split('T')[0]);

      if (existingAppointments && existingAppointments.length > 0) {
        toast({
          title: "มีนัดอยู่แล้ว",
          description: `${patientTracking.patient_name} มีนัดหมายสำหรับวัคซีนนี้แล้ว`,
          variant: "destructive",
        });
        // ลบออกจากรายการ
        setNextAppointments(prevAppointments => 
          prevAppointments.filter(appt => appt.id !== patientTracking.id)
        );
        return;
      }
    } catch (error) {
      console.error('Error checking existing appointments:', error);
    }

    setCreatingAppointment(patientTracking.id);
    try {
      const appointmentData = {
        patient_id_number: patientTracking.patient_id,
        patient_name: patientTracking.patient_name,
        vaccine_type: patientTracking.vaccine_type,
        appointment_date: patientTracking.next_dose_due,
        status: 'scheduled',
        line_user_id: patientTracking.line_user_id,
        notes: `นัดเข็มที่ ${patientTracking.current_dose + 1} จาก ${patientTracking.total_doses} เข็ม`
      };

      const { error } = await supabase
        .from('appointments')
        .insert([appointmentData]);

      if (error) throw error;

      // ลบรายชื่อออกจากรายการทันที เพื่อป้องกันการกดซ้ำ
      setNextAppointments(prevAppointments => 
        prevAppointments.filter(appt => appt.id !== patientTracking.id)
      );

      toast({
        title: "นัดหมายสำเร็จ",
        description: `สร้างนัดหมายสำหรับ ${patientTracking.patient_name} แล้ว`,
      });
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างนัดหมายได้",
        variant: "destructive",
      });
    } finally {
      setCreatingAppointment(null);
    }
  };

  const sendReminder = async (patientTracking: NextAppointment) => {
    if (!patientTracking.line_user_id) {
      toast({
        title: "ไม่สามารถส่งได้",
        description: "ไม่พบ LINE User ID ของผู้ป่วย",
        variant: "destructive",
      });
      return;
    }

    setSendingReminder(patientTracking.id);
    try {
      // ตรวจสอบ authentication ก่อนเรียก Edge Function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('Authentication error:', sessionError);
        toast({
          title: "ไม่สามารถส่งได้",
          description: "กรุณาเข้าสู่ระบบก่อนใช้งาน",
          variant: "destructive",
        });
        return;
      }

      // ตรวจสอบว่าผู้ใช้เป็น healthcare staff หรือไม่
      const { data: isStaff, error: roleError } = await supabase.rpc('is_healthcare_staff', {
        _user_id: session.user.id
      });

      if (roleError) {
        console.error('Role check error:', roleError);
      }

      if (!isStaff) {
        toast({
          title: "ไม่มีสิทธิ์เข้าถึง",
          description: "คุณไม่มีสิทธิ์ส่งข้อความแจ้งเตือน (ต้องการสิทธิ์ healthcare staff)",
          variant: "destructive",
        });
        return;
      }

      // เรียก Edge Function พร้อม authentication
      const { error } = await supabase.functions.invoke('send-line-message', {
        body: {
          userId: patientTracking.line_user_id,
          message: `🏥 แจ้งเตือนนัดฉีดวัคซีน\n\nคุณ ${patientTracking.patient_name}\nนัดฉีดเข็มที่ ${patientTracking.current_dose + 1} \nวัคซีน: ${patientTracking.vaccine_name}\nวันที่นัด: ${new Date(patientTracking.next_dose_due).toLocaleDateString('th-TH')}\n\nกรุณามาตามนัดตรงเวลา\n\n📍 โรงพยาบาลโฮม`
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      toast({
        title: "ส่งข้อความแล้ว",
        description: `ส่งข้อความแจ้งเตือนไปยัง ${patientTracking.patient_name} แล้ว`,
      });
    } catch (error: any) {
      console.error('Error sending reminder:', error);

      // แสดง error message ที่ละเอียดขึ้น
      let errorMessage = "ไม่สามารถส่งข้อความแจ้งเตือนได้";

      if (error?.message) {
        if (error.message.includes('LINE')) {
          errorMessage = "ไม่สามารถเชื่อมต่อ LINE API ได้ กรุณาตรวจสอบการตั้งค่า";
        } else if (error.message.includes('authentication') || error.message.includes('auth')) {
          errorMessage = "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";
        } else if (error.message.includes('Access denied') || error.message.includes('role')) {
          errorMessage = "ไม่มีสิทธิ์เข้าถึงฟังก์ชันนี้";
        } else {
          errorMessage = `เกิดข้อผิดพลาด: ${error.message}`;
        }
      }

      toast({
        title: "เกิดข้อผิดพลาด",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSendingReminder(null);
    }
  };

  useEffect(() => {
    loadNextAppointments();
    
    // Set up interval to refresh every 30 seconds
    const interval = setInterval(() => {
      loadNextAppointments();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const filteredAppointments = nextAppointments.filter(appt =>
    appt.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appt.vaccine_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appt.patient_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueBadge = (daysUntil: number) => {
    if (daysUntil < 0) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">เกินกำหนด {Math.abs(daysUntil)} วัน</Badge>;
    } else if (daysUntil === 0) {
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200">ครบกำหนดวันนี้</Badge>;
    } else if (daysUntil <= 7) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">อีก {daysUntil} วัน</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800 border-green-200">อีก {daysUntil} วัน</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CalendarPlus className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">นัดครั้งถัดไป</h1>
            <p className="text-sm text-muted-foreground">
              รายการผู้ป่วยที่ต้องฉีดเข็มถัดไป (อัปเดตล่าสุด: {new Date().toLocaleTimeString('th-TH')})
            </p>
          </div>
        </div>
        <Button onClick={loadNextAppointments} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              ค้นหานัดครั้งถัดไป
            </CardTitle>
            <Badge variant="secondary">
              ทั้งหมด {filteredAppointments.length} คน
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="ค้นหาด้วยชื่อผู้ป่วย, ประเภทวัคซีน, หรือ ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-4">
            {filteredAppointments.map((appointment) => {
              const daysUntil = getDaysUntilDue(appointment.next_dose_due);
              return (
                <div key={appointment.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{appointment.patient_name}</h3>
                        {getDueBadge(daysUntil)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-2">
                          <Syringe className="h-4 w-4" />
                          {appointment.vaccine_name}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          เข็มที่ {appointment.current_dose + 1} จาก {appointment.total_doses}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          ครบกำหนด: {new Date(appointment.next_dose_due).toLocaleDateString('th-TH')}
                        </div>
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          เข็มล่าสุด: {appointment.last_dose_date ? 
                            new Date(appointment.last_dose_date).toLocaleDateString('th-TH') : 
                            'ไม่พบข้อมูล'}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded flex justify-between">
                        <span>ID: {appointment.patient_id}</span>
                        <span className="text-blue-600">
                          {appointment.is_existing_appointment ? '✓ มีนัดแล้ว' : '⚠ ต้องสร้างนัด'}
                        </span>
                      </div>
                    </div>
                     <div className="flex gap-2 ml-4">
                       {!appointment.is_existing_appointment ? (
                         <Button
                           size="sm"
                           onClick={() => scheduleAppointment(appointment)}
                           disabled={creatingAppointment === appointment.id || creatingAppointment !== null}
                           className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           {creatingAppointment === appointment.id ? (
                             <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                           ) : (
                             <CalendarPlus className="h-4 w-4 mr-1" />
                           )}
                           {creatingAppointment === appointment.id ? 'กำลังสร้าง...' : 'สร้างนัด'}
                         </Button>
                       ) : (
                         <Badge className="bg-green-100 text-green-800 border-green-200">
                           มีนัดแล้ว
                         </Badge>
                       )}
                       {appointment.line_user_id && (
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => sendReminder(appointment)}
                           disabled={sendingReminder === appointment.id}
                           className="disabled:opacity-50"
                         >
                           {sendingReminder === appointment.id ? (
                             <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                           ) : (
                             <Send className="h-4 w-4 mr-1" />
                           )}
                           {sendingReminder === appointment.id ? 'กำลังส่ง...' : 'แจ้งเตือน'}
                         </Button>
                       )}
                     </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredAppointments.length === 0 && (
            <div className="text-center py-12">
              <CalendarPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ไม่มีนัดครั้งถัดไปในขณะนี้'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NextAppointments;