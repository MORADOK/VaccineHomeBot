import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, User, Syringe, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const VaccineStatusChecker = () => {
  const [searchType, setSearchType] = useState('phone');
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const searchPatientData = async () => {
    if (!searchValue.trim()) {
      toast({
        variant: "destructive",
        title: "กรุณากรอกข้อมูล",
        description: `กรุณากรอก${searchType === 'phone' ? 'เบอร์โทรศัพท์' : 'เลขบัตรประชาชน'}`
      });
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const searchField = searchType === 'phone' ? 'patient_phone' : 'patient_id_number';
      
      // Get appointments
      const { data: appointmentData } = await supabase
        .from('appointments')
        .select('*')
        .eq(searchField, searchValue)
        .order('appointment_date', { ascending: false });

      // Get patient name for other queries
      let patientName = '';
      if (appointmentData && appointmentData.length > 0) {
        patientName = appointmentData[0].patient_name;
      }

      // Get vaccine logs
      let logsData = [];
      if (patientName) {
        const { data: logs } = await supabase
          .from('vaccine_logs')
          .select('*')
          .eq('patient_name', patientName)
          .order('administered_date', { ascending: false });
        
        logsData = logs || [];
      }

      setResults({
        appointments: appointmentData || [],
        logs: logsData,
        patientName: patientName
      });

      if (!appointmentData || appointmentData.length === 0) {
        toast({
          title: "ไม่พบข้อมูล",
          description: "ไม่พบข้อมูลการลงทะเบียนในระบบ กรุณาตรวจสอบข้อมูลอีกครั้ง"
        });
      } else {
        toast({
          title: "ค้นหาสำเร็จ",
          description: `พบข้อมูลของ ${patientName || 'ผู้ป่วย'}`
        });
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถค้นหาข้อมูลได้ กรุณาลองใหม่อีกครั้ง"
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
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Syringe className="h-5 w-5" />
            ตรวจสอบสถานะการฉีดวัคซีน
          </CardTitle>
          <CardDescription>
            กรอกเบอร์โทรศัพท์หรือเลขบัตรประชาชนเพื่อค้นหาข้อมูลการฉีดวัคซีน
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <select 
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="phone">เบอร์โทรศัพท์</option>
              <option value="id">เลขบัตรประชาชน</option>
            </select>
            
            <Input
              placeholder={searchType === 'phone' ? 'กรอกเบอร์โทรศัพท์' : 'กรอกเลขบัตรประชาชน'}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1"
            />
            
            <Button onClick={searchPatientData} disabled={isLoading}>
              {isLoading ? 'กำลังค้นหา...' : 'ค้นหา'}
            </Button>
          </div>

          {hasSearched && results && (
            <div className="space-y-6">
              {results.patientName && (
                <div className="flex items-center gap-2 text-lg font-medium">
                  <User className="h-5 w-5" />
                  ข้อมูลผู้ป่วย: {results.patientName}
                </div>
              )}

              {/* Appointments */}
              {results.appointments && results.appointments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">นัดหมายการฉีดวัคซีน</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {results.appointments.map((appointment) => (
                        <div key={appointment.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold">{appointment.vaccine_type}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(appointment.appointment_date)}
                                {appointment.appointment_time && (
                                  <>
                                    <Clock className="h-4 w-4 ml-2" />
                                    {appointment.appointment_time.substring(0, 5)}
                                  </>
                                )}
                              </div>
                            </div>
                            {getStatusBadge(appointment.status)}
                          </div>
                          
                          {appointment.notes && (
                            <div className="mt-2">
                              <span className="text-sm text-muted-foreground">หมายเหตุ:</span>
                              <p className="text-sm mt-1">{appointment.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Vaccine History */}
              {results.logs && results.logs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ประวัติการฉีดวัคซีน</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {results.logs.map((log) => (
                        <div key={log.id} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{log.vaccine_type}</h3>
                            <Badge variant="outline">เข็มที่ {log.dose_number}</Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">วันที่ฉีด:</span>
                              <span className="ml-2">{formatDate(log.administered_date)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">ฉีดโดย:</span>
                              <span className="ml-2">{log.administered_by}</span>
                            </div>
                            {log.batch_number && (
                              <div>
                                <span className="text-muted-foreground">Batch:</span>
                                <span className="ml-2">{log.batch_number}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {hasSearched && results && 
               (!results.appointments || results.appointments.length === 0) && 
               (!results.logs || results.logs.length === 0) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    ไม่พบข้อมูลการลงทะเบียนในระบบ กรุณาตรวจสอบข้อมูลอีกครั้งหรือติดต่อเจ้าหน้าที่
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VaccineStatusChecker;