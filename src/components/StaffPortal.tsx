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
      scheduled: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-gray-100 text-gray-800'
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">ระบบจัดการเจ้าหน้าที่</h1>
            <h2 className="text-xl text-muted-foreground">โรงพยาบาลโฮม</h2>
            <p className="text-muted-foreground">จัดการการนัดหมายและการฉีดวัคซีน</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadAppointments} variant="outline" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              โหลดข้อมูลนัดหมาย
            </Button>
            <Button onClick={loadPatients} variant="outline" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              โหลดข้อมูลคนไข้
            </Button>
            <Button onClick={exportData} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              ส่งออกข้อมูล
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">ทั้งหมด</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">รอการยืนยัน</p>
                  <p className="text-2xl font-bold">{stats.scheduled}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">เสร็จสิ้น</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">ยกเลิก</p>
                  <p className="text-2xl font-bold">{stats.cancelled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาด้วยชื่อ, เบอร์โทร, หรือ ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md"
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

        {/* Patient List */}
        {searchTerm && (
          <Card>
            <CardHeader>
              <CardTitle>ผลการค้นหาคนไข้ ({filteredPatients.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredPatients.map((patient) => (
                  <div key={patient.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{patient.name}</h3>
                        <p className="text-sm text-muted-foreground">ID: {patient.id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{patient.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">อีเมล: {patient.email}</span>
                      </div>
                       <div className="flex items-center gap-2">
                         <span className="text-sm">LINE ID: {patient.lineId}</span>
                       </div>
                     </div>

                     <div className="mt-4 pt-4 border-t">
                       <h4 className="text-sm font-medium mb-3">เลือกวัคซีนสำหรับคนไข้</h4>
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => scheduleVaccine(patient, 'flu')}
                           className="text-xs"
                           disabled={isLoading}
                         >
                           วัคซีนไข้หวัดใหญ่
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => scheduleVaccine(patient, 'hep_b')}
                           className="text-xs"
                           disabled={isLoading}
                         >
                           วัคซีนไวรัสตับอักเสบบี
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => scheduleVaccine(patient, 'tetanus')}
                           className="text-xs"
                           disabled={isLoading}
                         >
                           วัคซีนป้องกันบาดทะยัก
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => scheduleVaccine(patient, 'shingles')}
                           className="text-xs"
                           disabled={isLoading}
                         >
                           วัคซีนงูสวัด
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => scheduleVaccine(patient, 'hpv')}
                           className="text-xs"
                           disabled={isLoading}
                         >
                           วัคซีนป้องกันมะเร็งปากมดลูก
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => scheduleVaccine(patient, 'pneumonia')}
                           className="text-xs"
                           disabled={isLoading}
                         >
                           วัคซีนปอดอักเสบ
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => scheduleVaccine(patient, 'chickenpox')}
                           className="text-xs"
                           disabled={isLoading}
                         >
                           วัคซีนอีสุกอีใส
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => scheduleVaccine(patient, 'rabies')}
                           className="text-xs"
                           disabled={isLoading}
                         >
                           วัคซีนพิษสุนัขบ้า
                         </Button>
                       </div>
                     </div>
                   </div>
                ))}

                {filteredPatients.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    ไม่พบข้อมูลคนไข้ที่ตรงกับการค้นหา
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appointments List */}
        <Card>
          <CardHeader>
            <CardTitle>รายการนัดหมาย ({filteredAppointments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{appointment.patient_name}</h3>
                      <p className="text-sm text-muted-foreground">ID: {appointment.appointment_id}</p>
                    </div>
                    <Badge className={getStatusColor(appointment.status)}>
                      {getStatusText(appointment.status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{appointment.patient_phone}</span>
                      {appointment.line_user_id && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          LINE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{appointment.appointment_date} เวลา {appointment.appointment_time}</span>
                    </div>
                    <div>
                      <span className="text-sm">วัคซีน: {appointment.vaccine_type}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {appointment.status === 'scheduled' && (
                      <Button
                        size="sm"
                        onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                        disabled={isLoading}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        เสร็จสิ้น
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendNotification(appointment, `🔔 แจ้งเตือนการนัดหมายฉีดวัคซีน\n\nสวัสดีคุณ ${appointment.patient_name}\n\n📅 วันที่: ${appointment.appointment_date}\n⏰ เวลา: ${appointment.appointment_time}\n💉 วัคซีน: ${appointment.vaccine_type}\n🏥 สถานที่: โรงพยาบาลโฮม\n\nกรุณามาตามเวลานัดหมาย\nหากมีข้อสงสัยสามารถติดต่อโรงพยาบาลได้`)}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      {appointment.line_user_id ? 'ส่ง LINE' : 'ส่งแจ้งเตือน'}
                    </Button>
                    {appointment.status === 'scheduled' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                        disabled={isLoading}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        ยกเลิก
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {filteredAppointments.length === 0 && !searchTerm && (
                <div className="text-center py-8 text-muted-foreground">
                  ไม่พบข้อมูลการนัดหมาย
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