import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calculator, Calendar, Syringe, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface VaccineSchedule {
  id: string;
  vaccine_name: string;
  vaccine_type: string;
  total_doses: number;
  dose_intervals: any; // Changed from number[] to any to handle Json type
  contraindications: any; // Changed from string[] to any to handle Json type
  side_effects: any; // Changed from string[] to any to handle Json type
  active: boolean;
}

interface PatientTracking {
  id: string;
  patient_name: string;
  patient_id: string;
  current_dose: number;
  total_doses: number;
  last_dose_date: string | null;
  next_dose_due: string | null;
  vaccine_schedule_id: string;
  completion_status: string;
  auto_reminder_enabled: boolean;
  reminder_days_before: number;
}

interface DoseCalculation {
  nextDoseNumber: number;
  nextDoseDate: string | null;
  daysUntilNextDose: number | null;
  isComplete: boolean;
  reminderDate: string | null;
}

interface PatientRegistration {
  id: string;
  registration_id: string;
  full_name: string;
  phone: string;
  line_user_id?: string;
  status: string;
}

const VaccineDoseCalculator = () => {
  const [vaccineSchedules, setVaccineSchedules] = useState<VaccineSchedule[]>([]);
  const [patientRegistrations, setPatientRegistrations] = useState<PatientRegistration[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRegistration | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastDoseDate, setLastDoseDate] = useState('');
  const [currentDose, setCurrentDose] = useState(1);
  const [calculation, setCalculation] = useState<DoseCalculation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reminderDays, setReminderDays] = useState(1);
  const { toast } = useToast();

  // โหลดข้อมูลวัคซีนและผู้ป่วย
  useEffect(() => {
    loadVaccineSchedules();
    loadPatientRegistrations();
  }, []);

  const loadVaccineSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('vaccine_schedules')
        .select('*')
        .eq('active', true)
        .order('vaccine_name');

      if (error) throw error;
      setVaccineSchedules(data || []);
    } catch (error) {
      console.error('Error loading vaccine schedules:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลวัคซีนได้",
        variant: "destructive"
      });
    }
  };

  const loadPatientRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('patient_registrations')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setPatientRegistrations(data || []);
    } catch (error) {
      console.error('Error loading patient registrations:', error);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลผู้ป่วยได้",
        variant: "destructive"
      });
    }
  };

  const calculateNextDose = () => {
    if (!selectedSchedule || !lastDoseDate) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกวัคซีนและระบุวันที่ฉีดครั้งล่าสุด",
        variant: "destructive"
      });
      return;
    }

    const schedule = vaccineSchedules.find(s => s.id === selectedSchedule);
    if (!schedule) return;

    const lastDate = new Date(lastDoseDate);
    const nextDoseNumber = currentDose + 1;
    
    // ตรวจสอบว่าครบโดสแล้วหรือไม่
    if (currentDose >= schedule.total_doses) {
      setCalculation({
        nextDoseNumber: currentDose,
        nextDoseDate: null,
        daysUntilNextDose: null,
        isComplete: true,
        reminderDate: null
      });
      return;
    }

    // คำนวณวันที่ฉีดครั้งถัดไป
    const intervals = Array.isArray(schedule.dose_intervals) ? schedule.dose_intervals : JSON.parse(schedule.dose_intervals || '[]');
    const intervalDays = intervals[currentDose - 1] || 0;
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + intervalDays);

    // คำนวณวันแจ้งเตือน
    const reminderDate = new Date(nextDate);
    reminderDate.setDate(reminderDate.getDate() - reminderDays);

    // คำนวณจำนวนวันที่เหลือ
    const today = new Date();
    const daysUntilNext = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    setCalculation({
      nextDoseNumber,
      nextDoseDate: nextDate.toISOString().split('T')[0],
      daysUntilNextDose: daysUntilNext,
      isComplete: false,
      reminderDate: reminderDate.toISOString().split('T')[0]
    });
  };

  const saveToDatabase = async () => {
    if (!calculation || !selectedPatient) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกผู้ป่วยและคำนวณข้อมูล",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const schedule = vaccineSchedules.find(s => s.id === selectedSchedule);
      
      const trackingData = {
        patient_name: selectedPatient.full_name,
        patient_id: selectedPatient.registration_id,
        vaccine_schedule_id: selectedSchedule,
        current_dose: currentDose,
        total_doses: schedule?.total_doses || 1,
        last_dose_date: lastDoseDate,
        next_dose_due: calculation.nextDoseDate,
        completion_status: calculation.isComplete ? 'completed' : 'in_progress',
        auto_reminder_enabled: true,
        reminder_days_before: reminderDays
      };

      const { error } = await supabase
        .from('patient_vaccine_tracking')
        .upsert(trackingData, {
          onConflict: 'patient_id,vaccine_schedule_id'
        });

      if (error) throw error;

      // สร้างการแจ้งเตือนอัตโนมัติ
      if (!calculation.isComplete && calculation.reminderDate) {
            const { error: scheduleError } = await supabase
              .from('notification_schedules')
              .insert({
                patient_tracking_id: (await supabase
                  .from('patient_vaccine_tracking')
                  .select('id')
                  .eq('patient_id', selectedPatient.registration_id)
                  .eq('vaccine_schedule_id', selectedSchedule)
                  .single()).data?.id,
                scheduled_date: calculation.reminderDate,
                notification_type: 'dose_reminder',
                message_content: `🔔 แจ้งเตือนฉีดวัคซีน

สวัสดี ${selectedPatient.full_name}
ได้เวลาฉีดวัคซีน ${schedule?.vaccine_name} โดสที่ ${calculation.nextDoseNumber}

📅 วันที่กำหนด: ${calculation.nextDoseDate}
💉 โดสที่: ${calculation.nextDoseNumber}/${schedule?.total_doses}

กรุณามาตามนัดหมายตรงเวลา`,
                sent: false
              });

        if (scheduleError) {
          console.error('Error creating notification:', scheduleError);
        }
      }

      toast({
        title: "บันทึกสำเร็จ",
        description: "ข้อมูลการติดตามวัคซีนถูกบันทึกแล้ว",
      });

      // รีเซ็ตฟอร์ม
      resetForm();
    } catch (error) {
      console.error('Error saving to database:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setSearchTerm('');
    setLastDoseDate('');
    setCurrentDose(1);
    setSelectedSchedule('');
    setCalculation(null);
    setReminderDays(1);
  };

  const selectedVaccine = vaccineSchedules.find(s => s.id === selectedSchedule);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            คำนวณโดสวัคซีนอัตโนมัติ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="patientSearch">ค้นหาผู้ป่วยจากรายชื่อลงทะเบียน</Label>
            <div className="relative">
              <Input
                id="patientSearch"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาด้วยชื่อ, เบอร์โทร, หรือ ID"
              />
              {searchTerm && (
                <div className="absolute top-full left-0 right-0 z-10 bg-background border rounded-b-md shadow-lg max-h-48 overflow-y-auto">
                  {patientRegistrations
                    .filter(patient => 
                      patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      patient.phone.includes(searchTerm) ||
                      patient.registration_id.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .slice(0, 10) // จำกัดผลลัพธ์ไม่เกิน 10 รายการ
                    .map((patient) => (
                      <div
                        key={patient.id}
                        className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setSelectedPatient(patient);
                          setSearchTerm(patient.full_name);
                        }}
                      >
                        <div className="font-medium">{patient.full_name}</div>
                        <div className="text-sm text-muted-foreground">{patient.phone}</div>
                        <div className="text-xs text-muted-foreground">ID: {patient.registration_id}</div>
                        <div className="text-xs text-muted-foreground">
                          สถานะ: {patient.status === 'pending' ? 'รอดำเนินการ' : 
                                  patient.status === 'confirmed' ? 'ยืนยันแล้ว' : patient.status}
                        </div>
                      </div>
                    ))
                  }
                  {patientRegistrations.filter(patient => 
                    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    patient.phone.includes(searchTerm) ||
                    patient.registration_id.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length === 0 && (
                    <div className="p-3 text-center text-muted-foreground">
                      ไม่พบผู้ป่วยที่ค้นหา
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {selectedPatient && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{selectedPatient.full_name}</div>
                  <div className="text-sm text-muted-foreground">{selectedPatient.phone}</div>
                  <div className="text-xs text-muted-foreground">ID: {selectedPatient.registration_id}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedPatient(null)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div>
            <Label>เลือกวัคซีน</Label>
            <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภทวัคซีน" />
              </SelectTrigger>
              <SelectContent>
                {vaccineSchedules.map((schedule) => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    {schedule.vaccine_name} ({schedule.total_doses} โดส)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedVaccine && (
            <Alert>
              <Syringe className="h-4 w-4" />
              <AlertDescription>
                <strong>{selectedVaccine.vaccine_name}</strong><br />
                จำนวนโดส: {selectedVaccine.total_doses} โดส<br />
                ช่วงห่างระหว่างโดส: {Array.isArray(selectedVaccine.dose_intervals) 
                  ? selectedVaccine.dose_intervals.join(', ') 
                  : JSON.parse(selectedVaccine.dose_intervals || '[]').join(', ')} วัน
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="currentDose">โดสปัจจุบัน</Label>
              <Select value={currentDose.toString()} onValueChange={(value) => setCurrentDose(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedVaccine && Array.from({ length: selectedVaccine.total_doses }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      โดสที่ {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="lastDoseDate">วันที่ฉีดครั้งล่าสุด</Label>
              <Input
                id="lastDoseDate"
                type="date"
                value={lastDoseDate}
                onChange={(e) => setLastDoseDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="reminderDays">แจ้งเตือนก่อน (วัน)</Label>
              <Input
                id="reminderDays"
                type="number"
                min="1"
                max="30"
                value={reminderDays}
                onChange={(e) => setReminderDays(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={calculateNextDose} className="flex-1">
              <Calculator className="h-4 w-4 mr-2" />
              คำนวณโดสถัดไป
            </Button>
            <Button onClick={resetForm} variant="outline">
              รีเซ็ต
            </Button>
          </div>
        </CardContent>
      </Card>

      {calculation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {calculation.isComplete ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Calendar className="h-5 w-5 text-blue-600" />
              )}
              ผลการคำนวณ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {calculation.isComplete ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>ฉีดวัคซีนครบโดสแล้ว!</strong><br />
                  ผู้ป่วยได้รับวัคซีนครบตามกำหนดแล้ว ({currentDose} โดส)
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {calculation.nextDoseNumber}
                    </div>
                    <div className="text-sm text-muted-foreground">โดสถัดไป</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {calculation.nextDoseDate}
                    </div>
                    <div className="text-sm text-muted-foreground">วันที่กำหนด</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {calculation.daysUntilNextDose}
                    </div>
                    <div className="text-sm text-muted-foreground">วันที่เหลือ</div>
                  </div>
                </div>

                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    <strong>การแจ้งเตือน:</strong><br />
                    จะแจ้งเตือนในวันที่ {calculation.reminderDate} ({reminderDays} วันก่อนครบกำหนด)
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={saveToDatabase} 
                  disabled={isLoading} 
                  className="w-full"
                >
                  {isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลและตั้งแจ้งเตือน'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VaccineDoseCalculator;