import { useState, useEffect } from 'react';
import { getBangkokDateString, getBangkokTimeString, addDaysToDateString } from '@/lib/dateOnlyUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Stethoscope,
  TrendingUp,
  Syringe,
  UserPlus,
  Globe,
  Settings,
  Lock
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProtectedRoute } from './ProtectedRoute';
import { VaccineSettings } from './VaccineSettings';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import React from 'react';

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
  total_doses: number;
}

interface PatientRegistration {
  id: string;
  registration_id: string;
  patient_name: string;
  phone_number: string;
  line_user_id?: string;
  status: string;
}

// Error boundary component for domain management
class DomainManagementErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ComponentType<{ error: Error; retry: () => void }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ComponentType<{ error: Error; retry: () => void }> }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Domain Management Error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      return <FallbackComponent error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

// Error fallback component for domain management
function DomainManagementErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <Card>
      <CardContent className="py-8">
        <div className="text-center space-y-4">
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-red-700">Domain Management Error</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Failed to load domain management: {error.message}
            </p>
          </div>
          <Button onClick={retry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface StaffPortalProps {
  isAdmin?: boolean;
}

const StaffPortal = ({ isAdmin: propIsAdmin }: StaffPortalProps = {}) => {
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getBangkokDateString());
  const [vaccineOptions, setVaccineOptions] = useState<VaccineOption[]>([]);
  const [patientRegistrations, setPatientRegistrations] = useState<PatientRegistration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientRegistration | null>(null);
  const [activeTab, setActiveTab] = useState('appointments');
  const [walkInForm, setWalkInForm] = useState({
    vaccineType: '',
    doseNumber: '1',
    notes: ''
  });
  const { toast } = useToast();

  // Kiosk Mode: ซ่อนแท็บ Settings
  const isKioskMode = import.meta.env.VITE_KIOSK_MODE === 'true';
  
  // Admin permission check - use prop if provided, otherwise check auth
  const { isAdmin: authIsAdmin } = useAdminAuth();
  const isAdmin = propIsAdmin !== undefined ? propIsAdmin : authIsAdmin;

  const loadAppointmentsByDate = async (date: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('appointment_date', date)
        .order('appointment_time', { ascending: true });

      if (error) throw error;
      setTodayAppointments(data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถโหลดข้อมูลนัดหมายวันที่ ${new Date(date).toLocaleDateString('th-TH')} ได้`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTodayAppointments = () => loadAppointmentsByDate(selectedDate);

  const loadVaccineOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('vaccine_schedules')
        .select('id, vaccine_type, vaccine_name, total_doses')
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
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Patient registrations loaded:', data?.length || 0, 'records');
      console.log('Sample data:', data?.slice(0, 3));

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
      console.log('Updating appointment:', { appointmentId, status, updated_at: new Date().toISOString() });

      const { data, error } = await supabase
        .from('appointments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('appointment_id', appointmentId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Update successful:', data);

      toast({
        title: "อัปเดตสำเร็จ",
        description: `อัปเดตสถานะนัดหมายเป็น ${getStatusText(status)} แล้ว`,
      });

      loadTodayAppointments();
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      const errorMessage = error?.message || error?.toString() || "ไม่ทราบสาเหตุ";
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถอัปเดตสถานะได้: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const createWalkInVaccination = async () => {
    if (!selectedPatient || !walkInForm.vaccineType || !walkInForm.doseNumber) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณาเลือกผู้ป่วย ประเภทวัคซีน และโดสที่ฉีด",
        variant: "destructive",
      });
      return;
    }

    // Validate dose number against vaccine's total doses
    const selectedVaccine = vaccineOptions.find(v => v.vaccine_type === walkInForm.vaccineType);
    const doseNum = parseInt(walkInForm.doseNumber);

    if (selectedVaccine && doseNum > selectedVaccine.total_doses) {
      toast({
        title: "โดสไม่ถูกต้อง",
        description: `วัคซีน ${selectedVaccine.vaccine_name} มีเพียง ${selectedVaccine.total_doses} เข็ม`,
        variant: "destructive",
      });
      return;
    }

    try {
      const today = getBangkokDateString();
      const now = new Date();
      const currentTime = getBangkokTimeString(now);

      const doseText = walkInForm.doseNumber === '1' ? 'เข็มที่ 1' :
        walkInForm.doseNumber === '2' ? 'เข็มที่ 2' :
          walkInForm.doseNumber === '3' ? 'เข็มที่ 3' :
            `เข็มที่ ${walkInForm.doseNumber}`;

      const appointmentData = {
        patient_name: selectedPatient.patient_name,
        patient_phone: selectedPatient.phone_number,
        patient_id_number: selectedPatient.registration_id,
        line_user_id: selectedPatient.line_user_id,
        vaccine_type: walkInForm.vaccineType,
        appointment_date: today,
        appointment_time: currentTime,
        status: 'completed',
        scheduled_by: 'walk_in',
        dose_number: Number(walkInForm.doseNumber),
        notes: `ฉีดวัคซีน Walk-in ${doseText} (${selectedVaccine?.vaccine_name}) วันนี้${walkInForm.notes ? ' - ' + walkInForm.notes : ''}`
      };

      const { error } = await supabase
        .from('appointments')
        .insert([appointmentData]);

      if (error) throw error;

      toast({
        title: "บันทึกสำเร็จ",
        description: `บันทึกการฉีดวัคซีน ${selectedVaccine?.vaccine_name} ${doseText} ของ ${selectedPatient.patient_name} แล้ว`,
      });

      // Reset form
      setSelectedPatient(null);
      setSearchTerm('');
      setWalkInForm({
        vaccineType: '',
        doseNumber: '1',
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
    loadAppointmentsByDate(selectedDate);
    loadVaccineOptions();
    loadPatientRegistrations();
  }, [selectedDate]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

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

  const isToday = selectedDate === getBangkokDateString();
  const dateLabel = isToday ? 'วันนี้' : new Date(selectedDate).toLocaleDateString('th-TH');

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Stethoscope className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">Staff Portal</h1>
              {isAdmin && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full border border-blue-200">
                  Admin
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              จัดการระบบโรงพยาบาลวัคซีน
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {isKioskMode ? (
          // Kiosk Mode: ไม่แสดงแท็บ (เน้นที่ฟอร์มบันทึกการฉีดเท่านั้น)
          <div className="hidden"></div>
        ) : (
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'} lg:w-auto lg:${isAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">นัดหมายและการฉีด</span>
              <span className="sm:hidden">นัดหมาย</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">ตั้งค่าระบบ</span>
                <span className="sm:hidden">ตั้งค่า</span>
              </TabsTrigger>
            )}
          </TabsList>
        )}

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-6 mt-6">
          {/* Date Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="date-picker" className="text-sm font-medium">เลือกวันที่:</Label>
              <Input
                id="date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleDateChange(getBangkokDateString())}
                variant="outline"
                size="sm"
                disabled={isToday}
              >
                วันนี้
              </Button>
              <Button
                onClick={() => {
                  handleDateChange(addDaysToDateString(getBangkokDateString(), 1));
                }}
                variant="outline"
                size="sm"
              >
                พรุ่งนี้
              </Button>
              <Button onClick={loadTodayAppointments} disabled={loading} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </Button>
            </div>
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
                    <p className="text-sm text-muted-foreground">นัดหมาย{dateLabel}</p>
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
                            patient.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            patient.phone_number.includes(searchTerm) ||
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
                              <div className="font-medium text-foreground">{patient.patient_name}</div>
                              <div className="text-sm text-muted-foreground flex items-center justify-between">
                                <span>โทร: {patient.phone_number}</span>
                                <span className="text-xs">ID: {patient.registration_id}</span>
                              </div>
                            </div>
                          ))
                        }
                        {patientRegistrations.filter(patient =>
                          patient.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          patient.phone_number.includes(searchTerm) ||
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
                        <div className="font-medium">{selectedPatient.patient_name}</div>
                        <div className="text-sm text-muted-foreground">{selectedPatient.phone_number}</div>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="vaccineType">ประเภทวัคซีน *</Label>
                    <Select
                      value={walkInForm.vaccineType}
                      onValueChange={(value) => setWalkInForm({ ...walkInForm, vaccineType: value, doseNumber: '1' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกประเภทวัคซีน" />
                      </SelectTrigger>
                      <SelectContent>
                        {vaccineOptions
                          .filter(vaccine => vaccine.vaccine_type && vaccine.vaccine_type.trim() !== '')
                          .map((vaccine) => (
                            <SelectItem
                              key={vaccine.id}
                              value={vaccine.vaccine_type}
                            >
                              {vaccine.vaccine_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="doseNumber">โดสที่มาฉีด *</Label>
                    <Select
                      value={walkInForm.doseNumber}
                      onValueChange={(value) => setWalkInForm({ ...walkInForm, doseNumber: value })}
                      disabled={!walkInForm.vaccineType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={walkInForm.vaccineType ? "เลือกโดสที่ฉีด" : "เลือกวัคซีนก่อน"} />
                      </SelectTrigger>
                      <SelectContent>
                        {walkInForm.vaccineType && (() => {
                          const selectedVaccine = vaccineOptions.find(v => v.vaccine_type === walkInForm.vaccineType);
                          const maxDoses = selectedVaccine?.total_doses || 1;
                          const doseOptions = [];

                          for (let i = 1; i <= maxDoses; i++) {
                            let label = `เข็มที่ ${i}`;
                            if (i === 1) label += ' (เข็มแรก)';
                            else if (i === maxDoses && maxDoses > 2) label += ' (เข็มสุดท้าย)';
                            else if (i > 2) label += ' (เข็มเสริม)';

                            doseOptions.push(
                              <SelectItem key={i} value={i.toString()}>
                                {label}
                              </SelectItem>
                            );
                          }
                          return doseOptions;
                        })()}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {walkInForm.vaccineType ? (
                        (() => {
                          const selectedVaccine = vaccineOptions.find(v => v.vaccine_type === walkInForm.vaccineType);
                          return `วัคซีนนี้มี ${selectedVaccine?.total_doses || 1} เข็ม - เลือกโดสที่คนไข้มาฉีดครั้งนี้`;
                        })()
                      ) : (
                        'กรุณาเลือกประเภทวัคซีนก่อน'
                      )}
                    </p>
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
                  นัดหมาย{dateLabel}
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
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{appointment.patient_name}</h3>
                          <Badge className={getStatusColor(appointment.status)}>
                            {getStatusIcon(appointment.status)}
                            <span className="ml-1">{getStatusText(appointment.status)}</span>
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-sm text-muted-foreground">
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
                      <div className="flex gap-2 w-full sm:w-auto">
                        {appointment.status === 'scheduled' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateAppointmentStatus(appointment.appointment_id, 'completed')}
                              className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              ฉีดแล้ว
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateAppointmentStatus(appointment.appointment_id, 'no_show')}
                              className="flex-1 sm:flex-none"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              ไม่มา
                            </Button>
                          </>
                        )}
                        {appointment.status === 'scheduled' && appointment.appointment_date < getBangkokDateString() && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <span className="text-xs text-yellow-700">นัดที่พลาด</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {todayAppointments.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">ไม่มีนัดหมายใน{dateLabel}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {isToday ? 'ใช้ฟอร์มด้านบนสำหรับบันทึกการฉีดวัคซีน Walk-in' : 'เลือกวันที่อื่นเพื่อดูนัดหมาย'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab - Admin Only */}
        {isAdmin && (
          <TabsContent value="settings" className="space-y-6 mt-6">
            <ProtectedRoute 
              requiredPermission="system:settings"
              showLoginForm={false}
              fallback={
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center space-y-4">
                      <Lock className="h-12 w-12 text-orange-500 mx-auto" />
                      <div>
                        <h3 className="text-lg font-semibold text-orange-700">Admin Access Required</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          การตั้งค่าระบบต้องใช้สิทธิ์ Admin เท่านั้น
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เข้าถึง
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              }
            >
              <VaccineSettings />
            </ProtectedRoute>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default StaffPortal;