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

const GoogleSheetsIntegration = () => {
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

  // โหลดข้อมูลผู้ป่วยจาก Google Sheets
  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-integration', {
        body: { action: 'readPatients' }
      });

      if (error) throw error;

      setPatients(data.patients || []);
      toast({
        title: "โหลดข้อมูลสำเร็จ",
        description: `โหลดข้อมูลผู้ป่วย ${data.patients?.length || 0} คน`,
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

  // บันทึกการนัดหมาย
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
      const { data, error } = await supabase.functions.invoke('google-sheets-integration', {
        body: { 
          action: 'saveAppointment',
          data: appointment
        }
      });

      if (error) throw error;

      toast({
        title: "บันทึกสำเร็จ",
        description: "บันทึกการนัดหมายเรียบร้อยแล้ว",
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

  // ตั้งค่าการแจ้งเตือน
  const scheduleNotification = async () => {
    if (!appointment.patientId || !appointment.date || !appointment.notificationDate) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอกข้อมูลผู้ป่วยและวันที่นัดก่อน",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const message = `แจ้งเตือน: คุณมีนัดฉีดวัคซีน ${appointment.vaccine} วันที่ ${appointment.date} เวลา ${appointment.time} ที่ ${appointment.hospital}`;
      
      const { data, error } = await supabase.functions.invoke('google-sheets-integration', {
        body: { 
          action: 'scheduleNotification',
          data: {
            patientId: appointment.patientId,
            appointmentDate: appointment.date,
            notificationDate: appointment.notificationDate,
            message
          }
        }
      });

      if (error) throw error;

      toast({
        title: "ตั้งค่าการแจ้งเตือนสำเร็จ",
        description: "ระบบจะแจ้งเตือนผู้ป่วยในวันที่กำหนด",
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

  useEffect(() => {
    loadPatients();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Google Sheets Integration</h1>
        <p className="text-muted-foreground mt-2">
          จัดการข้อมูลผู้ป่วยและการนัดหมายผ่าน Google Sheets
        </p>
      </div>

      {/* ข้อมูลผู้ป่วย */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            ข้อมูลผู้ป่วย
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={loadPatients} disabled={isLoading} className="w-full">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {isLoading ? 'กำลังโหลด...' : 'โหลดข้อมูลจาก Google Sheets'}
          </Button>
          
          {patients.length > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">ผู้ป่วยทั้งหมด: {patients.length} คน</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {patients.map((patient) => (
                  <div key={patient.id} className="text-xs bg-background p-2 rounded">
                    {patient.name} - {patient.phone}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* การนัดหมาย */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            บันทึกการนัดหมาย
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="patient">เลือกผู้ป่วย</Label>
              <Select value={appointment.patientId} onValueChange={handlePatientSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกผู้ป่วย" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name} - {patient.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="vaccine">ประเภทวัคซีน</Label>
              <Select value={appointment.vaccine} onValueChange={(value) => 
                setAppointment(prev => ({ ...prev, vaccine: value }))
              }>
                <SelectTrigger>
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
              <Label htmlFor="date">วันที่นัด</Label>
              <Input
                id="date"
                type="date"
                value={appointment.date}
                onChange={(e) => setAppointment(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="time">เวลา</Label>
              <Input
                id="time"
                type="time"
                value={appointment.time}
                onChange={(e) => setAppointment(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">หมายเหตุ</Label>
            <Textarea
              id="notes"
              placeholder="หมายเหตุเพิ่มเติม"
              value={appointment.notes}
              onChange={(e) => setAppointment(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <Button onClick={saveAppointment} disabled={isLoading} className="w-full">
            บันทึกการนัดหมาย
          </Button>
        </CardContent>
      </Card>

      {/* การแจ้งเตือน */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            ตั้งค่าการแจ้งเตือน
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="notificationDate">วันที่ต้องการแจ้งเตือน</Label>
            <Input
              id="notificationDate"
              type="date"
              value={appointment.notificationDate}
              onChange={(e) => setAppointment(prev => ({ ...prev, notificationDate: e.target.value }))}
            />
          </div>

          <Alert>
            <AlertDescription>
              ระบบจะแจ้งเตือนผู้ป่วยผ่าน LINE ในวันที่กำหนด เพื่อเตือนเรื่องการนัดหมายฉีดวัคซีน
            </AlertDescription>
          </Alert>

          <Button onClick={scheduleNotification} disabled={isLoading} className="w-full">
            ตั้งค่าการแจ้งเตือน
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleSheetsIntegration;