import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CalendarPlus, Search, Calendar, Syringe, RefreshCw, Send, Clock, AlertCircle, X, FileText } from 'lucide-react';
import FullDoseScheduleModal from './FullDoseScheduleModal';

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
  const [cancelingAppointment, setCancelingAppointment] = useState<string | null>(null);
  const [selectedPatientForSchedule, setSelectedPatientForSchedule] = useState<NextAppointment | null>(null);
  const [showScheduleView, setShowScheduleView] = useState(false);
  const { toast} = useToast();

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

      // กรองเฉพาะนัดที่ยังไม่ถูกยกเลิก (รวมทั้งนัดที่เกินกำหนด)
      const today = new Date().toISOString().split('T')[0]; // เช่น "2024-12-15"
      const scheduledAppointments = appointmentData?.filter(a =>
        ['scheduled', 'pending'].includes(a.status)
        // ไม่กรองตามวันที่ - เพื่อแสดงนัดที่เกินกำหนดด้วย
      ) || [];

      console.log('✅ การฉีดที่เสร็จสิ้น:', completedAppointments.length, 'รายการ');
      console.log('📅 นัดที่มีอยู่แล้ว (scheduled/pending):', scheduledAppointments.length, 'รายการ');
      console.log('📆 วันนี้:', today);
      scheduledAppointments.forEach(appt => {
        console.log(`   - ${appt.patient_name}: ${appt.vaccine_type} วันที่ ${appt.appointment_date} (${appt.status})`);
      });

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
      // 1. First add existing scheduled appointments (รวมทั้งนัดที่เกินกำหนด)
      for (const scheduledAppt of scheduledAppointments) {
        // Double check that appointment is still valid (ไม่กรองตามวันที่เพื่อแสดงนัดที่เกินกำหนด)
        if (['scheduled', 'pending'].includes(scheduledAppt.status)) {
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
          console.log(`🔍 ตรวจสอบนัดสำหรับ ${patient.patient_name} (${patient.patient_id}), วัคซีน: ${patient.vaccine_type}`);
          
          const existingFutureAppointment = scheduledAppointments.find(appt => {
            const apptPatientKey = appt.patient_id_number || appt.line_user_id;
            const matchesPatient = apptPatientKey === patient.patient_id;
            const matchesVaccine = appt.vaccine_type.toLowerCase() === patient.vaccine_type.toLowerCase();
            const isActive = ['scheduled', 'pending'].includes(appt.status);
            // ไม่กรอง isFuture - เพื่อให้นัดที่เกินกำหนดแสดงด้วย

            console.log(`   🔎 เปรียบเทียบกับนัด: ${appt.patient_name} (${apptPatientKey})`, {
              matchesPatient: `${matchesPatient} (${apptPatientKey} === ${patient.patient_id})`,
              matchesVaccine: `${matchesVaccine} (${appt.vaccine_type} === ${patient.vaccine_type})`,
              appointment_date: appt.appointment_date,
              isActive: `${isActive} (${appt.status})`,
              result: matchesPatient && matchesVaccine && isActive
            });

            return matchesPatient && matchesVaccine && isActive;
          });

          if (existingFutureAppointment) {
            console.log(`✅ ผู้ป่วย ${patient.patient_name} มีนัด ${patient.vaccine_type} แล้วในวันที่ ${existingFutureAppointment.appointment_date} (${existingFutureAppointment.status}) - ข้าม`);
            return null; // Already has appointment (will be shown from existing appointments above)
          }

          // ตรวจสอบว่ามีนัดที่ถูกยกเลิกและเกินกำหนดหรือไม่ (ไม่ต้องแสดงซ้ำ)
          const cancelledOverdueAppointment = appointmentData?.find(appt => {
            const apptPatientKey = appt.patient_id_number || appt.line_user_id;
            const matchesPatient = apptPatientKey === patient.patient_id;
            const matchesVaccine = appt.vaccine_type.toLowerCase() === patient.vaccine_type.toLowerCase();
            const isCancelled = appt.status === 'cancelled';
            const isOverdue = appt.appointment_date < today;
            return matchesPatient && matchesVaccine && isCancelled && isOverdue;
          });

          if (cancelledOverdueAppointment) {
            console.log(`🚫 ผู้ป่วย ${patient.patient_name} มีนัดเกินกำหนดที่ถูกยกเลิกแล้ว (${cancelledOverdueAppointment.appointment_date}) - ไม่แสดงอีก`);
            return null; // Don't show again if cancelled overdue appointment exists
          }

          console.log(`🆕 ผู้ป่วย ${patient.patient_name} ยังไม่มีนัด ${patient.vaccine_type} - ต้องสร้างนัด`);

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
          const firstDoseDate = new Date(patient.first_dose_date);

          // Get the interval for the NEXT dose
          // ✅ FIX: dose_intervals is CUMULATIVE from first dose
          // intervals[0] = days from first dose to dose 2
          // intervals[1] = days from first dose to dose 3
          // So for next dose after dose N, we use intervals[N-1]
          const nextDoseIntervalDays = patient.doses_received === 0
            ? 0
            : (typeof intervals[patient.doses_received - 1] === 'number'
                ? intervals[patient.doses_received - 1]
                : 0);

          console.log(`  เข็มที่ ${patient.doses_received + 1}: ระยะห่าง ${nextDoseIntervalDays} วัน จากเข็มแรก`);

          // Calculate next dose date from first dose + interval for this specific dose
          const nextDoseDate = new Date(firstDoseDate.getTime());
          nextDoseDate.setDate(firstDoseDate.getDate() + nextDoseIntervalDays);

          const nextDoseNumber = patient.doses_received + 1;
          const nextDoseIntervalFromSchedule = intervals[patient.doses_received] || 0;

          console.log(`🎯 ${patient.patient_name}: คำนวณจาก vaccine_schedules`);
          console.log(`   - เข็มแรก: ${patient.first_dose_date}`);
          console.log(`   - ระยะห่างของโดสนี้: ${nextDoseIntervalDays} วัน`);
          console.log(`   - ต้องการโดส: ${nextDoseNumber}/${schedule.total_doses}`);
          console.log(`   - นัดคำนวน: ${nextDoseDate.toISOString().split('T')[0]}`);

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
    // ป้องกันการกดซ้ำ - ถ้ากำลังสร้างนัดอยู่ ให้ return ทันที
    if (creatingAppointment !== null) {
      console.log('⚠️ กำลังสร้างนัดอยู่แล้ว - ป้องกันการกดซ้ำ');
      return;
    }

    console.log('🔵 เริ่มสร้างนัดสำหรับ:', patientTracking.patient_name, patientTracking.vaccine_type);
    setCreatingAppointment(patientTracking.id);

    try {
      // ตรวจสอบซ้ำก่อนสร้างนัดว่ามีนัดแล้วหรือยัง (รวมนัดที่เกินกำหนด)
      console.log('🔍 ตรวจสอบนัดที่มีอยู่แล้ว...');

      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id_number', patientTracking.patient_id)
        .eq('vaccine_type', patientTracking.vaccine_type)
        .in('status', ['scheduled', 'pending']);
        // ไม่กรองตามวันที่ - เพราะถ้ามีนัดแล้ว (แม้เกินกำหนด) ก็ไม่ควรสร้างซ้ำ

      if (checkError) {
        console.error('❌ Error checking existing appointments:', checkError);
        throw checkError;
      }

      console.log('📋 นัดที่มีอยู่:', existingAppointments?.length || 0, 'รายการ');
      
      if (existingAppointments && existingAppointments.length > 0) {
        console.log('⚠️ พบนัดที่มีอยู่แล้ว:', existingAppointments);
        toast({
          title: "มีนัดอยู่แล้ว",
          description: `${patientTracking.patient_name} มีนัดหมายสำหรับวัคซีนนี้แล้ว`,
          variant: "destructive",
        });
        // รีเฟรชข้อมูลเพื่อแสดงสถานะที่ถูกต้อง
        console.log('🔄 รีเฟรชข้อมูล...');
        await loadNextAppointments();
        return;
      }

      // สร้างนัดหมายใหม่
      const appointmentData = {
        patient_id_number: patientTracking.patient_id,
        patient_name: patientTracking.patient_name,
        vaccine_type: patientTracking.vaccine_type,
        appointment_date: patientTracking.next_dose_due,
        status: 'scheduled',
        line_user_id: patientTracking.line_user_id,
        notes: `นัดเข็มที่ ${patientTracking.current_dose + 1} จาก ${patientTracking.total_doses} เข็ม`
      };

      console.log('💾 กำลังบันทึกนัดใหม่:', appointmentData);

      const { data: insertedData, error: insertError } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select();

      if (insertError) {
        console.error('❌ Error inserting appointment:', insertError);
        throw insertError;
      }

      console.log('✅ สร้างนัดสำเร็จ:', insertedData);

      toast({
        title: "นัดหมายสำเร็จ",
        description: `สร้างนัดหมายสำหรับ ${patientTracking.patient_name} แล้ว`,
      });

      // รอสักครู่เพื่อให้ฐานข้อมูลอัพเดท
      console.log('⏳ รอ 500ms เพื่อให้ฐานข้อมูลอัพเดท...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // รีเฟรชข้อมูลทั้งหมดจากฐานข้อมูลเพื่อแสดงสถานะที่ถูกต้อง
      console.log('🔄 รีเฟรชข้อมูลหลังสร้างนัด...');
      await loadNextAppointments();
      console.log('✅ รีเฟรชเสร็จสิ้น');
    } catch (error) {
      console.error('❌ Error scheduling appointment:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างนัดหมายได้",
        variant: "destructive",
      });
    } finally {
      setCreatingAppointment(null);
      console.log('🔵 เสร็จสิ้นกระบวนการสร้างนัด');
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


  const cancelAppointment = async (appointment: NextAppointment) => {
    if (!appointment.is_existing_appointment) {
      toast({
        title: "ไม่สามารถยกเลิกได้",
        description: "ไม่สามารถยกเลิกนัดที่ยังไม่ได้สร้าง",
        variant: "destructive",
      });
      return;
    }

    setCancelingAppointment(appointment.id);

    try {
      console.log('🔴 เริ่มยกเลิกนัดสำหรับ:', appointment.patient_name);

      // Extract appointment ID from scheduled ID (format: scheduled-{id})
      const appointmentId = appointment.id.replace('scheduled-', '');

      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;

      console.log('✅ ยกเลิกนัดสำเร็จ');

      toast({
        title: "ยกเลิกนัดสำเร็จ",
        description: `ยกเลิกนัดของ ${appointment.patient_name} แล้ว`,
      });

      // รีเฟรชข้อมูล
      await loadNextAppointments();
    } catch (error) {
      console.error('❌ Error canceling appointment:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิกนัดได้",
        variant: "destructive",
      });
    } finally {
      setCancelingAppointment(null);
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

  // Helper function - ต้องประกาศก่อนใช้งาน
  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredAppointments = nextAppointments.filter(appt =>
    appt.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appt.vaccine_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appt.patient_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // แยกนัดเกินกำหนดและนัดปกติ
  const overdueAppointments = filteredAppointments.filter(appt => {
    const daysUntil = getDaysUntilDue(appt.next_dose_due);
    return daysUntil < 0 && appt.is_existing_appointment;
  });

  const upcomingAppointments = filteredAppointments.filter(appt => {
    const daysUntil = getDaysUntilDue(appt.next_dose_due);
    return daysUntil >= 0 || !appt.is_existing_appointment;
  });

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
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-xl border border-primary/20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary rounded-xl shadow-lg">
            <CalendarPlus className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              นัดครั้งถัดไป
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              อัปเดตล่าสุด: {new Date().toLocaleTimeString('th-TH')}
            </p>
          </div>
        </div>
        <Button onClick={loadNextAppointments} disabled={loading} variant="outline" size="lg" className="shadow-sm">
          <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="🔍 ค้นหาด้วยชื่อผู้ป่วย, ประเภทวัคซีน, หรือ ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-base border-2 focus:border-primary transition-all"
            />
          </div>
        </CardContent>
      </Card>

      {/* Overdue Appointments Section */}
      {overdueAppointments.length > 0 && (
        <Card className="border-2 border-red-200 bg-red-50/50 shadow-lg">
          <CardHeader className="bg-red-100/80 border-b-2 border-red-200">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-red-800">
                <div className="p-2 bg-red-500 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="text-xl">นัดเกินกำหนด</span>
                  <p className="text-sm font-normal text-red-600 mt-1">ต้องดำเนินการด่วน!</p>
                </div>
              </CardTitle>
              <Badge variant="destructive" className="text-lg px-4 py-2 shadow-sm">
                {overdueAppointments.length} ราย
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {overdueAppointments.map((appointment) => {
                const daysUntil = getDaysUntilDue(appointment.next_dose_due);
                return (
                  <div key={appointment.id} className="p-5 bg-white border-2 border-red-200 rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-bold text-xl text-red-900">{appointment.patient_name}</h3>
                          <Badge className="bg-red-500 text-white border-0 text-sm px-3 py-1 shadow-sm">
                            เกินกำหนด {Math.abs(daysUntil)} วัน
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-3">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Syringe className="h-4 w-4 text-red-500" />
                            <span className="font-medium">{appointment.vaccine_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <Calendar className="h-4 w-4 text-red-500" />
                            <span>เข็มที่ {appointment.current_dose + 1}/{appointment.total_doses}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <Clock className="h-4 w-4 text-red-500" />
                            <span>นัด: {new Date(appointment.next_dose_due).toLocaleDateString('th-TH')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelAppointment(appointment)}
                          disabled={cancelingAppointment === appointment.id}
                          className="shadow-md hover:shadow-lg transition-all"
                        >
                          {cancelingAppointment === appointment.id ? (
                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <X className="h-4 w-4 mr-1" />
                          )}
                          {cancelingAppointment === appointment.id ? 'กำลังยกเลิก...' : 'ยกเลิกนัด'}
                        </Button>
                        {appointment.line_user_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendReminder(appointment)}
                            disabled={sendingReminder === appointment.id}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            {sendingReminder === appointment.id ? (
                              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4 mr-1" />
                            )}
                            แจ้งเตือน
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Appointments Section */}
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-blue-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span className="text-xl">นัดที่กำลังจะถึง & ต้องสร้างนัด</span>
                <p className="text-sm font-normal text-muted-foreground mt-1">รายการนัดทั้งหมด</p>
              </div>
            </CardTitle>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {upcomingAppointments.length} ราย
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {upcomingAppointments.map((appointment) => {
              const daysUntil = getDaysUntilDue(appointment.next_dose_due);
              return (
                <div key={appointment.id} className="p-5 bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-[1.01] hover:border-primary/50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-bold text-lg">{appointment.patient_name}</h3>
                        {getDueBadge(daysUntil)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-3">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Syringe className="h-4 w-4 text-primary" />
                          <span className="font-medium">{appointment.vaccine_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>เข็มที่ {appointment.current_dose + 1}/{appointment.total_doses}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock className="h-4 w-4 text-primary" />
                          <span>นัด: {new Date(appointment.next_dose_due).toLocaleDateString('th-TH')}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 bg-gray-100/80 p-2.5 rounded-lg flex justify-center items-center">
                        {appointment.is_existing_appointment ? (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            มีนัดแล้ว
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-orange-600 font-medium">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            ต้องสร้างนัด
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {!appointment.is_existing_appointment ? (
                        <Button
                          size="sm"
                          onClick={() => scheduleAppointment(appointment)}
                          disabled={creatingAppointment === appointment.id || creatingAppointment !== null}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all"
                        >
                          {creatingAppointment === appointment.id ? (
                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <CalendarPlus className="h-4 w-4 mr-1" />
                          )}
                          {creatingAppointment === appointment.id ? 'กำลังสร้าง...' : 'สร้างนัด'}
                        </Button>
                      ) : (
                        <Badge className="bg-green-500 text-white border-0 px-4 py-2 shadow-sm">
                          ✓ มีนัดแล้ว
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPatientForSchedule(appointment);
                          setShowScheduleView(true);
                        }}
                        className="border-2 hover:bg-purple-50 border-purple-300 text-purple-700 shadow-sm"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        ดูตารางนัดครบทุกโดส
                      </Button>
                      {appointment.line_user_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendReminder(appointment)}
                          disabled={sendingReminder === appointment.id}
                          className="border-2 hover:bg-primary/5 shadow-sm"
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

          {upcomingAppointments.length === 0 && (
            <div className="text-center py-12">
              <CalendarPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ไม่มีนัดครั้งถัดไปในขณะนี้'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Dose Schedule Modal */}
      <FullDoseScheduleModal
        appointment={selectedPatientForSchedule}
        isOpen={showScheduleView}
        onClose={() => {
          setShowScheduleView(false);
          setSelectedPatientForSchedule(null);
        }}
      />
    </div>
  );
};

export default NextAppointments;