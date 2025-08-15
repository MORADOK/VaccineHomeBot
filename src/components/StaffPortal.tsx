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
              onClick={exportData} 
              className="h-10 md:h-12 px-3 md:px-6 text-sm md:text-base font-bold bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <Download className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
              <span className="hidden sm:inline">ส่งออกข้อมูل</span>
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