import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Syringe, 
  Calendar, 
  Bell, 
  Search,
  Plus,
  Edit,
  Send,
  CheckCircle,
  Clock,
  UserCheck,
  FileText
} from 'lucide-react';

interface Patient {
  id: string;
  lineUserId: string;
  displayName: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  registeredAt: string;
  status: 'pending' | 'completed' | 'cancelled';
}

interface VaccineType {
  id: string;
  name: string;
  doses: number;
  interval: number;
  description: string;
  available: boolean;
}

interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  vaccineId: string;
  vaccineName: string;
  doseNumber: number;
  totalDoses: number;
  appointmentDate: string;
  appointmentTime: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  createdAt: string;
  staffId: string;
}

const StaffDashboard = () => {
  const [activeTab, setActiveTab] = useState('patients');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const { toast } = useToast();

  // ข้อมูลวัคซีนที่มี
  const vaccineTypes: VaccineType[] = [
    {
      id: 'covid-19',
      name: 'วัคซีนโควิด-19',
      doses: 2,
      interval: 21,
      description: 'วัคซีนป้องกันโควิด-19 ต้องฉีด 2 โดส ห่างกัน 21 วัน',
      available: true
    },
    {
      id: 'influenza',
      name: 'วัคซีนไข้หวัดใหญ่',
      doses: 1,
      interval: 0,
      description: 'วัคซีนป้องกันไข้หวัดใหญ่ประจำปี ฉีด 1 โดส',
      available: true
    },
    {
      id: 'hepatitis-b',
      name: 'วัคซีนไวรัสตับอักเสบบี',
      doses: 3,
      interval: 30,
      description: 'วัคซีนป้องกันไวรัสตับอักเสบบี ต้องฉีด 3 โดส',
      available: true
    },
    {
      id: 'hpv',
      name: 'วัคซีน HPV',
      doses: 2,
      interval: 60,
      description: 'วัคซีนป้องกันมะเร็งปากมดลูก ฉีด 2 โดส ห่างกัน 60 วัน',
      available: true
    }
  ];

  // จำลองข้อมูลคนไข้ที่ลงทะเบียนผ่าน LINE
  useEffect(() => {
    const mockPatients: Patient[] = [
      {
        id: '1',
        lineUserId: 'U1234567890',
        displayName: 'สมชาย ใจดี',
        firstName: 'สมชาย',
        lastName: 'ใจดี',
        phone: '081-234-5678',
        registeredAt: '2024-01-15T10:30:00',
        status: 'pending'
      },
      {
        id: '2',
        lineUserId: 'U2345678901',
        displayName: 'สมหญิง รักดี',
        firstName: 'สมหญิง',
        lastName: 'รักดี',
        phone: '082-345-6789',
        registeredAt: '2024-01-16T14:20:00',
        status: 'pending'
      },
      {
        id: '3',
        lineUserId: 'U3456789012',
        displayName: 'วิชัย เก่งมาก',
        firstName: 'วิชัย',
        lastName: 'เก่งมาก',
        registeredAt: '2024-01-17T09:15:00',
        status: 'completed'
      }
    ];

    const mockAppointments: Appointment[] = [
      {
        id: 'apt-1',
        patientId: '3',
        patientName: 'วิชัย เก่งมาก',
        vaccineId: 'covid-19',
        vaccineName: 'วัคซีนโควิด-19',
        doseNumber: 1,
        totalDoses: 2,
        appointmentDate: '2024-01-20',
        appointmentTime: '10:00',
        status: 'completed',
        notes: 'ฉีดเรียบร้อย ไม่มีผลข้างเคียง',
        createdAt: '2024-01-17T09:30:00',
        staffId: 'staff-001'
      }
    ];

    setPatients(mockPatients);
    setAppointments(mockAppointments);
  }, []);

  // กรองคนไข้ตาม search term
  const filteredPatients = patients.filter(patient =>
    patient.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone?.includes(searchTerm)
  );

  // สร้างนัดหมายใหม่
  const handleCreateAppointment = (formData: any) => {
    if (!selectedPatient) return;

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      patientId: selectedPatient.id,
      patientName: selectedPatient.displayName,
      vaccineId: formData.vaccineId,
      vaccineName: vaccineTypes.find(v => v.id === formData.vaccineId)?.name || '',
      doseNumber: 1,
      totalDoses: vaccineTypes.find(v => v.id === formData.vaccineId)?.doses || 1,
      appointmentDate: formData.date,
      appointmentTime: formData.time,
      status: 'scheduled',
      notes: formData.notes,
      createdAt: new Date().toISOString(),
      staffId: 'staff-001'
    };

    setAppointments(prev => [...prev, newAppointment]);
    setShowAppointmentForm(false);
    setSelectedPatient(null);

    // ส่งการแจ้งเตือนไป LINE
    sendLineNotification(selectedPatient, newAppointment);

    toast({
      title: "สร้างนัดหมายสำเร็จ",
      description: `นัดหมายสำหรับ ${selectedPatient.displayName} ถูกสร้างเรียบร้อยแล้ว`
    });
  };

  // ส่งการแจ้งเตือนไป LINE
  const sendLineNotification = (patient: Patient, appointment: Appointment) => {
    // จำลองการส่งข้อความไป LINE Bot API
    console.log('Sending LINE notification:', {
      to: patient.lineUserId,
      message: `🎉 การนัดหมายของคุณถูกยืนยันแล้ว!

📋 รายละเอียดการนัด:
💉 วัคซีน: ${appointment.vaccineName}
📅 วันที่: ${appointment.appointmentDate}
⏰ เวลา: ${appointment.appointmentTime}
🏥 โดสที่: ${appointment.doseNumber}/${appointment.totalDoses}

⚠️ กรุณามาตรงเวลา
📞 หากมีปัญหาโทร: 02-xxx-xxxx`
    });

    toast({
      title: "ส่งการแจ้งเตือนแล้ว",
      description: `ส่งข้อความยืนยันการนัดไปยัง LINE ของ ${patient.displayName} เรียบร้อยแล้ว`
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            ระบบจัดการวัคซีน - เจ้าหน้าที่
          </h1>
          <p className="text-muted-foreground">
            จัดการคนไข้ วัคซีน และการนัดหมาย
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              คนไข้
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              นัดหมาย
            </TabsTrigger>
            <TabsTrigger value="vaccines" className="flex items-center gap-2">
              <Syringe className="h-4 w-4" />
              วัคซีน
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              แจ้งเตือน
            </TabsTrigger>
          </TabsList>

          {/* แท็บคนไข้ */}
          <TabsContent value="patients" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  รายชื่อคนไข้ที่ลงทะเบียนผ่าน LINE
                </CardTitle>
                <CardDescription>
                  คนไข้ที่ลงทะเบียนชื่อ-นามสกุลผ่าน LINE Bot รอการจัดการ
                </CardDescription>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ค้นหาชื่อหรือเบอร์โทร..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {filteredPatients.map((patient) => (
                    <div key={patient.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <UserCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{patient.displayName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {patient.phone || 'ไม่มีเบอร์โทร'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ลงทะเบียนเมื่อ: {new Date(patient.registeredAt).toLocaleString('th-TH')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={patient.status === 'completed' ? 'default' : 'secondary'}>
                          {patient.status === 'pending' ? 'รอดำเนินการ' : 
                           patient.status === 'completed' ? 'เสร็จสิ้น' : 'ยกเลิก'}
                        </Badge>
                        <Button
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowAppointmentForm(true);
                          }}
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          จองวัคซีน
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* แท็บนัดหมาย */}
          <TabsContent value="appointments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  รายการนัดหมาย
                </CardTitle>
                <CardDescription>
                  นัดหมายการฉีดวัคซีนทั้งหมด
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <Syringe className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{appointment.patientName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {appointment.vaccineName} - โดสที่ {appointment.doseNumber}/{appointment.totalDoses}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            📅 {appointment.appointmentDate} เวลา {appointment.appointmentTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          appointment.status === 'completed' ? 'default' :
                          appointment.status === 'scheduled' ? 'secondary' :
                          appointment.status === 'cancelled' ? 'destructive' : 'outline'
                        }>
                          {appointment.status === 'scheduled' ? 'นัดแล้ว' :
                           appointment.status === 'completed' ? 'เสร็จสิ้น' :
                           appointment.status === 'cancelled' ? 'ยกเลิก' : 'ไม่มา'}
                        </Badge>
                        {appointment.status === 'scheduled' && (
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* แท็บวัคซีน */}
          <TabsContent value="vaccines" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {vaccineTypes.map((vaccine) => (
                <Card key={vaccine.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Syringe className="h-5 w-5" />
                      {vaccine.name}
                    </CardTitle>
                    <CardDescription>
                      {vaccine.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">จำนวนโดส:</span>
                        <span className="font-semibold">{vaccine.doses} โดส</span>
                      </div>
                      {vaccine.interval > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">ห่างระหว่างโดส:</span>
                          <span className="font-semibold">{vaccine.interval} วัน</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">สถานะ:</span>
                        <Badge variant={vaccine.available ? 'default' : 'secondary'}>
                          {vaccine.available ? 'พร้อมให้บริการ' : 'ไม่พร้อม'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* แท็บการแจ้งเตือน */}
          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  ส่งการแจ้งเตือน
                </CardTitle>
                <CardDescription>
                  ส่งข้อความแจ้งเตือนไปยัง LINE ของคนไข้
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Bell className="h-4 w-4" />
                  <AlertDescription>
                    ระบบจะส่งการแจ้งเตือนอัตโนมัติเมื่อสร้างนัดหมายใหม่ และก่อนวันนัด 1 วัน
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ฟอร์มจองวัคซีน */}
        {showAppointmentForm && selectedPatient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>จองวัคซีนสำหรับ {selectedPatient.displayName}</CardTitle>
                <CardDescription>
                  เลือกวัคซีนและกำหนดวันเวลานัดหมาย
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  handleCreateAppointment({
                    vaccineId: formData.get('vaccine'),
                    date: formData.get('date'),
                    time: formData.get('time'),
                    notes: formData.get('notes')
                  });
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="vaccine">เลือกวัคซีน</Label>
                    <Select name="vaccine" required>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกประเภทวัคซีน" />
                      </SelectTrigger>
                      <SelectContent>
                        {vaccineTypes.filter(v => v.available).map(vaccine => (
                          <SelectItem key={vaccine.id} value={vaccine.id}>
                            {vaccine.name} ({vaccine.doses} โดส)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="date">วันที่นัด</Label>
                    <Input
                      type="date"
                      name="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <Label htmlFor="time">เวลานัด</Label>
                    <Input
                      type="time"
                      name="time"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">หมายเหตุ (ไม่จำเป็น)</Label>
                    <Textarea
                      name="notes"
                      placeholder="หมายเหตุเพิ่มเติม..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      สร้างนัดหมาย
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAppointmentForm(false);
                        setSelectedPatient(null);
                      }}
                    >
                      ยกเลิก
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;