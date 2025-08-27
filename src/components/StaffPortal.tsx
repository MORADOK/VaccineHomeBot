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
  id: string;
  vaccine_type: string;
  vaccine_name: string;
}

interface PatientRegistration {
  id: string;
  registration_id: string;
  full_name: string;
  phone: string;
  line_user_id?: string;
  status: string;
}

const StaffPortal = () => {
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [vaccineOptions, setVaccineOptions] = useState<VaccineOption[]>([]);
  const [patientRegistrations, setPatientRegistrations] = useState<PatientRegistration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRegistration | null>(null);
  const [walkInForm, setWalkInForm] = useState({
    vaccineType: '',
    notes: ''
  });
  const { toast } = useToast();

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

  const loadVaccineOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('vaccine_schedules')
        .select('id, vaccine_type, vaccine_name')
        .eq('active', true)
        .order('vaccine_name');

      if (error) throw error;
      setVaccineOptions(data || []);
    } catch (error) {
      console.error('Error loading vaccine options:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลวัคซีนได้",
        variant: "destructive",
      });
    }
  };

  const loadPatientRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('patient_registrations')
        .select('*')
        .eq('status', 'confirmed')
        .order('full_name');

      if (error) throw error;
      setPatientRegistrations(data || []);
    } catch (error) {
      console.error('Error loading patient registrations:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลผู้ป่วยได้",
        variant: "destructive",
      });
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
    if (!selectedPatient || !walkInForm.vaccineType) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกผู้ป่วยและประเภทวัคซีน",
        variant: "destructive",
      });
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);

      const appointmentData = {
        patient_name: selectedPatient.full_name,
        patient_phone: selectedPatient.phone,
        patient_id_number: selectedPatient.registration_id,
        line_user_id: selectedPatient.line_user_id,
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
        description: `บันทึกการฉีดวัคซีนของ ${selectedPatient.full_name} แล้ว`,
      });

      // Reset form
      setSelectedPatient(null);
      setSearchTerm('');
      setWalkInForm({
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
    loadVaccineOptions();
    loadPatientRegistrations();
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
          <div className="space-y-4">
            <div>
              <Label htmlFor="patientSearch">ค้นหาผู้ป่วยที่ลงทะเบียนแล้ว *</Label>
              <div className="relative">
                <Input
                  id="patientSearch"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="กรอกชื่อ หรือเบอร์โทรศัพท์เพื่อค้นหา"
                  className="pr-10"
                />
                {searchTerm && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-background border rounded-b-md shadow-lg max-h-60 overflow-y-auto">
                    {patientRegistrations
                      .filter(patient => 
                        patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        patient.phone.includes(searchTerm) ||
                        patient.registration_id.includes(searchTerm)
                      )
                      .slice(0, 10)
                      .map((patient) => (
                        <div
                          key={patient.id}
                          className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setSearchTerm('');
                          }}
                        >
                          <div className="font-medium text-foreground">{patient.full_name}</div>
                          <div className="text-sm text-muted-foreground flex items-center justify-between">
                            <span>โทร: {patient.phone}</span>
                            <span className="text-xs">ID: {patient.registration_id}</span>
                          </div>
                        </div>
                      ))
                    }
                    {patientRegistrations.filter(patient => 
                      patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      patient.phone.includes(searchTerm) ||
                      patient.registration_id.includes(searchTerm)
                    ).length === 0 && (
                      <div className="p-3 text-center text-muted-foreground">
                        ไม่พบผู้ป่วยที่ตรงกับการค้นหา
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <SelectItem key={vaccine.id} value={vaccine.vaccine_type}>
                        {vaccine.vaccine_name}
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