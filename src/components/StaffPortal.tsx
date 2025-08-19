import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Calendar, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Clock,
  Search,
  Download,
  Send,
  RefreshCw,
  Plus,
  Trash2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  lineId: string;
}

interface PatientRegistration {
  id: string;
  full_name: string;
  phone: string;
  hospital: string;
  registration_id: string;
  source: string;
  status: string;
  notes?: string;
  line_user_id?: string;
  created_at: string;
  updated_at: string;
}

interface Appointment {
  id: string;
  appointment_id: string;
  patient_name: string;
  patient_phone?: string;
  patient_id_number?: string;
  vaccine_type: string;
  appointment_date: string;
  appointment_time?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  scheduled_by?: string;
  notes?: string;
  line_user_id?: string;
  created_at: string;
  updated_at: string;
}

interface VaccineOption {
  type: string;
  name: string;
}

const StaffPortal = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [registrations, setRegistrations] = useState<PatientRegistration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Add states for same-day vaccination form
  const [showSameDayForm, setShowSameDayForm] = useState(false);
  const [sameDayForm, setSameDayForm] = useState({
    name: '',
    phone: '',
    idNumber: '',
    vaccineType: 'flu',
    notes: ''
  });
  const [selectedRegistration, setSelectedRegistration] = useState<PatientRegistration | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [selectedVaccines, setSelectedVaccines] = useState<VaccineOption[]>([{ type: 'flu', name: 'วัคซีนไข้หวัดใหญ่' }]);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // Add functions for vaccine management
  const vaccineOptions = [
    { type: 'flu', name: 'วัคซีนไข้หวัดใหญ่' },
    { type: 'hep_b', name: 'วัคซีนไวรัสตับอักเสบบี' },
    { type: 'hep_a', name: 'วัคซีนไวรัสตับอักเสบเอ' },
    { type: 'hpv', name: 'วัคซีน HPV' },
    { type: 'tetanus', name: 'วัคซีนบาดทะยัก' },
    { type: 'rabies', name: 'วัคซีนพิษสุนัขบ้า' },
    { type: 'pneumonia', name: 'วัคซีนปอดบวม' },
    { type: 'covid19', name: 'วัคซีน COVID-19' }
  ];

  const addVaccine = () => {
    if (selectedVaccines.length < 3) {
      setSelectedVaccines([...selectedVaccines, { type: 'flu', name: 'วัคซีนไข้หวัดใหญ่' }]);
    }
  };

  const removeVaccine = (index: number) => {
    if (selectedVaccines.length > 1) {
      setSelectedVaccines(selectedVaccines.filter((_, i) => i !== index));
    }
  };

  const updateVaccine = (index: number, type: string) => {
    const vaccine = vaccineOptions.find(v => v.type === type);
    if (vaccine) {
      const newVaccines = [...selectedVaccines];
      newVaccines[index] = vaccine;
      setSelectedVaccines(newVaccines);
    }
  };

  // Load appointments from Supabase
  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setAppointments(data as Appointment[]);
        toast({
          title: "โหลดข้อมูลสำเร็จ",
          description: `โหลดข้อมูลการนัดหมาย ${data.length} รายการ`,
        });
      }
    } catch (error: any) {
      toast({
        title: "ข้อผิดพลาด",
        description: error.message || "ไม่สามารถโหลดข้อมูลการนัดหมายได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load patients from Google Sheets
  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-integration', {
        body: { action: 'readPatients' }
      });

      if (error) throw error;

      if (data.patients) {
        setPatients(data.patients);
        toast({
          title: "โหลดข้อมูลสำเร็จ",
          description: `โหลดข้อมูลคนไข้ ${data.patients.length} คน`,
        });
      }
    } catch (error: any) {
      toast({
        title: "ข้อผิดพลาด",
        description: error.message || "ไม่สามารถโหลดข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load patient registrations from Supabase
  const loadRegistrations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setRegistrations(data as PatientRegistration[]);
        toast({
          title: "โหลดข้อมูลสำเร็จ",
          description: `โหลดข้อมูลการลงทะเบียน ${data.length} รายการ`,
        });
      }
    } catch (error: any) {
      toast({
        title: "ข้อผิดพลาด",
        description: error.message || "ไม่สามารถโหลดข้อมูลการลงทะเบียนได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadAppointments();
    loadPatients();
    loadRegistrations();
  }, []);

  const updateAppointmentStatus = async (id: string, newStatus: Appointment['status']) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setAppointments(prev => 
        prev.map(apt => apt.id === id ? { ...apt, status: newStatus } : apt)
      );

      toast({
        title: "อัพเดทสถานะสำเร็จ",
        description: `เปลี่ยนสถานะเป็น ${getStatusText(newStatus)} แล้ว`,
      });
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถอัพเดทสถานะได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendNotification = async (appointment: Appointment, message: string) => {
    try {
      console.log('=== LINE Notification Debug ===');
      console.log('Appointment data:', {
        id: appointment.id,
        line_user_id: appointment.line_user_id,
        patient_name: appointment.patient_name,
        patient_phone: appointment.patient_phone
      });
      console.log('Message to send:', message);

      // ส่งผ่าน LINE Bot API ถ้ามี LINE User ID
      if (appointment.line_user_id) {
        console.log('Attempting to send LINE message...');
        
        const { data: lineResult, error: lineError } = await supabase.functions.invoke('send-line-message', {
          body: {
            userId: appointment.line_user_id,
            message: message,
            type: 'template',
            templateData: {
              appointmentId: appointment.appointment_id,
              patientName: appointment.patient_name,
              vaccineType: appointment.vaccine_type,
              appointmentDate: appointment.appointment_date
            }
          }
        });

        console.log('LINE API Response:', { data: lineResult, error: lineError });

        if (lineError) {
          console.error('LINE API Error Details:', {
            error: lineError,
            status: lineError.status,
            message: lineError.message,
            details: lineError.details || 'No additional details'
          });
          
          throw new Error(`LINE API Error: ${lineError.message || 'Unknown error'}`);
        }

        console.log('LINE message sent successfully:', lineResult);
      } else {
        console.log('No LINE User ID found, skipping LINE message');
      }

      // บันทึก notification record ในฐานข้อมูล
      console.log('Creating notification record...');
      const { error: dbError } = await supabase
        .from('appointment_notifications')
        .insert({
          appointment_id: appointment.id,
          notification_type: 'reminder',
          sent_to: appointment.patient_phone || '',
          line_user_id: appointment.line_user_id,
          message_content: message,
          status: appointment.line_user_id ? 'sent' : 'pending'
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      console.log('Notification record created successfully');

      toast({
        title: "ส่งแจ้งเตือนสำเร็จ",
        description: appointment.line_user_id 
          ? `ส่งข้อความ LINE ไปยัง ${appointment.patient_name} แล้ว`
          : `บันทึกข้อความสำหรับ ${appointment.patient_name} แล้ว (ไม่มี LINE ID)`,
      });
    } catch (error: any) {
      console.error('=== Notification Error ===');
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        appointment_id: appointment.id,
        line_user_id: appointment.line_user_id
      });
      
      toast({
        title: "ส่งแจ้งเตือนไม่สำเร็จ",
        description: `เกิดข้อผิดพลาด: ${error.message}. กรุณาตรวจสอบ Console สำหรับรายละเอียด`,
        variant: "destructive",
      });
    }
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      scheduled: 'รอการยืนยัน',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
      no_show: 'ไม่มาตามนัด'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      scheduled: 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border-2 border-amber-200 font-semibold shadow-sm',
      completed: 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border-2 border-emerald-200 font-semibold shadow-sm',
      cancelled: 'bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 border-2 border-rose-200 font-semibold shadow-sm',
      no_show: 'bg-gradient-to-r from-slate-50 to-gray-50 text-slate-600 border-2 border-slate-200 font-semibold shadow-sm'
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gradient-to-r from-slate-50 to-gray-50 text-slate-600 border-2 border-slate-200 font-semibold shadow-sm';
  };

  const getStatusIcon = (status: string) => {
    const iconMap = {
      scheduled: Clock,
      completed: CheckCircle,
      cancelled: XCircle,
      no_show: Calendar
    };
    return iconMap[status as keyof typeof iconMap] || Clock;
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = apt.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apt.patient_phone?.includes(searchTerm) ||
                         apt.appointment_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || apt.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.phone.includes(searchTerm) ||
                         patient.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredRegistrations = registrations.filter(registration => {
    const matchesSearch = registration.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         registration.phone.includes(searchTerm) ||
                         registration.registration_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    total: appointments.length,
    scheduled: appointments.filter(apt => apt.status === 'scheduled').length,
    completed: appointments.filter(apt => apt.status === 'completed').length,
    cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
  };

  const scheduleVaccine = async (patient: Patient, vaccineType: string) => {
    setIsLoading(true);
    try {
      const appointmentId = `HOM-${Date.now().toString().slice(-6)}`;
      const appointmentDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          appointment_id: appointmentId,
          patient_name: patient.name,
          patient_phone: patient.phone,
          patient_id_number: patient.id,
          vaccine_type: vaccineType,
          appointment_date: appointmentDate,
          appointment_time: '09:00',
          status: 'scheduled',
          scheduled_by: 'staff',
          notes: `นัดหมายโดย: เจ้าหน้าที่`
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Add to local state
        setAppointments(prev => [data as Appointment, ...prev]);

        toast({
          title: "สร้างนัดหมายสำเร็จ",
          description: `นัดหมายฉีดวัคซีน ${vaccineType} สำหรับ ${patient.name} เรียบร้อยแล้ว (ID: ${appointmentId})`,
        });
      }
    } catch (error: any) {
      console.error('Failed to create appointment:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถสร้างนัดหมายได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleVaccineFromRegistration = async (registration: PatientRegistration & { line_user_id?: string }, vaccines: VaccineOption[], isToday: boolean = false, customDate?: string) => {
    setIsLoading(true);
    try {
      const appointmentDate = isToday ? 
        new Date().toISOString().split('T')[0] : 
        (customDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      
      const appointmentStatus = isToday ? 'completed' : 'scheduled';
      const createdAppointments = [];

      // Create appointments for each selected vaccine
      for (const vaccine of vaccines) {
        const appointmentId = `HOM-${Date.now().toString().slice(-6)}-${vaccine.type}`;
        
        const { data, error } = await supabase
          .from('appointments')
          .insert({
            appointment_id: appointmentId,
            patient_name: registration.full_name,
            patient_phone: registration.phone,
            patient_id_number: registration.registration_id,
            vaccine_type: vaccine.type,
            appointment_date: appointmentDate,
            appointment_time: isToday ? new Date().toTimeString().slice(0, 5) : '09:00',
            status: appointmentStatus,
            scheduled_by: 'staff',
            line_user_id: registration.line_user_id,
            notes: isToday ? 
              `ฉีดวัคซีนวันนี้: ${registration.registration_id}` : 
              `นัดหมายจากการลงทะเบียน: ${registration.registration_id}`
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          createdAppointments.push(data);
        }
      }

      // Add to local state
      setAppointments(prev => [...createdAppointments as Appointment[], ...prev]);

      // If vaccinated today, also create vaccine log entries
      if (isToday) {
        for (const [index, appointment] of createdAppointments.entries()) {
          await supabase
            .from('vaccine_logs')
            .insert({
              patient_name: registration.full_name,
              vaccine_type: vaccines[index].type,
              administered_date: appointmentDate,
              dose_number: 1,
              appointment_id: appointment.id,
              administered_by: 'เจ้าหน้าที่',
              notes: `ฉีดวัคซีนวันเดียวกันกับการลงทะเบียน`
            });
        }
      }

        // Update registration status
        await supabase
          .from('patient_registrations')
          .update({ status: isToday ? 'completed' : 'scheduled' })
          .eq('id', registration.id);

        // Update local registration state
        setRegistrations(prev => 
          prev.map(reg => reg.id === registration.id ? { 
            ...reg, 
            status: isToday ? 'completed' : 'scheduled' 
          } : reg)
        );

        // Send LINE notification if line_user_id exists
        if (registration.line_user_id && createdAppointments.length > 0) {
          const vaccineNames = vaccines.map(v => v.name).join(', ');
          const message = isToday ? 
            `การฉีดวัคซีนเสร็จสิ้น` :
            `การนัดหมายฉีดวัคซีน`;
          
          try {
            await sendNotification(createdAppointments[0] as Appointment, message);
          } catch (lineError) {
            console.error('LINE notification failed:', lineError);
            toast({
              title: "แจ้งเตือน",
              description: `${isToday ? 'ฉีด' : 'นัด'}วัคซีนสำเร็จ แต่ไม่สามารถส่งข้อความ LINE ได้`,
              variant: "default",
            });
          }
        }

        const vaccineList = vaccines.map(v => v.name).join(', ');
        toast({
          title: isToday ? "บันทึกการฉีดวัคซีนสำเร็จ" : "สร้างนัดหมายสำเร็จ",
          description: isToday ?
            `บันทึกการฉีดวัคซีน ${vaccineList} สำหรับ ${registration.full_name} เรียบร้อยแล้ว` :
            `นัดหมายฉีดวัคซีน ${vaccineList} สำหรับ ${registration.full_name} เรียบร้อยแล้ว (วันที่: ${appointmentDate})`,
        });
    } catch (error: any) {
      console.error('Failed to create appointment:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถดำเนินการได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createSameDayVaccination = async (patientData: { name: string, phone: string, idNumber: string, vaccineType: string, notes?: string }) => {
    setIsLoading(true);
    try {
      const appointmentId = `HOM-${Date.now().toString().slice(-6)}`;
      const registrationId = `REG-${Date.now().toString().slice(-6)}`;
      const today = new Date().toISOString().split('T')[0];
      const currentTime = new Date().toTimeString().slice(0, 5);

      // Create registration record first
      const { data: regData, error: regError } = await supabase
        .from('patient_registrations')
        .insert({
          registration_id: registrationId,
          full_name: patientData.name,
          phone: patientData.phone,
          source: 'walk_in',
          status: 'completed',
          notes: patientData.notes || 'Walk-in วันนี้'
        })
        .select()
        .single();

      if (regError) throw regError;

      // Create completed appointment
      const { data: aptData, error: aptError } = await supabase
        .from('appointments')
        .insert({
          appointment_id: appointmentId,
          patient_name: patientData.name,
          patient_phone: patientData.phone,
          patient_id_number: patientData.idNumber,
          vaccine_type: patientData.vaccineType,
          appointment_date: today,
          appointment_time: currentTime,
          status: 'completed',
          scheduled_by: 'staff',
          notes: `Walk-in ฉีดวันนี้: ${registrationId}`
        })
        .select()
        .single();

      if (aptError) throw aptError;

      // Create vaccine log
      await supabase
        .from('vaccine_logs')
        .insert({
          patient_name: patientData.name,
          vaccine_type: patientData.vaccineType,
          administered_date: today,
          dose_number: 1,
          appointment_id: aptData.id,
          administered_by: 'เจ้าหน้าที่',
          notes: patientData.notes || 'Walk-in วันนี้'
        });

      // Update local states
      setRegistrations(prev => [regData as PatientRegistration, ...prev]);
      setAppointments(prev => [aptData as Appointment, ...prev]);

      toast({
        title: "บันทึกการฉีดวัคซีนสำเร็จ",
        description: `บันทึกการฉีดวัคซีน ${patientData.vaccineType} สำหรับ ${patientData.name} เรียบร้อยแล้ว`,
      });
    } catch (error: any) {
      console.error('Failed to create same day vaccination:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = () => {
    const csv = [
      'ID,ชื่อผู้ป่วย,เบอร์โทร,วัคซีน,วันที่,เวลา,สถานะ,วันที่สร้าง',
      ...filteredAppointments.map(apt => 
        `${apt.appointment_id},${apt.patient_name},${apt.patient_phone},${apt.vaccine_type},${apt.appointment_date},${apt.appointment_time},${getStatusText(apt.status)},${apt.created_at.split('T')[0]}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `appointments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 md:space-y-10">
      {/* Mobile-optimized Header */}
      <div className="bg-gradient-card rounded-xl md:rounded-3xl p-4 md:p-8 shadow-md border border-border/50">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div className="space-y-2 md:space-y-3">
            <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tight">
              ระบบจัดการเจ้าหน้าที่
            </h1>
            <h2 className="text-lg md:text-2xl text-primary font-bold">โรงพยาบาลโฮม</h2>
            <p className="text-sm md:text-lg text-muted-foreground font-medium">จัดการการนัดหมายและการฉีดวัคซีนอย่างมีประสิทธิภาพ</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
            <Button 
              onClick={loadAppointments} 
              variant="outline" 
              disabled={isLoading}
              className="h-10 md:h-12 px-3 md:px-6 text-sm md:text-base font-semibold border-2 border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-300"
            >
              <RefreshCw className={`h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">โหลดนัดหมาย</span>
              <span className="sm:hidden">นัดหมาย</span>
            </Button>
            <Button 
              onClick={loadPatients} 
              variant="outline" 
              disabled={isLoading}
              className="h-10 md:h-12 px-3 md:px-6 text-sm md:text-base font-semibold border-2 border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-300"
            >
              <RefreshCw className={`h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">โหลดคนไข้</span>
              <span className="sm:hidden">คนไข้</span>
            </Button>
            <Button 
              onClick={loadRegistrations} 
              variant="outline" 
              disabled={isLoading}
              className="h-10 md:h-12 px-3 md:px-6 text-sm md:text-base font-semibold border-2 border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-300"
            >
              <RefreshCw className={`h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">ลงทะเบียน</span>
              <span className="sm:hidden">ลงทะเบียน</span>
            </Button>
            <Button 
              onClick={exportData} 
              className="h-10 md:h-12 px-3 md:px-6 text-sm md:text-base font-bold bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <Download className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
              <span className="hidden sm:inline">ส่งออกข้อมูล</span>
              <span className="sm:hidden">ส่งออก</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile-optimized Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <Card className="bg-white border border-border shadow-sm hover:shadow-md transition-all duration-300 hover:border-medical-info">
            <CardContent className="p-3 md:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-2 lg:space-y-0">
                <div className="p-2 md:p-3 bg-gradient-to-br from-medical-info to-medical-info/80 rounded-lg md:rounded-xl shadow-sm self-start lg:self-auto">
                  <Users className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm lg:text-base font-bold text-muted-foreground mb-1">ทั้งหมด</p>
                  <p className="text-xl md:text-2xl lg:text-4xl font-black text-foreground truncate">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-border shadow-sm hover:shadow-md transition-all duration-300 hover:border-status-scheduled">
            <CardContent className="p-3 md:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-2 lg:space-y-0">
                <div className="p-2 md:p-3 bg-gradient-to-br from-status-scheduled to-status-scheduled/80 rounded-lg md:rounded-xl shadow-sm self-start lg:self-auto">
                  <Clock className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm lg:text-base font-bold text-muted-foreground mb-1">รอยืนยัน</p>
                  <p className="text-xl md:text-2xl lg:text-4xl font-black text-foreground truncate">{stats.scheduled}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-border shadow-sm hover:shadow-md transition-all duration-300 hover:border-status-completed">
            <CardContent className="p-3 md:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-2 lg:space-y-0">
                <div className="p-2 md:p-3 bg-gradient-to-br from-status-completed to-status-completed/80 rounded-lg md:rounded-xl shadow-sm self-start lg:self-auto">
                  <CheckCircle className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm lg:text-base font-bold text-muted-foreground mb-1">เสร็จสิ้น</p>
                  <p className="text-xl md:text-2xl lg:text-4xl font-black text-foreground truncate">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-border shadow-sm hover:shadow-md transition-all duration-300 hover:border-status-cancelled">
            <CardContent className="p-3 md:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-2 lg:space-y-0">
                <div className="p-2 md:p-3 bg-gradient-to-br from-status-cancelled to-status-cancelled/80 rounded-lg md:rounded-xl shadow-sm self-start lg:self-auto">
                  <XCircle className="h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm lg:text-base font-bold text-muted-foreground mb-1">ยกเลิก</p>
                  <p className="text-xl md:text-2xl lg:text-4xl font-black text-foreground truncate">{stats.cancelled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile-optimized Search and Filter Section */}
        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-primary" />
                  <Input
                    placeholder="ค้นหาด้วยชื่อ, เบอร์โทร, หรือ ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 md:pl-12 py-2 md:py-3 text-sm md:text-base font-medium rounded-lg md:rounded-xl border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background transition-all duration-300"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-fit">
                <Label htmlFor="filter" className="text-sm md:text-base font-bold text-foreground whitespace-nowrap">
                  สถานะ:
                </Label>
                <select
                  id="filter"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 md:px-4 py-2 md:py-3 text-sm md:text-base font-semibold rounded-lg md:rounded-xl border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background transition-all duration-300 min-w-[120px] md:min-w-[140px]"
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="scheduled">รอยืนยัน</option>
                  <option value="completed">เสร็จสิ้น</option>
                  <option value="cancelled">ยกเลิก</option>
                  <option value="no_show">ไม่มาตามนัด</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient Selection and Vaccination Form */}
        <Card className="bg-white border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-foreground">
              เลือกคนไข้และนัดหมายการฉีดวัคซีน
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-foreground">เลือกคนไข้จากรายชื่อที่ลงทะเบียน</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger className="w-full py-3 text-sm font-medium border border-border focus:border-primary">
                  <SelectValue placeholder="เลือกคนไข้..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {registrations.map((registration) => (
                    <SelectItem key={registration.id} value={registration.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{registration.full_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {registration.phone} • {registration.registration_id}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPatientId && (
              <div className="space-y-4">
                {/* Vaccine Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-foreground">ประเภทวัคซีน</Label>
                  {selectedVaccines.map((vaccine, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Select 
                        value={vaccine.type} 
                        onValueChange={(value) => updateVaccine(index, value)}
                      >
                        <SelectTrigger className="py-3 text-sm font-medium flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {vaccineOptions.map(option => (
                            <SelectItem key={option.type} value={option.type}>
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedVaccines.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeVaccine(index)}
                          className="px-3"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {selectedVaccines.length < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addVaccine}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      เพิ่มวัคซีน ({selectedVaccines.length}/3)
                    </Button>
                  )}
                </div>

                {/* Date Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-foreground">วันที่ฉีดวัคซีน</Label>
                  <Input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="py-3 text-sm font-medium"
                  />
                </div>

                {/* Action Button */}
                <div className="space-y-2">
                  <Button
                    onClick={async () => {
                      const selectedReg = registrations.find(r => r.id === selectedPatientId);
                      if (selectedReg && appointmentDate && selectedVaccines.length > 0) {
                        const isToday = appointmentDate === new Date().toISOString().split('T')[0];
                        await scheduleVaccineFromRegistration(selectedReg, selectedVaccines, isToday, appointmentDate);
                        setSelectedPatientId('');
                        setAppointmentDate('');
                        setSelectedVaccines([{ type: 'flu', name: 'วัคซีนไข้หวัดใหญ่' }]);
                      }
                    }}
                    disabled={!selectedPatientId || !appointmentDate || selectedVaccines.length === 0 || isLoading}
                    className="w-full py-3 text-sm font-bold bg-primary hover:bg-primary/90"
                  >
                    {appointmentDate === new Date().toISOString().split('T')[0] ? 'บันทึกการฉีดวันนี้' : 'สร้างนัดหมาย'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modern Patient List */}
        {searchTerm && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-soft">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-foreground">
                ผลการค้นหาคนไข้ ({filteredPatients.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredPatients.map((patient) => (
                  <div key={patient.id} className="bg-gradient-card rounded-xl p-6 border border-green-100 shadow-soft hover:shadow-medium transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">{patient.name}</h3>
                        <p className="text-sm text-muted-foreground">ID: {patient.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="flex items-center gap-3 bg-green-50 rounded-lg p-3">
                        <Phone className="h-5 w-5 text-primary" />
                        <span className="font-medium">{patient.phone}</span>
                      </div>
                      <div className="flex items-center gap-3 bg-green-50 rounded-lg p-3">
                        <span className="text-sm font-medium">อีเมล: {patient.email}</span>
                      </div>
                      <div className="flex items-center gap-3 bg-green-50 rounded-lg p-3">
                        <span className="text-sm font-medium">LINE ID: {patient.lineId}</span>
                      </div>
                    </div>

                    <div className="border-t border-green-100 pt-4">
                      <h4 className="text-sm font-semibold mb-4 text-foreground">เลือกวัคซีนสำหรับคนไข้</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => scheduleVaccine(patient, 'flu')}
                          className="text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                          disabled={isLoading}
                        >
                          วัคซีนไข้หวัดใหญ่
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => scheduleVaccine(patient, 'hep_b')}
                          className="text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                          disabled={isLoading}
                        >
                          วัคซีนไวรัสตับอักเสบบี
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => scheduleVaccine(patient, 'tetanus')}
                          className="text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                          disabled={isLoading}
                        >
                          วัคซีนป้องกันบาดทะยัก
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => scheduleVaccine(patient, 'shingles')}
                          className="text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                          disabled={isLoading}
                        >
                          วัคซีนงูสวัด
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => scheduleVaccine(patient, 'hpv')}
                          className="text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                          disabled={isLoading}
                        >
                          วัคซีนป้องกันมะเร็งปากมดลูก
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => scheduleVaccine(patient, 'pneumonia')}
                          className="text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                          disabled={isLoading}
                        >
                          วัคซีนปอดอักเสบ
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => scheduleVaccine(patient, 'chickenpox')}
                          className="text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                          disabled={isLoading}
                        >
                          วัคซีนอีสุกอีใส
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => scheduleVaccine(patient, 'rabies')}
                          className="text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                          disabled={isLoading}
                        >
                          วัคซีนพิษสุนัขบ้า
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredPatients.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">ไม่พบข้อมูลคนไข้ที่ตรงกับการค้นหา</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Patient Registrations Section */}
        {filteredRegistrations.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-soft">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-foreground">
                ผู้ลงทะเบียนรอการนัดหมาย ({filteredRegistrations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredRegistrations.map((registration) => (
                  <div key={registration.id} className="bg-gradient-card rounded-xl p-6 border border-blue-100 shadow-soft hover:shadow-medium transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">{registration.full_name}</h3>
                        <p className="text-sm text-muted-foreground">รหัสลงทะเบียน: {registration.registration_id}</p>
                        <p className="text-xs text-muted-foreground">ลงทะเบียนเมื่อ: {new Date(registration.created_at).toLocaleDateString('th-TH')}</p>
                      </div>
                      <Badge variant={registration.status === 'pending' ? 'secondary' : 'default'}>
                        {registration.status === 'pending' ? 'รอการนัดหมาย' : 
                         registration.status === 'scheduled' ? 'นัดหมายแล้ว' : registration.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center gap-3 bg-blue-50 rounded-lg p-3">
                        <Phone className="h-5 w-5 text-primary" />
                        <span className="font-medium">{registration.phone}</span>
                      </div>
                      <div className="flex items-center gap-3 bg-blue-50 rounded-lg p-3">
                        <span className="text-sm font-medium">โรงพยาบาล: {registration.hospital}</span>
                      </div>
                    </div>

                    {registration.notes && (
                      <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800"><strong>หมายเหตุ:</strong> {registration.notes}</p>
                      </div>
                    )}

                    {registration.status === 'pending' && (
                      <div className="border-t border-blue-100 pt-4">
                        <h4 className="text-sm font-semibold mb-4 text-foreground">ตัวเลือกการฉีดวัคซีน</h4>
                        
                        {/* Date Selection */}
                        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                          <h5 className="text-sm font-medium mb-3">เลือกวันที่ฉีดวัคซีน:</h5>
                          <div className="flex gap-3 mb-3">
                            <Button
                              size="sm"
                              variant={selectedRegistration?.id === registration.id && appointmentDate === 'today' ? 'default' : 'outline'}
                              onClick={() => {
                                setSelectedRegistration(registration);
                                setAppointmentDate('today');
                              }}
                              className="text-xs"
                            >
                              ฉีดวันนี้
                            </Button>
                            <Button
                              size="sm"
                              variant={selectedRegistration?.id === registration.id && appointmentDate === 'future' ? 'default' : 'outline'}
                              onClick={() => {
                                setSelectedRegistration(registration);
                                setAppointmentDate('future');
                              }}
                              className="text-xs"
                            >
                              นัดวันอื่น
                            </Button>
                          </div>
                          
                          {selectedRegistration?.id === registration.id && appointmentDate === 'future' && (
                            <div className="mb-3">
                              <Label htmlFor={`date-${registration.id}`} className="text-xs">เลือกวันที่นัดหมาย:</Label>
                              <Input
                                id={`date-${registration.id}`}
                                type="date"
                                min={new Date().toISOString().split('T')[0]}
                                className="mt-1"
                                onChange={(e) => setAppointmentDate(e.target.value)}
                              />
                            </div>
                          )}
                        </div>

                        {/* Vaccine Selection */}
                        {selectedRegistration?.id === registration.id && appointmentDate && (
                          <div>
                            <h5 className="text-sm font-medium mb-3">เลือกประเภทวัคซีน:</h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (appointmentDate === 'today') {
                                    scheduleVaccineFromRegistration(registration, [{ type: 'flu', name: 'วัคซีนไข้หวัดใหญ่' }], true);
                                  } else {
                                    scheduleVaccineFromRegistration(registration, [{ type: 'flu', name: 'วัคซีนไข้หวัดใหญ่' }], false, appointmentDate);
                                  }
                                  setSelectedRegistration(null);
                                  setAppointmentDate('');
                                }}
                                className="text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                                disabled={isLoading}
                              >
                                วัคซีนไข้หวัดใหญ่
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (appointmentDate === 'today') {
                                    scheduleVaccineFromRegistration(registration, [{ type: 'hep_b', name: 'วัคซีนไวรัสตับอักเสบบี' }], true);
                                  } else {
                                    scheduleVaccineFromRegistration(registration, [{ type: 'hep_b', name: 'วัคซีนไวรัสตับอักเสบบี' }], false, appointmentDate);
                                  }
                                  setSelectedRegistration(null);
                                  setAppointmentDate('');
                                }}
                                className="text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                                disabled={isLoading}
                              >
                                วัคซีนไวรัสตับอักเสบบี
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (appointmentDate === 'today') {
                                    scheduleVaccineFromRegistration(registration, [{ type: 'tetanus', name: 'วัคซีนบาดทะยัก' }], true);
                                  } else {
                                    scheduleVaccineFromRegistration(registration, [{ type: 'tetanus', name: 'วัคซีนบาดทะยัก' }], false, appointmentDate);
                                  }
                                  setSelectedRegistration(null);
                                  setAppointmentDate('');
                                }}
                                className="text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                                disabled={isLoading}
                              >
                                วัคซีนป้องกันบาดทะยัก
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (appointmentDate === 'today') {
                                    scheduleVaccineFromRegistration(registration, [{ type: 'shingles', name: 'วัคซีนงูสวัด' }], true);
                                  } else {
                                    scheduleVaccineFromRegistration(registration, [{ type: 'shingles', name: 'วัคซีนงูสวัด' }], false, appointmentDate);
                                  }
                                  setSelectedRegistration(null);
                                  setAppointmentDate('');
                                }}
                                className="text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                                disabled={isLoading}
                              >
                                วัคซีนงูสวัด
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (appointmentDate === 'today') {
                                    scheduleVaccineFromRegistration(registration, [{ type: 'hpv', name: 'วัคซีน HPV' }], true);
                                  } else {
                                    scheduleVaccineFromRegistration(registration, [{ type: 'hpv', name: 'วัคซีน HPV' }], false, appointmentDate);
                                  }
                                  setSelectedRegistration(null);
                                  setAppointmentDate('');
                                }}
                                className="text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                                disabled={isLoading}
                              >
                                วัคซีนป้องกันมะเร็งปากมดลูก
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (appointmentDate === 'today') {
                                    scheduleVaccineFromRegistration(registration, [{ type: 'pneumonia', name: 'วัคซีนปอดบวม' }], true);
                                  } else {
                                    scheduleVaccineFromRegistration(registration, [{ type: 'pneumonia', name: 'วัคซีนปอดบวม' }], false, appointmentDate);
                                  }
                                  setSelectedRegistration(null);
                                  setAppointmentDate('');
                                }}
                                className="text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                                disabled={isLoading}
                              >
                                วัคซีนปอดอักเสบ
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (appointmentDate === 'today') {
                                    scheduleVaccineFromRegistration(registration, [{ type: 'chickenpox', name: 'วัคซีนอีสุกอีใส' }], true);
                                  } else {
                                    scheduleVaccineFromRegistration(registration, [{ type: 'chickenpox', name: 'วัคซีนอีสุกอีใส' }], false, appointmentDate);
                                  }
                                  setSelectedRegistration(null);
                                  setAppointmentDate('');
                                }}
                                className="text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                                disabled={isLoading}
                              >
                                วัคซีนอีสุกอีใส
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (appointmentDate === 'today') {
                                    scheduleVaccineFromRegistration(registration, [{ type: 'rabies', name: 'วัคซีนพิษสุนัขบ้า' }], true);
                                  } else {
                                    scheduleVaccineFromRegistration(registration, [{ type: 'rabies', name: 'วัคซีนพิษสุนัขบ้า' }], false, appointmentDate);
                                  }
                                  setSelectedRegistration(null);
                                  setAppointmentDate('');
                                }}
                                className="text-xs hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                                disabled={isLoading}
                              >
                                วัคซีนพิษสุนัขบ้า
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Same-Day Vaccination Form */}
        <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 shadow-crisp">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Send className="h-6 w-6 text-orange-600" />
                ลงทะเบียนฉีดวัคซีนวันนี้
              </CardTitle>
              <Button
                variant="outline"
                onClick={() => setShowSameDayForm(!showSameDayForm)}
                className="border-orange-300 hover:bg-orange-100"
              >
                {showSameDayForm ? 'ซ่อนแบบฟอร์ม' : 'แสดงแบบฟอร์ม'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">สำหรับคนไข้ที่มาฉีดวัคซีนโดยไม่ได้นัดหมายล่วงหน้า</p>
          </CardHeader>
          
          {showSameDayForm && (
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="same-day-name">ชื่อ-นามสกุล *</Label>
                    <Input
                      id="same-day-name"
                      value={sameDayForm.name}
                      onChange={(e) => setSameDayForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="กรุณากรอกชื่อ-นามสกุล"
                      className="border-orange-300 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="same-day-phone">เบอร์โทรศัพท์ *</Label>
                    <Input
                      id="same-day-phone"
                      value={sameDayForm.phone}
                      onChange={(e) => setSameDayForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="081-234-5678"
                      className="border-orange-300 focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="same-day-id">เลขประจำตัว/เลขบัตรประชาชน</Label>
                    <Input
                      id="same-day-id"
                      value={sameDayForm.idNumber}
                      onChange={(e) => setSameDayForm(prev => ({ ...prev, idNumber: e.target.value }))}
                      placeholder="1234567890123"
                      className="border-orange-300 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="same-day-vaccine">ประเภทวัคซีน *</Label>
                    <select
                      id="same-day-vaccine"
                      value={sameDayForm.vaccineType}
                      onChange={(e) => setSameDayForm(prev => ({ ...prev, vaccineType: e.target.value }))}
                      className="w-full px-3 py-2 border border-orange-300 rounded-md focus:border-orange-500 focus:outline-none"
                    >
                      <option value="flu">วัคซีนไข้หวัดใหญ่</option>
                      <option value="hep_b">วัคซีนไวรัสตับอักเสบบี</option>
                      <option value="tetanus">วัคซีนป้องกันบาดทะยัก</option>
                      <option value="shingles">วัคซีนงูสวัด</option>
                      <option value="hpv">วัคซีนป้องกันมะเร็งปากมดลูก</option>
                      <option value="pneumonia">วัคซีนปอดอักเสบ</option>
                      <option value="chickenpox">วัคซีนอีสุกอีใส</option>
                      <option value="rabies">วัคซีนพิษสุนัขบ้า</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="same-day-notes">หมายเหตุ</Label>
                  <Input
                    id="same-day-notes"
                    value={sameDayForm.notes}
                    onChange={(e) => setSameDayForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                    className="border-orange-300 focus:border-orange-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      if (!sameDayForm.name || !sameDayForm.phone) {
                        toast({
                          title: "ข้อมูลไม่ครบถ้วน",
                          description: "กรุณากรอกชื่อและเบอร์โทรศัพท์",
                          variant: "destructive",
                        });
                        return;
                      }
                      createSameDayVaccination({
                        name: sameDayForm.name,
                        phone: sameDayForm.phone,
                        idNumber: sameDayForm.idNumber,
                        vaccineType: sameDayForm.vaccineType,
                        notes: sameDayForm.notes
                      });
                      // Reset form
                      setSameDayForm({
                        name: '',
                        phone: '',
                        idNumber: '',
                        vaccineType: 'flu',
                        notes: ''
                      });
                    }}
                    disabled={isLoading || !sameDayForm.name || !sameDayForm.phone}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isLoading ? 'กำลังบันทึก...' : 'บันทึกการฉีดวัคซีน'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSameDayForm({
                        name: '',
                        phone: '',
                        idNumber: '',
                        vaccineType: 'flu',
                        notes: ''
                      });
                    }}
                    className="border-orange-300 hover:bg-orange-100"
                  >
                    เคลียร์ข้อมูล
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Enhanced Appointments List */}
        <Card className="bg-white border-2 border-green-200 shadow-crisp">
          <CardHeader className="pb-6 border-b border-green-100">
            <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Calendar className="h-7 w-7 text-primary" />
              รายการนัดหมาย ({filteredAppointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              {filteredAppointments.map((appointment) => {
                const StatusIcon = getStatusIcon(appointment.status);
                return (
                  <div key={appointment.id} className="bg-gradient-to-r from-white to-green-50/30 rounded-2xl p-8 border-2 border-green-100 shadow-crisp hover:shadow-medium hover:border-green-200 transition-all duration-300">
                    <div className="flex justify-between items-start mb-6">
                      <div className="space-y-2">
                        <h3 className="font-bold text-2xl text-foreground">{appointment.patient_name}</h3>
                        <p className="text-base text-muted-foreground font-medium">รหัสนัดหมาย: {appointment.appointment_id}</p>
                      </div>
                      <Badge className={`${getStatusColor(appointment.status)} px-4 py-2 rounded-xl text-base flex items-center gap-2 min-w-[140px] justify-center`}>
                        <StatusIcon className="h-4 w-4" />
                        {getStatusText(appointment.status)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="flex items-center gap-4 bg-white rounded-xl p-4 border border-green-200 shadow-sm">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground font-medium">เบอร์โทร</p>
                          <p className="font-bold text-foreground">{appointment.patient_phone}</p>
                        </div>
                        {appointment.line_user_id && (
                          <div className="ml-auto">
                            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-300 font-bold">
                              LINE
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 bg-white rounded-xl p-4 border border-green-200 shadow-sm">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground font-medium">วันที่และเวลา</p>
                          <p className="font-bold text-foreground">{appointment.appointment_date}</p>
                          <p className="text-sm text-primary font-semibold">{appointment.appointment_time}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 bg-white rounded-xl p-4 border border-green-200 shadow-sm">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <div className="h-5 w-5 bg-primary rounded-full"></div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground font-medium">ประเภทวัคซีน</p>
                          <p className="font-bold text-foreground">{appointment.vaccine_type}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 flex-wrap pt-6 border-t border-green-100">
                      {appointment.status === 'scheduled' && (
                        <Button
                          size="lg"
                          onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                          disabled={isLoading}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-medium hover:shadow-large transition-all duration-300 px-6 py-3 font-bold"
                        >
                          <CheckCircle className="h-5 w-5 mr-3" />
                          ยืนยันเสร็จสิ้น
                        </Button>
                      )}
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => sendNotification(appointment, `🔔 แจ้งเตือนการนัดหมายฉีดวัคซีน\n\nสวัสดีคุณ ${appointment.patient_name}\n\n📅 วันที่: ${appointment.appointment_date}\n⏰ เวลา: ${appointment.appointment_time}\n💉 วัคซีน: ${appointment.vaccine_type}\n🏥 สถานที่: โรงพยาบาลโฮม\n\nกรุณามาตามเวลานัดหมาย\nหากมีข้อสงสัยสามารถติดต่อโรงพยาบาลได้`)}
                        className="border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all duration-300 px-6 py-3 font-bold shadow-sm hover:shadow-medium"
                      >
                        <Send className="h-5 w-5 mr-3" />
                        {appointment.line_user_id ? 'ส่งข้อความ LINE' : 'ส่งแจ้งเตือน'}
                      </Button>
                      {appointment.status === 'scheduled' && (
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                          disabled={isLoading}
                          className="border-2 border-rose-500 text-rose-600 hover:bg-rose-500 hover:text-white transition-all duration-300 px-6 py-3 font-bold shadow-sm hover:shadow-medium"
                        >
                          <XCircle className="h-5 w-5 mr-3" />
                          ยกเลิกนัดหมาย
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredAppointments.length === 0 && !searchTerm && (
                <div className="text-center py-16 text-muted-foreground">
                  <Calendar className="h-16 w-16 mx-auto mb-6 opacity-50" />
                  <p className="text-xl font-semibold">ไม่พบข้อมูลการนัดหมาย</p>
                  <p className="text-base mt-2">ลองโหลดข้อมูลใหม่หรือตรวจสอบการเชื่อมต่อ</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
};

export default StaffPortal;
