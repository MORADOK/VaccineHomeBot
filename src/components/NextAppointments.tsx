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
  last_dose_date: string;
  first_dose_date?: string;
  completion_status: string;
  line_user_id?: string;
  vaccine_schedule_id?: string;
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
      // Get all patients with completed doses to calculate next appointments
      const { data: completedAppointments, error: apptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'completed')
        .order('appointment_date', { ascending: false });

      if (apptError) throw apptError;

      // Group by patient and vaccine type to get latest doses and calculate actual dose counts
      const patientVaccineMap = new Map();
      
      for (const appt of completedAppointments || []) {
        const key = `${appt.patient_id_number || appt.line_user_id}-${appt.vaccine_type}`;
        
        if (!patientVaccineMap.has(key)) {
          // Count completed doses for this patient and vaccine type
          const completedDoses = completedAppointments.filter(a => 
            (a.patient_id_number === (appt.patient_id_number || appt.line_user_id) || 
             a.line_user_id === (appt.patient_id_number || appt.line_user_id)) &&
            a.vaccine_type === appt.vaccine_type &&
            a.status === 'completed'
          );

          // Find latest dose date
          const latestDose = completedDoses.reduce((latest, current) => 
            new Date(current.appointment_date) > new Date(latest.appointment_date) ? current : latest
          );

          // Find first dose date
          const firstDose = completedDoses.reduce((earliest, current) => 
            new Date(current.appointment_date) < new Date(earliest.appointment_date) ? current : earliest
          );

          patientVaccineMap.set(key, {
            patient_id: appt.patient_id_number || appt.line_user_id,
            patient_name: appt.patient_name,
            line_user_id: appt.line_user_id,
            vaccine_type: appt.vaccine_type,
            doses_received: completedDoses.length,
            latest_date: latestDose.appointment_date,
            first_dose_date: firstDose.appointment_date
          });
        }
      }

      // Calculate next appointments using the database function
      const nextAppointmentPromises = Array.from(patientVaccineMap.values()).map(async (patient) => {
        try {
          const { data, error } = await supabase.rpc('api_next_dose_for_patient', {
            _line_user_id: patient.patient_id,
            _vaccine_type: patient.vaccine_type
          });

          if (error) {
            console.error('Error calculating next dose:', error);
            return null;
          }

          if (data && data.length > 0 && data[0].next_dose_number) {
            const nextDose = data[0];
            return {
              id: `${patient.patient_id}-${patient.vaccine_type}`,
              patient_id: patient.patient_id,
              patient_name: patient.patient_name,
              vaccine_name: nextDose.vaccine_name,
              vaccine_type: nextDose.vaccine_type,
              current_dose: patient.doses_received, // ใช้จำนวนโดสที่คำนวนจากประวัติการฉีดจริง
              total_doses: nextDose.total_doses,
              next_dose_due: nextDose.recommended_date,
              last_dose_date: patient.latest_date, // ใช้วันที่ฉีดเข็มล่าสุดจากประวัติการฉีดจริง
              first_dose_date: patient.first_dose_date,
              completion_status: 'in_progress',
              line_user_id: patient.line_user_id,
              vaccine_schedule_id: nextDose.vaccine_schedule_id
            };
          }
          return null;
        } catch (error) {
          console.error('Error processing patient:', patient.patient_id, error);
          return null;
        }
      });

      const results = await Promise.all(nextAppointmentPromises);
      const validAppointments = results
        .filter(appt => appt !== null)
        .sort((a, b) => new Date(a.next_dose_due).getTime() - new Date(b.next_dose_due).getTime());
      
      setNextAppointments(validAppointments);
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
      const { error } = await supabase.functions.invoke('send-line-message', {
        body: {
          userId: patientTracking.line_user_id,
          message: `🏥 แจ้งเตือนนัดฉีดวัคซีน\n\nคุณ ${patientTracking.patient_name}\nนัดฉีดเข็มที่ ${patientTracking.current_dose + 1} \nวัคซีน: ${patientTracking.vaccine_name}\nวันที่นัด: ${new Date(patientTracking.next_dose_due).toLocaleDateString('th-TH')}\n\nกรุณามาตามนัดตรงเวลา\n\n📍 โรงพยาบาลโฮม`
        }
      });

      if (error) throw error;

      toast({
        title: "ส่งข้อความแล้ว",
        description: `ส่งข้อความแจ้งเตือนไปยัง ${patientTracking.patient_name} แล้ว`,
      });
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถส่งข้อความแจ้งเตือนได้",
        variant: "destructive",
      });
    } finally {
      setSendingReminder(null);
    }
  };

  useEffect(() => {
    loadNextAppointments();
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
            <p className="text-sm text-muted-foreground">รายการผู้ป่วยที่ต้องฉีดเข็มถัดไป</p>
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
                      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        ID: {appointment.patient_id}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => scheduleAppointment(appointment)}
                        disabled={creatingAppointment === appointment.id}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {creatingAppointment === appointment.id ? (
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CalendarPlus className="h-4 w-4 mr-1" />
                        )}
                        {creatingAppointment === appointment.id ? 'กำลังสร้าง...' : 'สร้างนัด'}
                      </Button>
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