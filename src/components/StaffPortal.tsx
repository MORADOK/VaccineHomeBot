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
  RefreshCw
} from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  lineId: string;
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

const StaffPortal = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

  // Load data on component mount
  useEffect(() => {
    loadAppointments();
    loadPatients();
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
      // ส่งผ่าน LINE Bot API ถ้ามี LINE User ID
      if (appointment.line_user_id) {
        const { error: lineError } = await supabase.functions.invoke('send-line-message', {
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

        if (lineError) {
          console.error('LINE API Error:', lineError);
          // ยังคงสร้าง notification record แม้ว่า LINE message จะส่งไม่สำเร็จ
        }
      }

      // บันทึก notification record ในฐานข้อมูล
      const { error } = await supabase
        .from('appointment_notifications')
        .insert({
          appointment_id: appointment.id,
          notification_type: 'reminder',
          sent_to: appointment.patient_phone || '',
          line_user_id: appointment.line_user_id,
          message_content: message,
          status: appointment.line_user_id ? 'sent' : 'pending'
        });

      if (error) throw error;

      toast({
        title: "ส่งแจ้งเตือนสำเร็จ",
        description: appointment.line_user_id 
          ? `ส่งข้อความ LINE ไปยัง ${appointment.patient_name} แล้ว`
          : `บันทึกข้อความสำหรับ ${appointment.patient_name} แล้ว (ไม่มี LINE ID)`,
      });
    } catch (error: any) {
      toast({
        title: "ส่งแจ้งเตือนไม่สำเร็จ",
        description: error.message || "เกิดข้อผิดพลาดในการส่งข้อความ",
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
      scheduled: 'bg-status-scheduled/10 text-status-scheduled border-status-scheduled/20',
      completed: 'bg-status-completed/10 text-status-completed border-status-completed/20',
      cancelled: 'bg-status-cancelled/10 text-status-cancelled border-status-cancelled/20',
      no_show: 'bg-muted text-muted-foreground border-border'
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-muted text-muted-foreground border-border';
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Modern Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-soft border border-green-100">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-medical-secondary bg-clip-text text-transparent">
                ระบบจัดการเจ้าหน้าที่
              </h1>
              <h2 className="text-xl text-medical-neutral font-medium">โรงพยาบาลโฮม</h2>
              <p className="text-muted-foreground">จัดการการนัดหมายและการฉีดวัคซีนอย่างมีประสิทธิภาพ</p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={loadAppointments} 
                variant="outline" 
                disabled={isLoading}
                className="hover:bg-green-50 hover:border-primary transition-all duration-300"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                โหลดนัดหมาย
              </Button>
              <Button 
                onClick={loadPatients} 
                variant="outline" 
                disabled={isLoading}
                className="hover:bg-green-50 hover:border-primary transition-all duration-300"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                โหลดคนไข้
              </Button>
              <Button 
                onClick={exportData} 
                className="bg-primary hover:bg-primary/90 shadow-medium hover:shadow-large transition-all duration-300"
              >
                <Download className="h-4 w-4 mr-2" />
                ส่งออกข้อมูล
              </Button>
            </div>
          </div>
        </div>

        {/* Modern Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-card border-0 shadow-soft hover:shadow-medium transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-medical-info/20 to-medical-info/10 rounded-xl">
                  <Users className="h-6 w-6 text-medical-info" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">ทั้งหมด</p>
                  <p className="text-3xl font-bold text-foreground">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-soft hover:shadow-medium transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-status-scheduled/20 to-status-scheduled/10 rounded-xl">
                  <Clock className="h-6 w-6 text-status-scheduled" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">รอการยืนยัน</p>
                  <p className="text-3xl font-bold text-foreground">{stats.scheduled}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-soft hover:shadow-medium transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-status-completed/20 to-status-completed/10 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-status-completed" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">เสร็จสิ้น</p>
                  <p className="text-3xl font-bold text-foreground">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-soft hover:shadow-medium transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-status-cancelled/20 to-status-cancelled/10 rounded-xl">
                  <XCircle className="h-6 w-6 text-status-cancelled" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">ยกเลิก</p>
                  <p className="text-3xl font-bold text-foreground">{stats.cancelled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modern Search and Filter */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-soft">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาด้วยชื่อ, เบอร์โทร, หรือ ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 py-3 rounded-xl border-green-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                  />
                </div>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 border border-green-200 rounded-xl bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="scheduled">รอการยืนยัน</option>
                <option value="completed">เสร็จสิ้น</option>
                <option value="cancelled">ยกเลิก</option>
                <option value="no_show">ไม่มาตามนัด</option>
              </select>
            </div>
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

        {/* Modern Appointments List */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-soft">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-foreground">
              รายการนัดหมาย ({filteredAppointments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <div key={appointment.id} className="bg-gradient-card rounded-xl p-6 border border-green-100 shadow-soft hover:shadow-medium transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">{appointment.patient_name}</h3>
                      <p className="text-sm text-muted-foreground">ID: {appointment.appointment_id}</p>
                    </div>
                    <Badge className={`${getStatusColor(appointment.status)} border font-medium px-3 py-1`}>
                      {getStatusText(appointment.status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-center gap-3 bg-green-50 rounded-lg p-3">
                      <Phone className="h-5 w-5 text-primary" />
                      <span className="font-medium">{appointment.patient_phone}</span>
                      {appointment.line_user_id && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full border border-primary/20 font-medium">
                          LINE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 bg-green-50 rounded-lg p-3">
                      <Calendar className="h-5 w-5 text-primary" />
                      <span className="font-medium">{appointment.appointment_date} เวลา {appointment.appointment_time}</span>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <span className="text-sm font-medium">วัคซีน: {appointment.vaccine_type}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    {appointment.status === 'scheduled' && (
                      <Button
                        size="sm"
                        onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                        disabled={isLoading}
                        className="bg-status-completed hover:bg-status-completed/90 text-white shadow-medium hover:shadow-large transition-all duration-300"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        เสร็จสิ้น
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendNotification(appointment, `🔔 แจ้งเตือนการนัดหมายฉีดวัคซีน\n\nสวัสดีคุณ ${appointment.patient_name}\n\n📅 วันที่: ${appointment.appointment_date}\n⏰ เวลา: ${appointment.appointment_time}\n💉 วัคซีน: ${appointment.vaccine_type}\n🏥 สถานที่: โรงพยาบาลโฮม\n\nกรุณามาตามเวลานัดหมาย\nหากมีข้อสงสัยสามารถติดต่อโรงพยาบาลได้`)}
                      className="hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {appointment.line_user_id ? 'ส่ง LINE' : 'ส่งแจ้งเตือน'}
                    </Button>
                    {appointment.status === 'scheduled' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                        disabled={isLoading}
                        className="border-status-cancelled text-status-cancelled hover:bg-status-cancelled hover:text-white transition-all duration-300"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        ยกเลิก
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {filteredAppointments.length === 0 && !searchTerm && (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">ไม่พบข้อมูลการนัดหมาย</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffPortal;