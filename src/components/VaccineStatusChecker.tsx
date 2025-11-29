import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, User, Syringe, Clock, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const VaccineStatusChecker = () => {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [vaccineData, setVaccineData] = useState(null);
  const { toast } = useToast();

  // Load all patients on component mount
  useEffect(() => {
    loadPatients();
  }, []);

  // Filter patients based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter(patient =>
        patient.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone_number.includes(searchTerm) ||
        patient.registration_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPatients(filtered);
    }
  }, [searchTerm, patients]);

  const loadPatients = async () => {
    try {
      setIsLoadingPatients(true);
      const { data, error } = await supabase
        .from('patient_registrations')
        .select('*')
        .order('patient_name', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดรายชื่อผู้ป่วยได้"
      });
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const fetchPatientVaccineData = async (patient) => {
    setIsLoading(true);
    setSelectedPatient(patient);

    try {
      // Use secure Edge Function for vaccine status lookup
      const SUPABASE_URL = "https://fljyjbrgfzervxofrilo.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsanlqYnJnZnplcnZ4b2ZyaWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMDE1MDUsImV4cCI6MjA2OTY3NzUwNX0.2_rGfy-3UA4cPnRsg8Lm8uvj9KBCOoz5IhwCbSWYIq4";
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/secure-vaccine-status-lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          searchType: 'phone',
          searchValue: patient.phone
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'เกิดข้อผิดพลาดในการค้นหาข้อมูล');
      }

      const data = await response.json();
      
      setVaccineData({
        appointments: data.appointments || [],
        logs: data.vaccineLogs || [],
        registrations: data.registrations || [],
      });

      toast({
        title: "โหลดข้อมูลสำเร็จ",
        description: `โหลดข้อมูลของ ${patient.patient_name} สำเร็จ`
      });

    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลวัคซีนได้"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'completed': { label: 'เสร็จสิ้น', variant: 'default', icon: CheckCircle },
      'in_progress': { label: 'กำลังดำเนินการ', variant: 'secondary', icon: Clock },
      'scheduled': { label: 'นัดหมายแล้ว', variant: 'outline', icon: Calendar },
      'cancelled': { label: 'ยกเลิก', variant: 'destructive', icon: AlertCircle },
    };
    
    const config = statusMap[status] || statusMap.in_progress;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Syringe className="h-5 w-5" />
            ตรวจสอบสถานะการฉีดวัคซีน
          </CardTitle>
          <CardDescription>
            เลือกผู้ป่วยเพื่อดูข้อมูลการฉีดวัคซีนและประวัติการรักษา
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!selectedPatient ? (
            <div className="space-y-4">
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาด้วยชื่อ เบอร์โทร หรือรหัสลงทะเบียน"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Patient List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">รายชื่อผู้ป่วย ({filteredPatients.length} คน)</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingPatients ? (
                    <div className="text-center py-8">กำลังโหลดรายชื่อผู้ป่วย...</div>
                  ) : filteredPatients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {patients.length === 0 ? 'ไม่พบข้อมูลผู้ป่วยในระบบ' : 'ไม่พบผู้ป่วยที่ตรงกับการค้นหา'}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredPatients.map((patient) => (
                        <div 
                          key={patient.id}
                          className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => fetchPatientVaccineData(patient)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold">{patient.patient_name}</h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {patient.phone_number}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(patient.created_at)}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                รหัส: {patient.registration_id}
                              </div>
                            </div>
                            <Badge variant={patient.status === 'pending' ? 'secondary' : 'default'} className="ml-2">
                              {patient.status === 'pending' ? 'รอการนัดหมาย' : patient.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Selected Patient Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-medium">
                  <User className="h-5 w-5" />
                  ข้อมูลผู้ป่วย: {selectedPatient.patient_name}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedPatient(null);
                    setVaccineData(null);
                  }}
                >
                  กลับไปยังรายชื่อ
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-8">กำลังโหลดข้อมูลวัคซีน...</div>
              ) : vaccineData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Patient Registration Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">ข้อมูลการลงทะเบียน</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">ชื่อ-นามสกุล:</span>
                          <span className="ml-2 font-medium">{selectedPatient.patient_name}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">เบอร์โทร:</span>
                          <span className="ml-2">{selectedPatient.phone_number}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">โรงพยาบาล:</span>
                          <span className="ml-2">{selectedPatient.hospital}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">รหัสลงทะเบียน:</span>
                          <span className="ml-2">{selectedPatient.registration_id}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">วันที่ลงทะเบียน:</span>
                          <span className="ml-2">{formatDate(selectedPatient.created_at)}</span>
                        </div>
                        {selectedPatient.notes && (
                          <div>
                            <span className="text-muted-foreground">หมายเหตุ:</span>
                            <p className="text-sm mt-1">{selectedPatient.notes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Appointments */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">นัดหมายการฉีดวัคซีน</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {vaccineData.appointments && vaccineData.appointments.length > 0 ? (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {vaccineData.appointments.map((appointment) => (
                            <div key={appointment.id} className="border rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-medium">{appointment.vaccine_type}</h4>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(appointment.appointment_date)}
                                    {appointment.appointment_time && (
                                      <>
                                        <Clock className="h-3 w-3 ml-1" />
                                        {appointment.appointment_time.substring(0, 5)}
                                      </>
                                    )}
                                  </div>
                                </div>
                                {getStatusBadge(appointment.status)}
                              </div>
                              {appointment.notes && (
                                <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">ไม่มีนัดหมาย</div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Vaccine History - Full Width */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg">ประวัติการฉีดวัคซีน</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {vaccineData.logs && vaccineData.logs.length > 0 ? (
                        <div className="space-y-3">
                          {vaccineData.logs.map((log) => (
                            <div key={log.id} className="border rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <h4 className="font-medium">{log.vaccine_type}</h4>
                                <Badge variant="outline">เข็มที่ {log.dose_number}</Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground">วันที่ฉีด:</span>
                                  <p className="font-medium">{formatDate(log.administered_date)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">ฉีดโดย:</span>
                                  <p className="font-medium">{log.administered_by}</p>
                                </div>
                                {log.batch_number && (
                                  <div>
                                    <span className="text-muted-foreground">Batch:</span>
                                    <p className="font-medium">{log.batch_number}</p>
                                  </div>
                                )}
                                {log.side_effects && (
                                  <div>
                                    <span className="text-muted-foreground">ผลข้างเคียง:</span>
                                    <p className="font-medium">{log.side_effects}</p>
                                  </div>
                                )}
                              </div>
                              
                              {log.notes && (
                                <div className="mt-3">
                                  <span className="text-sm text-muted-foreground">หมายเหตุ:</span>
                                  <p className="text-sm mt-1">{log.notes}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          ไม่มีประวัติการฉีดวัคซีน
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VaccineStatusChecker;