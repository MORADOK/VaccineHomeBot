import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  Plus,
  Stethoscope,
  TrendingUp,
  Activity,
  Syringe,
  UserPlus
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Appointment {
  id: string;
  appointment_id: string;
  patient_name: string;
  patient_phone?: string;
  patient_id_number?: string;
  vaccine_type: string;
  appointment_date: string;
  appointment_time?: string;
  status: string;
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
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    patientName: '',
    patientPhone: '',
    vaccineType: '',
    notes: ''
  });
  const { toast } = useToast();

  const vaccineOptions: VaccineOption[] = [
    { type: 'COVID-19', name: 'วัคซีนโควิด-19' },
    { type: 'Influenza', name: 'วัคซีนไข้หวัดใหญ่' },
    { type: 'Hepatitis B', name: 'วัคซีนไวรัสตับอักเสบบี' },
    { type: 'HPV', name: 'วัคซีนป้องกันมะเร็งปากมดลูก' },
    { type: 'Pneumococcal', name: 'วัคซีนป้องกันปอดบวม' },
    { type: 'Tdap', name: 'วัคซีนคอตีบ-ไอกรน-บาดทะยัก' }
  ];

  const loadTodayAppointments = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_date', today)
        .order('appointment_time', { ascending: true });

      if (error) throw error;
      setTodayAppointments(data || []);
    } catch (error) {
      console.error('Error loading today appointments:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลนัดหมายวันนี้ได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('appointment_id', appointmentId);

      if (error) throw error;

      toast({
        title: "อัปเดตสำเร็จ",
        description: `อัปเดตสถานะนัดหมายเป็น ${getStatusText(status)} แล้ว`,
      });

      loadTodayAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตสถานะได้",
        variant: "destructive",
      });
    }
  };

  const createWalkInVaccination = async () => {
    if (!walkInForm.patientName || !walkInForm.patientPhone || !walkInForm.vaccineType) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกข้อมูลให้ครบถ้วน",
        variant: "destructive",
      });
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);

      const appointmentData = {
        patient_name: walkInForm.patientName,
        patient_phone: walkInForm.patientPhone,
        vaccine_type: walkInForm.vaccineType,
        appointment_date: today,
        appointment_time: currentTime,
        status: 'completed',
        scheduled_by: 'walk_in',
        notes: `ฉีดวัคซีน Walk-in วันนี้ ${walkInForm.notes ? '- ' + walkInForm.notes : ''}`
      };

      const { error } = await supabase
        .from('appointments')
        .insert([appointmentData]);

      if (error) throw error;

      toast({
        title: "บันทึกสำเร็จ",
        description: `บันทึกการฉีดวัคซีน Walk-in ของ ${walkInForm.patientName} แล้ว`,
      });

      // Reset form
      setWalkInForm({
        patientName: '',
        patientPhone: '',
        vaccineType: '',
        notes: ''
      });

      loadTodayAppointments();
    } catch (error) {
      console.error('Error creating walk-in vaccination:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการฉีดวัคซีนได้",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadTodayAppointments();
  }, []);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'นัดหมาย';
      case 'completed': return 'เสร็จสิ้น';
      case 'cancelled': return 'ยกเลิก';
      case 'no_show': return 'ไม่มา';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'no_show': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'no_show': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const completedToday = todayAppointments.filter(a => a.status === 'completed').length;
  const scheduledToday = todayAppointments.filter(a => a.status === 'scheduled').length;
  const totalToday = todayAppointments.length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Stethoscope className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Staff Portal</h1>
            <p className="text-sm text-muted-foreground">
              จัดการนัดหมายและการฉีดวัคซีน - วันที่ {new Date().toLocaleDateString('th-TH')}
            </p>
          </div>
        </div>
        <Button onClick={loadTodayAppointments} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">นัดหมายวันนี้</p>
                <p className="text-2xl font-bold text-blue-600">{totalToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ฉีดแล้ว</p>
                <p className="text-2xl font-bold text-green-600">{completedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">รอฉีด</p>
                <p className="text-2xl font-bold text-yellow-600">{scheduledToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">อัตราสำเร็จ</p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Walk-in Vaccination Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            บันทึกการฉีดวัคซีน Walk-in
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="patientName">ชื่อผู้ป่วย *</Label>
              <Input
                id="patientName"
                value={walkInForm.patientName}
                onChange={(e) => setWalkInForm({ ...walkInForm, patientName: e.target.value })}
                placeholder="กรุณากรอกชื่อ-สกุล"
              />
            </div>
            <div>
              <Label htmlFor="patientPhone">เบอร์โทรศัพท์ *</Label>
              <Input
                id="patientPhone"
                value={walkInForm.patientPhone}
                onChange={(e) => setWalkInForm({ ...walkInForm, patientPhone: e.target.value })}
                placeholder="เบอร์โทรศัพท์"
              />
            </div>
            <div>
              <Label htmlFor="vaccineType">ประเภทวัคซีน *</Label>
              <Select
                value={walkInForm.vaccineType}
                onValueChange={(value) => setWalkInForm({ ...walkInForm, vaccineType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภทวัคซีน" />
                </SelectTrigger>
                <SelectContent>
                  {vaccineOptions.map((vaccine) => (
                    <SelectItem key={vaccine.type} value={vaccine.type}>
                      {vaccine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">หมายเหตุ</Label>
              <Input
                id="notes"
                value={walkInForm.notes}
                onChange={(e) => setWalkInForm({ ...walkInForm, notes: e.target.value })}
                placeholder="หมายเหตุเพิ่มเติม"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={createWalkInVaccination} className="bg-green-600 hover:bg-green-700">
              <Syringe className="h-4 w-4 mr-2" />
              บันทึกการฉีดวัคซีน
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Appointments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              นัดหมายวันนี้
            </CardTitle>
            <Badge variant="secondary">
              {todayAppointments.length} รายการ
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todayAppointments.map((appointment) => (
              <div key={appointment.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{appointment.patient_name}</h3>
                      <Badge className={getStatusColor(appointment.status)}>
                        {getStatusIcon(appointment.status)}
                        <span className="ml-1">{getStatusText(appointment.status)}</span>
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Syringe className="h-4 w-4" />
                        {appointment.vaccine_type}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {appointment.appointment_time || 'ไม่ระบุเวลา'}
                      </div>
                      {appointment.patient_phone && (
                        <div className="flex items-center gap-2">
                          <span>📞</span>
                          {appointment.patient_phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span>🆔</span>
                        {appointment.appointment_id}
                      </div>
                    </div>
                    {appointment.notes && (
                      <p className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        {appointment.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {appointment.status === 'scheduled' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateAppointmentStatus(appointment.appointment_id, 'completed')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          ฉีดแล้ว
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAppointmentStatus(appointment.appointment_id, 'no_show')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          ไม่มา
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {todayAppointments.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">ไม่มีนัดหมายวันนี้</p>
              <p className="text-sm text-muted-foreground mt-2">
                ใช้ฟอร์มด้านบนสำหรับบันทึกการฉีดวัคซีน Walk-in
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffPortal;