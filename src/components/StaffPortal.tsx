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
  patientName: string;
  phone: string;
  vaccineType: string;
  date: string;
  time: string;
  hospital: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  registrationDate: string;
}

const StaffPortal = () => {
  const [webhookUrl, setWebhookUrl] = useState('https://firstprojecthome.onrender.com/webhook-test/Webhook-Vaccine');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

  // Load sample appointments data
  useEffect(() => {
    const sampleAppointments: Appointment[] = [
      {
        id: 'HOM-001',
        patientName: 'นาย สมชาย ใจดี',
        phone: '081-234-5678',
        vaccineType: 'Pfizer-BioNTech',
        date: '2024-01-15',
        time: '09:00',
        hospital: 'โรงพยาบาลโฮม',
        status: 'pending',
        registrationDate: '2024-01-10'
      },
      {
        id: 'HOM-002',
        patientName: 'นางสาว มานี สบายดี',
        phone: '082-345-6789',
        vaccineType: 'Moderna',
        date: '2024-01-15',
        time: '10:00',
        hospital: 'โรงพยาบาลโฮม',
        status: 'confirmed',
        registrationDate: '2024-01-11'
      },
      {
        id: 'HOM-003',
        patientName: 'นาง สุดา รักสุข',
        phone: '083-456-7890',
        vaccineType: 'AstraZeneca',
        date: '2024-01-14',
        time: '14:00',
        hospital: 'โรงพยาบาลโฮม',
        status: 'completed',
        registrationDate: '2024-01-09'
      }
    ];
    setAppointments(sampleAppointments);
    
    // Auto-load patients on component mount
    loadPatients();
  }, []);

  const updateAppointmentStatus = async (id: string, newStatus: Appointment['status']) => {
    setIsLoading(true);
    try {
      // Update local state
      setAppointments(prev => 
        prev.map(apt => apt.id === id ? { ...apt, status: newStatus } : apt)
      );

      // Send to n8n if webhook is configured
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'status_update',
            data: {
              appointmentId: id,
              newStatus,
              updatedBy: 'staff',
              timestamp: new Date().toISOString()
            }
          }),
        });
      }

      toast({
        title: "อัพเดทสถานะสำเร็จ",
        description: `เปลี่ยนสถานะเป็น ${getStatusText(newStatus)} แล้ว`,
      });
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัพเดทสถานะได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendNotification = async (appointment: Appointment, message: string) => {
    if (!webhookUrl) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณากรอก Webhook URL ก่อน",
        variant: "destructive",
      });
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'send_notification',
          data: {
            phone: appointment.phone,
            message,
            appointmentId: appointment.id,
            timestamp: new Date().toISOString()
          }
        }),
      });

      toast({
        title: "ส่งแจ้งเตือนสำเร็จ",
        description: `ส่งข้อความไปยัง ${appointment.phone} แล้ว`,
      });
    } catch (error) {
      toast({
        title: "ส่งแจ้งเตือนไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการส่งข้อความ",
        variant: "destructive",
      });
    }
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      pending: 'รอการยืนยัน',
      confirmed: 'ยืนยันแล้ว',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apt.phone.includes(searchTerm) ||
                         apt.id.toLowerCase().includes(searchTerm.toLowerCase());
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
    pending: appointments.filter(apt => apt.status === 'pending').length,
    confirmed: appointments.filter(apt => apt.status === 'confirmed').length,
    completed: appointments.filter(apt => apt.status === 'completed').length,
  };

  const scheduleVaccine = async (patient: Patient, vaccineType: string) => {
    setIsLoading(true);
    try {
      // Generate new appointment ID
      const newId = `HOM-${String(appointments.length + 1).padStart(3, '0')}`;
      
      // Create new appointment
      const newAppointment: Appointment = {
        id: newId,
        patientName: patient.name,
        phone: patient.phone,
        vaccineType,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        time: '09:00',
        hospital: 'โรงพยาบาลโฮม',
        status: 'pending',
        registrationDate: new Date().toISOString().split('T')[0]
      };

      // Add to appointments list first (so it shows even if webhook fails)
      setAppointments(prev => [...prev, newAppointment]);

      // Try to send to webhook if configured
      if (webhookUrl) {
        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'no-cors', // Handle CORS issues
            body: JSON.stringify({
              type: 'vaccine_scheduled',
              data: {
                appointmentId: newId,
                patient,
                vaccineType,
                scheduledBy: 'staff',
                timestamp: new Date().toISOString()
              }
            }),
          });
          
          console.log('Webhook sent successfully');
        } catch (webhookError) {
          console.warn('Webhook failed but appointment was created:', webhookError);
          // Don't throw error - appointment was still created locally
        }
      }

      toast({
        title: "สร้างนัดหมายสำเร็จ",
        description: `นัดหมายฉีดวัคซีน ${vaccineType} สำหรับ ${patient.name} เรียบร้อยแล้ว (ID: ${newId})`,
      });
    } catch (error) {
      console.error('Failed to create appointment:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างนัดหมายได้ กรุณาลองใหม่",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = () => {
    const csv = [
      'ID,ชื่อผู้ป่วย,เบอร์โทร,วัคซีน,วันที่,เวลา,โรงพยาบาล,สถานะ,วันที่ลงทะเบียน',
      ...filteredAppointments.map(apt => 
        `${apt.id},${apt.patientName},${apt.phone},${apt.vaccineType},${apt.date},${apt.time},${apt.hospital},${getStatusText(apt.status)},${apt.registrationDate}`
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

        {/* Webhook Configuration 
        <Card>
          <CardHeader>
            <CardTitle>เชื่อมต่อระบบ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="webhook">n8n Webhook URL</Label>
                <Input
                  id="webhook"
                  placeholder="https://your-n8n.render.com/webhook/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>*/}

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
                  <p className="text-sm font-medium text-muted-foreground">รอยืนยัน</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">ยืนยันแล้ว</p>
                  <p className="text-2xl font-bold">{stats.confirmed}</p>
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
                <option value="pending">รอยืนยัน</option>
                <option value="confirmed">ยืนยันแล้ว</option>
                <option value="completed">เสร็จสิ้น</option>
                <option value="cancelled">ยกเลิก</option>
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
                         >
                           วัคซีนไข้หวัดใหญ่
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => scheduleVaccine(patient, 'hep_b')}
                           className="text-xs"
                         >
                           วัคซีนไวรัสตับอักเสบบี
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => scheduleVaccine(patient, 'tetanus')}
                           className="text-xs"
                         >
                           วัคซีนป้องกันบาดทะยัก
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => scheduleVaccine(patient, 'shingles')}
                           className="text-xs"
                         >
                           วัคซีนงูสวัด
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => scheduleVaccine(patient, 'hpv')}
                           className="text-xs"
                         >
                           วัคซีนป้องกันมะเร็งปากมดลูก
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => scheduleVaccine(patient, 'pneumonia')}
                           className="text-xs"
                         >
                           วัคซีนปอดอักเสบ
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => scheduleVaccine(patient, 'chickenpox')}
                           className="text-xs"
                         >
                           วัคซีนอีสุกอีใส
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => scheduleVaccine(patient, 'rabies')}
                           className="text-xs"
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
                      <h3 className="font-semibold text-lg">{appointment.patientName}</h3>
                      <p className="text-sm text-muted-foreground">ID: {appointment.id}</p>
                    </div>
                    <Badge className={getStatusColor(appointment.status)}>
                      {getStatusText(appointment.status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{appointment.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{appointment.date} เวลา {appointment.time}</span>
                    </div>
                    <div>
                      <span className="text-sm">{appointment.hospital}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {appointment.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                        disabled={isLoading}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        ยืนยัน
                      </Button>
                    )}
                    {appointment.status === 'confirmed' && (
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
                      onClick={() => sendNotification(appointment, `สวัสดีคุณ ${appointment.patientName} นี่คือการแจ้งเตือนการนัดหมายฉีดวัคซีนของคุณ วันที่ ${appointment.date} เวลา ${appointment.time} ที่ ${appointment.hospital}`)}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      ส่งแจ้งเตือน
                    </Button>
                    {appointment.status !== 'cancelled' && (
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
