import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Users, Bell, FileSpreadsheet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface PatientData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  lineId?: string;
}

interface AppointmentData {
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  vaccine: string;
  hospital: string;
  notes?: string;
  notificationDate?: string;
}

const PatientAppointmentManager = () => {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appointment, setAppointment] = useState<AppointmentData>({
    patientId: '',
    patientName: '',
    date: '',
    time: '',
    vaccine: '',
    hospital: 'โรงพยาบาลโฮม',
    notes: '',
    notificationDate: ''
  });
  const { toast } = useToast();

  // โหลดข้อมูลผู้ป่วยจาก Supabase และ Sync ไป Google Sheets
  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_registrations')
        .select('id, full_name, phone, line_user_id, registration_id, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPatients = data?.map(patient => ({
        id: patient.registration_id || patient.id,
        name: patient.full_name,
        phone: patient.phone,
        lineId: patient.line_user_id,
        createdAt: patient.created_at
      })) || [];

      setPatients(formattedPatients);
      toast({
        title: "โหลดข้อมูลสำเร็จ",
        description: `โหลดข้อมูลผู้ป่วย ${formattedPatients.length} คน จาก Supabase`,
      });
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

  // Sync ข้อมูลผู้ป่วยไป Google Sheets
  const syncPatientsToSheets = async () => {
    if (patients.length === 0) {
      toast({
        title: "ไม่มีข้อมูล",
        description: "กรุณาโหลดข้อมูลผู้ป่วยก่อน",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-integration', {
        body: { 
          action: 'syncPatients',
          data: patients
        }
      });

      if (error) throw error;

      toast({
        title: "Sync สำเร็จ",
        description: `Sync ข้อมูลผู้ป่วย ${patients.length} คน ไป Google Sheets แล้ว`,
      });
    } catch (error: any) {
      toast({
        title: "Sync ไม่สำเร็จ",
        description: error.message || "ไม่สามารถ sync ข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // บันทึกการนัดหมายลง Supabase และ Google Sheets
  const saveAppointment = async () => {
    if (!appointment.patientId || !appointment.date || !appointment.time || !appointment.vaccine) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกข้อมูลให้ครบถ้วน",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // หาข้อมูลผู้ป่วย
      const selectedPatient = patients.find(p => p.id === appointment.patientId);
      if (!selectedPatient) {
        throw new Error('ไม่พบข้อมูลผู้ป่วย');
      }

      // 1. บันทึกลงตาราง appointments ใน Supabase (หลัก)
      const appointmentData = {
        patient_name: selectedPatient.name,
        patient_phone: selectedPatient.phone,
        patient_id_number: appointment.patientId,
        line_user_id: selectedPatient.lineId,
        vaccine_type: appointment.vaccine,
        appointment_date: appointment.date,
        appointment_time: appointment.time,
        status: 'scheduled',
        notes: appointment.notes || `นัดหมายจาก ${appointment.hospital}`,
        scheduled_by: 'staff_manual'
      };

      const { error: supabaseError } = await supabase
        .from('appointments')
        .insert([appointmentData]);

      if (supabaseError) throw supabaseError;

      // 2. Sync ข้อมูลไป Google Sheets (สำรอง)
      try {
        await supabase.functions.invoke('google-sheets-integration', {
          body: { 
            action: 'saveAppointment',
            data: {
              ...appointment,
              patientName: selectedPatient.name,
              patientPhone: selectedPatient.phone,
              lineId: selectedPatient.lineId,
              timestamp: new Date().toISOString()
            }
          }
        });
        console.log('✅ Synced to Google Sheets successfully');
      } catch (syncError) {
        console.warn('⚠️ Failed to sync to Google Sheets:', syncError);
        // ไม่ให้ sync error หยุดการทำงานหลัก
      }

      toast({
        title: "บันทึกสำเร็จ",
        description: `บันทึกการนัดหมายของ ${selectedPatient.name} เรียบร้อยแล้ว (พร้อม sync ข้อมูลสำรอง)`,
      });

      // รีเซ็ตฟอร์ม
      setAppointment({
        patientId: '',
        patientName: '',
        date: '',
        time: '',
        vaccine: '',
        hospital: 'โรงพยาบาลโฮม',
        notes: '',
        notificationDate: ''
      });
    } catch (error: any) {
      toast({
        title: "ข้อผิดพลาด",
        description: error.message || "ไม่สามารถบันทึกได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ส่งการแจ้งเตือนทันที
  const sendNotification = async () => {
    if (!appointment.patientId || !appointment.date) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกข้อมูลผู้ป่วยและวันที่นัดก่อน",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const selectedPatient = patients.find(p => p.id === appointment.patientId);
      if (!selectedPatient || !selectedPatient.lineId) {
        throw new Error('ไม่พบ LINE ID ของผู้ป่วย');
      }

      const message = `🔔 แจ้งเตือนการนัดหมายฉีดวัคซีน

สวัสดีคุณ ${selectedPatient.name}

📅 วันที่: ${appointment.date}
⏰ เวลา: ${appointment.time}
💉 วัคซีน: ${appointment.vaccine}
🏥 สถานที่: ${appointment.hospital}

${appointment.notes ? `📝 หมายเหตุ: ${appointment.notes}` : ''}

กรุณามาตามเวลานัดหมาย`;

      const { error } = await supabase.functions.invoke('send-line-message', {
        body: {
          userId: selectedPatient.lineId,
          message: message
        }
      });

      if (error) throw error;

      toast({
        title: "ส่งการแจ้งเตือนสำเร็จ",
        description: `ส่งข้อความแจ้งเตือนไปยัง ${selectedPatient.name} แล้ว`,
      });
    } catch (error: any) {
      toast({
        title: "ข้อผิดพลาด",
        description: error.message || "ไม่สามารถตั้งค่าการแจ้งเตือนได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientSelect = (patientId: string) => {
    const selectedPatient = patients.find(p => p.id === patientId);
    if (selectedPatient) {
      setAppointment(prev => ({
        ...prev,
        patientId,
        patientName: selectedPatient.name
      }));
    }
  };

  // Sync ข้อมูลนัดหมายที่มีอยู่แล้วไป Google Sheets
  const syncExistingAppointments = async () => {
    setIsLoading(true);
    try {
      // ดึงข้อมูลนัดหมายจาก Supabase
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // จำกัดที่ 100 รายการล่าสุด

      if (error) throw error;

      if (!appointments || appointments.length === 0) {
        toast({
          title: "ไม่มีข้อมูล",
          description: "ไม่พบข้อมูลนัดหมายที่จะ sync",
          variant: "destructive",
        });
        return;
      }

      // Sync ไป Google Sheets
      const { error: syncError } = await supabase.functions.invoke('google-sheets-integration', {
        body: { 
          action: 'syncAppointments',
          data: appointments
        }
      });

      if (syncError) throw syncError;

      toast({
        title: "Sync สำเร็จ",
        description: `Sync ข้อมูลนัดหมาย ${appointments.length} รายการ ไป Google Sheets แล้ว`,
      });
    } catch (error: any) {
      toast({
        title: "Sync ไม่สำเร็จ",
        description: error.message || "ไม่สามารถ sync ข้อมูลนัดหมายได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ข้อมูลผู้ป่วย */}
      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Users className="h-5 w-5 text-primary" />
            ข้อมูลผู้ป่วยจาก Supabase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button onClick={loadPatients} disabled={isLoading} className="h-10 md:h-11">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {isLoading ? 'กำลังโหลด...' : 'โหลดข้อมูลผู้ป่วย'}
            </Button>
            <Button 
              onClick={syncPatientsToSheets} 
              disabled={isLoading || patients.length === 0} 
              variant="outline" 
              className="h-10 md:h-11"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {isLoading ? 'กำลัง Sync...' : 'Sync ไป Google Sheets'}
            </Button>
          </div>

          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              <strong>ระบบ Dual Backup:</strong> ข้อมูลจะถูกบันทึกใน Supabase (หลัก) และ sync ไป Google Sheets (สำรอง) 
              เพื่อความปลอดภัยและการเข้าถึงที่สะดวก
            </AlertDescription>
          </Alert>
          
          {patients.length > 0 && (
            <div className="bg-muted/50 p-3 md:p-4 rounded-lg border">
              <p className="text-sm md:text-base font-medium mb-3">ผู้ป่วยทั้งหมด: {patients.length} คน</p>
              <div className="max-h-32 md:max-h-40 overflow-y-auto space-y-2">
                {patients.map((patient) => (
                  <div key={patient.id} className="text-xs md:text-sm bg-background p-2 md:p-3 rounded border border-border/30">
                    <div className="font-medium">{patient.name}</div>
                    <div className="text-muted-foreground">{patient.phone}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* การนัดหมาย */}
      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Calendar className="h-5 w-5 text-primary" />
            บันทึกการนัดหมาย
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="patient" className="text-sm md:text-base font-medium">เลือกผู้ป่วย</Label>
              <Select value={appointment.patientId} onValueChange={handlePatientSelect}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="เลือกผู้ป่วย" />
                </SelectTrigger>
                <SelectContent>
                  {patients
                    .filter(patient => patient.id && patient.id.trim() !== '')
                    .map((patient) => (
                      <SelectItem 
                        key={patient.id} 
                        value={patient.id}
                      >
                        {patient.name} - {patient.phone}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="vaccine" className="text-sm md:text-base font-medium">ประเภทวัคซีน</Label>
              <Select value={appointment.vaccine} onValueChange={(value) => 
                setAppointment(prev => ({ ...prev, vaccine: value }))
              }>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="เลือกประเภทวัคซีน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COVID-19">COVID-19</SelectItem>
                  <SelectItem value="ไข้หวัดใหญ่">ไข้หวัดใหญ่</SelectItem>
                  <SelectItem value="โควิด + ไข้หวัดใหญ่">โควิด + ไข้หวัดใหญ่</SelectItem>
                  <SelectItem value="HPV">HPV</SelectItem>
                  <SelectItem value="MMR">MMR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date" className="text-sm md:text-base font-medium">วันที่นัด</Label>
              <Input
                id="date"
                type="date"
                value={appointment.date}
                onChange={(e) => setAppointment(prev => ({ ...prev, date: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="time" className="text-sm md:text-base font-medium">เวลา</Label>
              <Input
                id="time"
                type="time"
                value={appointment.time}
                onChange={(e) => setAppointment(prev => ({ ...prev, time: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="text-sm md:text-base font-medium">หมายเหตุ</Label>
            <Textarea
              id="notes"
              placeholder="หมายเหตุเพิ่มเติม"
              value={appointment.notes}
              onChange={(e) => setAppointment(prev => ({ ...prev, notes: e.target.value }))}
              className="mt-1 min-h-[80px] md:min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button onClick={saveAppointment} disabled={isLoading} className="h-10 md:h-11">
              <Calendar className="h-4 w-4 mr-2" />
              {isLoading ? 'กำลังบันทึก...' : 'บันทึกการนัดหมาย'}
            </Button>
            <Button 
              onClick={syncExistingAppointments} 
              disabled={isLoading} 
              variant="outline" 
              className="h-10 md:h-11"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {isLoading ? 'กำลัง Sync...' : 'Sync นัดหมายทั้งหมด'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* การแจ้งเตือน */}
      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Bell className="h-5 w-5 text-primary" />
            ส่งการแจ้งเตือน
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div>
            <Label htmlFor="notificationDate" className="text-sm md:text-base font-medium">วันที่ต้องการแจ้งเตือน</Label>
            <Input
              id="notificationDate"
              type="date"
              value={appointment.notificationDate}
              onChange={(e) => setAppointment(prev => ({ ...prev, notificationDate: e.target.value }))}
              className="mt-1"
            />
          </div>

          <Alert>
            <Bell className="h-4 w-4" />
            <AlertDescription className="text-sm md:text-base">
              ระบบจะแจ้งเตือนผู้ป่วยผ่าน LINE ในวันที่กำหนด เพื่อเตือนเรื่องการนัดหมายฉีดวัคซีน
            </AlertDescription>
          </Alert>

          <Button onClick={sendNotification} disabled={isLoading} className="w-full h-10 md:h-11">
            <Bell className="h-4 w-4 mr-2" />
            {isLoading ? 'กำลังส่ง...' : 'ส่งการแจ้งเตือนทันที'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientAppointmentManager;