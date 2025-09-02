import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Bell,
  Syringe,
  User,
  FileText,
  Target,
  TrendingUp
} from 'lucide-react';
import { format, addDays, differenceInDays, parseISO, isBefore, isAfter } from 'date-fns';
import { th } from 'date-fns/locale';

interface VaccineSchedule {
  id: string;
  vaccine_name: string;
  vaccine_type: string;
  total_doses: number;
  dose_intervals: any; // JSON array from database
  age_restrictions: any; // JSON object from database  
  contraindications: any; // JSON array from database
  indications: any; // JSON array from database
  side_effects: any; // JSON array from database
  efficacy_duration: number;
  booster_required: boolean;
  booster_interval: number | null;
  active: boolean;
}

interface PatientTracking {
  id: string;
  patient_id: string;
  patient_name: string;
  vaccine_schedule_id: string;
  current_dose: number;
  total_doses: number;
  last_dose_date: string | null;
  next_dose_due: string | null;
  completion_status: string;
  auto_reminder_enabled: boolean;
  reminder_days_before: number;
  contraindication_checked: boolean;
  contraindication_notes: string | null;
}

interface PatientConditions {
  pregnancy?: boolean;
  immunocompromised?: boolean;
  severe_allergic_reaction?: boolean;
  myocarditis_history?: boolean;
  guillain_barre_syndrome?: boolean;
  chronic_disease?: boolean;
  age?: number;
  [key: string]: boolean | number | undefined;
}

const VaccineScheduleCalculator: React.FC = () => {
  const [schedules, setSchedules] = useState<VaccineSchedule[]>([]);
  const [tracking, setTracking] = useState<PatientTracking[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<VaccineSchedule | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientConditions, setPatientConditions] = useState<PatientConditions>({});
  const [contraindicationResult, setContraindicationResult] = useState<any>(null);
  const [calculatedSchedule, setCalculatedSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadVaccineSchedules();
    loadPatientTracking();
  }, []);

  const loadVaccineSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('vaccine_schedules')
        .select('*')
        .eq('active', true)
        .order('vaccine_name');

      if (error) throw error;
      setSchedules(data || []);
    } catch (error: any) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลตารางวัคซีนได้",
        variant: "destructive"
      });
    }
  };

  const loadPatientTracking = async () => {
    try {
      console.log('🔍 เริ่มโหลดข้อมูลการติดตามผู้ป่วย...');
      
      // Get all appointments to calculate actual tracking data
      const { data: allAppointments, error: apptError } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: false });

      if (apptError) throw apptError;

      console.log('📊 ข้อมูลนัดทั้งหมด:', allAppointments?.length || 0, 'รายการ');

      const completedAppointments = allAppointments?.filter(a => a.status === 'completed') || [];
      const scheduledAppointments = allAppointments?.filter(a => ['scheduled', 'pending'].includes(a.status)) || [];

      console.log('✅ การฉีดที่เสร็จสิ้น:', completedAppointments.length, 'รายการ');
      console.log('📅 นัดที่มีอยู่แล้ว:', scheduledAppointments.length, 'รายการ');

      // Group by patient and vaccine type to get actual tracking data
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

      // Calculate tracking data based on actual appointments
      const trackingData = [];
      
      for (const patient of patientVaccineMap.values()) {
        try {
          // Find vaccine schedule
          const schedule = vaccineSchedules?.find(vs => 
            vs.vaccine_type.toLowerCase() === patient.vaccine_type.toLowerCase()
          );

          if (!schedule) {
            console.log(`❌ ไม่พบข้อมูลวัคซีน: ${patient.vaccine_type}`);
            continue;
          }

          // Check completion status
          let completionStatus = 'in_progress';
          let nextDoseDate = null;

          if (patient.doses_received >= schedule.total_doses) {
            completionStatus = 'completed';
            console.log(`✅ ผู้ป่วย ${patient.patient_name} ได้รับวัคซีน ${patient.vaccine_type} ครบแล้ว`);
          } else {
            // Check if patient already has a future appointment for this vaccine type
            const existingFutureAppointment = scheduledAppointments.find(appt => {
              const apptPatientKey = appt.patient_id_number || appt.line_user_id;
              return (apptPatientKey === patient.patient_id) &&
                     appt.vaccine_type.toLowerCase() === patient.vaccine_type.toLowerCase() &&
                     new Date(appt.appointment_date) > new Date();
            });

            if (!existingFutureAppointment) {
              // Calculate next dose date
              const intervals = Array.isArray(schedule.dose_intervals) ? 
                schedule.dose_intervals : 
                JSON.parse(schedule.dose_intervals?.toString() || '[]');

              let nextDate = new Date(patient.latest_date);
              
              // Add interval for current dose (intervals are 0-indexed)
              const intervalDays = typeof intervals[patient.doses_received - 1] === 'number' ? 
                intervals[patient.doses_received - 1] : 30;
              nextDate.setDate(nextDate.getDate() + intervalDays);
              
              nextDoseDate = nextDate.toISOString().split('T')[0];
            }
          }

          trackingData.push({
            id: `${patient.patient_id}-${patient.vaccine_type}`,
            patient_id: patient.patient_id,
            patient_name: patient.patient_name,
            vaccine_schedule_id: schedule.id,
            current_dose: patient.doses_received,
            total_doses: schedule.total_doses,
            last_dose_date: patient.latest_date,
            next_dose_due: nextDoseDate,
            completion_status: completionStatus,
            auto_reminder_enabled: true,
            reminder_days_before: 1,
            contraindication_checked: false,
            contraindication_notes: null,
            vaccine_schedules: {
              vaccine_name: schedule.vaccine_name,
              vaccine_type: schedule.vaccine_type,
              dose_intervals: schedule.dose_intervals,
              total_doses: schedule.total_doses
            }
          });

        } catch (error) {
          console.error('Error processing patient:', patient.patient_id, error);
        }
      }

      console.log('✅ ข้อมูลการติดตามที่คำนวณได้:', trackingData.length, 'รายการ');
      setTracking(trackingData);
      
    } catch (error: any) {
      console.error('Error loading patient tracking:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลการติดตามผู้ป่วยได้",
        variant: "destructive"
      });
    }
  };

  const checkContraindications = async (scheduleId: string) => {
    if (!scheduleId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('check_contraindications', {
        _vaccine_schedule_id: scheduleId,
        _patient_conditions: patientConditions
      });

      if (error) throw error;
      setContraindicationResult(data);
    } catch (error: any) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถตรวจสอบข้อห้ามได้",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateVaccineSchedule = () => {
    if (!selectedSchedule) return;

    const schedule = selectedSchedule;
    const today = new Date();
    const scheduleArray = [];

    // First dose
    scheduleArray.push({
      dose: 1,
      date: today,
      dueDays: 0,
      status: 'due',
      description: `โดสแรกของวัคซีน ${schedule.vaccine_name}`
    });

    // Subsequent doses
    let currentDate = today;
    for (let i = 1; i < schedule.total_doses; i++) {
      const intervalDays = schedule.dose_intervals[i - 1] || 30;
      currentDate = addDays(currentDate, intervalDays);

      scheduleArray.push({
        dose: i + 1,
        date: currentDate,
        dueDays: differenceInDays(currentDate, today),
        status: 'scheduled',
        description: `โดสที่ ${i + 1} ของวัคซีน ${schedule.vaccine_name} (หลังจากโดสก่อนหน้า ${intervalDays} วัน)`
      });
    }

    // Booster if required
    if (schedule.booster_required && schedule.booster_interval) {
      const boosterDate = addDays(currentDate, schedule.booster_interval);
      scheduleArray.push({
        dose: 'booster',
        date: boosterDate,
        dueDays: differenceInDays(boosterDate, today),
        status: 'booster',
        description: `โดสเสริม (หลังจากโดสสุดท้าย ${schedule.booster_interval} วัน)`
      });
    }

    setCalculatedSchedule(scheduleArray);
  };

  const createPatientTracking = async () => {
    if (!selectedSchedule || !selectedPatientId || !patientName) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกข้อมูลให้ครบถ้วน",
        variant: "destructive"
      });
      return;
    }

    if (contraindicationResult?.has_contraindications) {
      toast({
        title: "พบข้อห้าม",
        description: "ไม่สามารถสร้างการติดตามได้เนื่องจากมีข้อห้าม",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const nextDoseDate = addDays(new Date(), 0); // Can start immediately

      const { error } = await supabase
        .from('patient_vaccine_tracking')
        .insert({
          patient_id: selectedPatientId,
          patient_name: patientName,
          vaccine_schedule_id: selectedSchedule.id,
          current_dose: 1,
          total_doses: selectedSchedule.total_doses,
          next_dose_due: format(nextDoseDate, 'yyyy-MM-dd'),
          completion_status: 'in_progress',
          auto_reminder_enabled: true,
          reminder_days_before: 1,
          contraindication_checked: true,
          contraindication_notes: contraindicationResult?.contraindications?.length > 0 
            ? `ตรวจพบ: ${contraindicationResult.contraindications.join(', ')}` 
            : null
        });

      if (error) throw error;

      // Create notification schedule
      await createNotificationSchedule(selectedPatientId, nextDoseDate);

      toast({
        title: "สำเร็จ",
        description: "สร้างการติดตามวัคซีนเรียบร้อยแล้ว",
        variant: "default"
      });

      // Reset form
      setSelectedPatientId('');
      setPatientName('');
      setPatientConditions({});
      setContraindicationResult(null);
      setCalculatedSchedule([]);
      
      loadPatientTracking();
    } catch (error: any) {
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถสร้างการติดตามได้",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createNotificationSchedule = async (patientId: string, dueDate: Date) => {
    const reminderDate = addDays(dueDate, -1); // 1 day before

    await supabase
      .from('notification_schedules')
      .insert({
        patient_tracking_id: null, // Will be updated after tracking is created
        notification_type: 'reminder',
        scheduled_date: format(reminderDate, 'yyyy-MM-dd'),
        message_content: `🔔 แจ้งเตือนการฉีดวัคซีน\n\nพรุ่งนี้ (${format(dueDate, 'dd/MM/yyyy')}) คุณมีนัดฉีดวัคซีน ${selectedSchedule?.vaccine_name}\n\nกรุณามาตรงเวลา`,
        line_user_id: patientId,
        sent: false
      });
  };

  const updatePatientCondition = (condition: string, value: boolean | number) => {
    setPatientConditions(prev => ({
      ...prev,
      [condition]: value
    }));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      due: { color: 'bg-green-500', text: 'ถึงกำหนด' },
      scheduled: { color: 'bg-blue-500', text: 'กำหนดการ' },
      booster: { color: 'bg-purple-500', text: 'โดสเสริม' },
      overdue: { color: 'bg-red-500', text: 'เกินกำหนด' },
      completed: { color: 'bg-gray-500', text: 'เสร็จสิ้น' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <Tabs defaultValue="calculator" className="space-y-4">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 gap-1 md:gap-0 h-auto md:h-10">
          <TabsTrigger value="calculator" className="flex items-center gap-2 text-sm md:text-base p-3 md:p-2">
            <Target className="h-4 w-4" />
            <span>คำนวณตารางวัคซีน</span>
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-2 text-sm md:text-base p-3 md:p-2">
            <TrendingUp className="h-4 w-4" />
            <span>ติดตามผู้ป่วย</span>
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2 text-sm md:text-base p-3 md:p-2">
            <FileText className="h-4 w-4" />
            <span>ตารางวัคซีน</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="flex items-center space-x-2 text-lg md:text-xl">
                <Syringe className="h-5 w-5 text-primary" />
                <span>คำนวณตารางวัคซีนสำหรับผู้ป่วย</span>
              </CardTitle>
              <CardDescription className="text-sm md:text-base">
                เลือกวัคซีนและระบุข้อมูลผู้ป่วยเพื่อคำนวณตารางการฉีดและตรวจสอบข้อห้าม
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient-id" className="text-sm md:text-base font-medium">รหัสผู้ป่วย/LINE User ID</Label>
                  <Input
                    id="patient-id"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    placeholder="ระบุรหัสผู้ป่วย"
                    className="text-sm md:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patient-name" className="text-sm md:text-base font-medium">ชื่อผู้ป่วย</Label>
                  <Input
                    id="patient-name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="ระบุชื่อผู้ป่วย"
                    className="text-sm md:text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vaccine-select" className="text-sm md:text-base font-medium">เลือกวัคซีน</Label>
                <Select
                  value={selectedSchedule?.id || ''}
                  onValueChange={(value) => {
                    const schedule = schedules.find(s => s.id === value);
                    setSelectedSchedule(schedule || null);
                    setContraindicationResult(null);
                  }}
                >
                  <SelectTrigger className="text-sm md:text-base">
                    <SelectValue placeholder="เลือกวัคซีนที่ต้องการ" />
                  </SelectTrigger>
                  <SelectContent>
                    {schedules.map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id} className="text-sm md:text-base">
                        {schedule.vaccine_name} ({schedule.total_doses} โดส)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSchedule && (
                <Card className="border-primary/20 mt-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base md:text-lg text-primary">
                      ข้อมูลวัคซีน: {selectedSchedule.vaccine_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm md:text-base">
                      <div className="bg-background/50 p-3 rounded-lg">
                        <span className="font-medium text-muted-foreground block mb-1">จำนวนโดส:</span>
                        <p className="font-semibold">{selectedSchedule.total_doses} โดส</p>
                      </div>
                      <div className="bg-background/50 p-3 rounded-lg">
                        <span className="font-medium text-muted-foreground block mb-1">ระยะห่าง:</span>
                        <p className="font-semibold">{selectedSchedule.dose_intervals.join(', ')} วัน</p>
                      </div>
                      <div className="bg-background/50 p-3 rounded-lg">
                        <span className="font-medium text-muted-foreground block mb-1">ระยะเวลาคุ้มกัน:</span>
                        <p className="font-semibold">{Math.round(selectedSchedule.efficacy_duration / 365)} ปี</p>
                      </div>
                      <div className="bg-background/50 p-3 rounded-lg">
                        <span className="font-medium text-muted-foreground block mb-1">โดสเสริม:</span>
                        <p className="font-semibold">{selectedSchedule.booster_required ? 'ต้องการ' : 'ไม่ต้องการ'}</p>
                      </div>
                    </div>

                    {selectedSchedule.age_restrictions && (
                      <div className="bg-background/50 p-3 rounded-lg">
                        <span className="font-medium text-muted-foreground block mb-2">ข้อจำกัดอายุ:</span>
                        <p className="text-sm md:text-base">
                          {selectedSchedule.age_restrictions.min_age && `อายุขั้นต่ำ ${selectedSchedule.age_restrictions.min_age} ปี`}
                          {selectedSchedule.age_restrictions.min_age && selectedSchedule.age_restrictions.max_age && ' - '}
                          {selectedSchedule.age_restrictions.max_age && `อายุสูงสุด ${selectedSchedule.age_restrictions.max_age} ปี`}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <span className="font-medium text-muted-foreground">ข้อบ่งชี้:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedSchedule.indications.map((indication, index) => (
                          <Badge key={index} variant="secondary" className="text-xs md:text-sm">
                            {indication}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="font-medium text-muted-foreground">ข้อห้าม:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedSchedule.contraindications.map((contraindication, index) => (
                          <Badge key={index} variant="destructive" className="text-xs md:text-sm">
                            {contraindication}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedSchedule && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ตรวจสอบข้อห้ามสำหรับผู้ป่วย</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="age">อายุ (ปี)</Label>
                        <Input
                          id="age"
                          type="number"
                          value={patientConditions.age || ''}
                          onChange={(e) => updatePatientCondition('age', parseInt(e.target.value) || 0)}
                          placeholder="อายุ"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>ประวัติและสภาวะของผู้ป่วย:</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { key: 'pregnancy', label: 'ตั้งครรภ์' },
                          { key: 'immunocompromised', label: 'ภูมิคุ้มกันบกพร่อง' },
                          { key: 'severe_allergic_reaction', label: 'แพ้รุนแรง' },
                          { key: 'myocarditis_history', label: 'ประวัติกล้ามเนื้อหัวใจอักเสบ' },
                          { key: 'guillain_barre_syndrome', label: 'กิแลง-บาร์เร่ ซินโดรม' },
                          { key: 'chronic_disease', label: 'โรคเรื้อรัง' }
                        ].map(({ key, label }) => (
                          <div key={key} className="flex items-center space-x-2">
                            <Checkbox
                              id={key}
                              checked={!!patientConditions[key]}
                              onCheckedChange={(checked) => updatePatientCondition(key, !!checked)}
                            />
                            <Label htmlFor={key} className="text-sm">{label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button onClick={() => checkContraindications(selectedSchedule.id)} disabled={loading}>
                        {loading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบข้อห้าม'}
                      </Button>
                      <Button onClick={calculateVaccineSchedule} variant="outline">
                        คำนวณตารางวัคซีน
                      </Button>
                    </div>

                    {contraindicationResult && (
                      <Alert className={contraindicationResult.has_contraindications ? "border-red-200" : "border-green-200"}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {contraindicationResult.has_contraindications ? (
                            <div>
                              <p className="font-medium text-red-600">พบข้อห้าม:</p>
                              <ul className="list-disc list-inside mt-1">
                                {contraindicationResult.contraindications.map((item: string, index: number) => (
                                  <li key={index}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-green-600">ไม่พบข้อห้าม สามารถฉีดวัคซีนได้</p>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {calculatedSchedule.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>ตารางการฉีดวัคซีน</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {calculatedSchedule.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="text-lg font-medium">
                              {typeof item.dose === 'number' ? `โดส ${item.dose}` : 'โดสเสริม'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(item.date, 'dd MMMM yyyy', { locale: th })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ({item.dueDays === 0 ? 'วันนี้' : `อีก ${item.dueDays} วัน`})
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(item.status)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <Button 
                        onClick={createPatientTracking} 
                        disabled={loading || contraindicationResult?.has_contraindications}
                        className="w-full"
                      >
                        {loading ? 'กำลังสร้าง...' : 'สร้างการติดตามวัคซีน'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>การติดตามผู้ป่วย</span>
              </CardTitle>
              <CardDescription>
                รายการผู้ป่วยที่กำลังอยู่ในระหว่างการฉีดวัคซีนตามตาราง
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tracking.map((track) => (
                  <div key={track.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{track.patient_name}</span>
                        <Badge variant="outline">{track.patient_id}</Badge>
                      </div>
                      <Badge 
                        className={
                          track.completion_status === 'completed' ? 'bg-green-500' :
                          track.completion_status === 'overdue' ? 'bg-red-500' :
                          track.completion_status === 'cancelled' ? 'bg-gray-500' :
                          'bg-blue-500'
                        }
                      >
                        {track.completion_status === 'completed' ? 'เสร็จสิ้น' :
                         track.completion_status === 'overdue' ? 'เกินกำหนด' :
                         track.completion_status === 'cancelled' ? 'ยกเลิก' :
                         'อยู่ระหว่างดำเนินการ'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">วัคซีน:</span>
                        <p className="font-medium">{(track as any).vaccine_schedules?.vaccine_name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">โดสที่ฉีดแล้ว:</span>
                        <p className="font-medium">
                          {track.current_dose > 0 ? `เข็มที่ ${track.current_dose} จาก ${track.total_doses} เข็ม` : 'ยังไม่เริ่มฉีด'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">เข็มล่าสุด:</span>
                        <p className="font-medium">
                          {track.last_dose_date && track.current_dose > 0 
                            ? `เข็มที่ ${track.current_dose} (${format(parseISO(track.last_dose_date), 'dd/MM/yyyy')})` 
                            : 'ยังไม่ได้ฉีด'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">นัดครั้งถัดไป:</span>
                        <p className="font-medium">
                          {track.next_dose_due ? format(parseISO(track.next_dose_due), 'dd/MM/yyyy') : 'ไม่มี'}
                        </p>
                      </div>
                    </div>

                    {track.contraindication_notes && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-800">หมายเหตุข้อห้าม:</span>
                        </div>
                        <p className="text-sm text-yellow-700 mt-1">{track.contraindication_notes}</p>
                      </div>
                    )}

                    <div className="mt-3 flex items-center space-x-2">
                      {track.auto_reminder_enabled && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Bell className="h-3 w-3" />
                          <span>แจ้งเตือนอัตโนมัติ {track.reminder_days_before} วันก่อน</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {tracking.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>ยังไม่มีการติดตามผู้ป่วย</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ตารางวัคซีนที่มีในระบบ</CardTitle>
              <CardDescription>
                ข้อมูลวัคซีนทั้งหมดที่สามารถใช้คำนวณตารางได้
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schedules.map((schedule) => (
                  <Card key={schedule.id} className="border-muted">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{schedule.vaccine_name}</CardTitle>
                        <Badge className="bg-primary">{schedule.vaccine_type}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">จำนวนโดส:</span>
                          <p>{schedule.total_doses} โดส</p>
                        </div>
                        <div>
                          <span className="font-medium">ระยะห่าง:</span>
                          <p>{schedule.dose_intervals.length > 0 ? schedule.dose_intervals.join(', ') + ' วัน' : 'ไม่มี'}</p>
                        </div>
                        <div>
                          <span className="font-medium">ระยะเวลาคุ้มกัน:</span>
                          <p>{Math.round(schedule.efficacy_duration / 365)} ปี</p>
                        </div>
                        <div>
                          <span className="font-medium">โดสเสริม:</span>
                          <p>{schedule.booster_required ? `จำเป็น (ทุก ${Math.round((schedule.booster_interval || 0) / 365)} ปี)` : 'ไม่จำเป็น'}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-sm">ข้อบ่งชี้:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {schedule.indications.map((indication, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {indication}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="font-medium text-sm">ข้อห้าม:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {schedule.contraindications.map((contraindication, index) => (
                              <Badge key={index} variant="destructive" className="text-xs">
                                {contraindication}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="font-medium text-sm">ผลข้างเคียง:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {schedule.side_effects.map((effect, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {effect}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VaccineScheduleCalculator;