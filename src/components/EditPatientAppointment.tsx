import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Save, Search, Edit, RefreshCw } from 'lucide-react';

interface PatientAppointment {
  id: string;
  patient_name: string;
  patient_id_number: string;
  vaccine_type: string;
  appointment_date: string;
  status: string;
  notes?: string;
}

interface VaccineSchedule {
  id: string;
  vaccine_type: string;
  vaccine_name: string;
  total_doses: number;
  dose_intervals: number[];
}

const EditPatientAppointment = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [vaccineSchedules, setVaccineSchedules] = useState<VaccineSchedule[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<PatientAppointment | null>(null);
  const [editForm, setEditForm] = useState({
    lastDoseDate: '',
    nextDoseDate: '',
    doseNumber: '2',
    notes: '',
    customNextDate: false
  });
  const [existingFutureAppointments, setExistingFutureAppointments] = useState<PatientAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'completed')
        .order('appointment_date', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลนัดหมายได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadVaccineSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('vaccine_schedules')
        .select('*')
        .eq('active', true);

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformed = data?.map(item => ({
        ...item,
        dose_intervals: Array.isArray(item.dose_intervals) 
          ? item.dose_intervals 
          : typeof item.dose_intervals === 'string'
          ? JSON.parse(item.dose_intervals)
          : []
      })) || [];
      
      setVaccineSchedules(transformed as VaccineSchedule[]);
    } catch (error) {
      console.error('Error loading vaccine schedules:', error);
    }
  };

  const calculateNextDoseDate = async (patientId: string, vaccineType: string, currentDoseCount: number) => {
    const schedule = vaccineSchedules.find(s => s.vaccine_type === vaccineType);
    if (!schedule) return '';

    // Find all completed doses for this patient and vaccine type
    const { data: completedDoses, error } = await supabase
      .from('appointments')
      .select('appointment_date')
      .eq('patient_id_number', patientId)
      .eq('vaccine_type', vaccineType)
      .eq('status', 'completed')
      .order('appointment_date', { ascending: true });

    if (error || !completedDoses || completedDoses.length === 0) {
      console.error('Error loading completed doses:', error);
      return '';
    }

    // Get first dose date
    const firstDoseDate = completedDoses[0].appointment_date;
    const intervals = schedule.dose_intervals;

    console.log(`📊 คำนวนจาก vaccine_schedules สำหรับ ${patientId}:`, {
      vaccine_type: vaccineType,
      total_doses: schedule.total_doses,
      dose_intervals: intervals,
      current_dose_count: currentDoseCount,
      first_dose_date: firstDoseDate
    });

    // Calculate cumulative days from first dose
    let totalDaysFromFirstDose = 0;
    for (let i = 0; i < currentDoseCount; i++) {
      const intervalDays = intervals[i] || 0;
      totalDaysFromFirstDose += intervalDays;
      console.log(`  เข็มที่ ${i + 1} -> ${i + 2}: +${intervalDays} วัน (รวม: ${totalDaysFromFirstDose} วัน)`);
    }

    // Calculate next dose date from first dose + cumulative intervals
    const baseDate = new Date(firstDoseDate);
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + totalDaysFromFirstDose);

    console.log(`🎯 นัดเข็มถัดไป:`, {
      first_dose_date: firstDoseDate,
      cumulative_days: totalDaysFromFirstDose,
      next_dose_date: nextDate.toISOString().split('T')[0]
    });

    return nextDate.toISOString().split('T')[0];
  };

  const handleAppointmentSelect = async (appointment: PatientAppointment) => {
    setSelectedAppointment(appointment);
    setEditForm({
      lastDoseDate: appointment.appointment_date,
      nextDoseDate: '',
      doseNumber: '2',
      notes: appointment.notes || '',
      customNextDate: false
    });

    // ค้นหานัดในอนาคตที่มีอยู่แล้ว
    try {
      const { data: futureAppointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id_number', appointment.patient_id_number)
        .eq('vaccine_type', appointment.vaccine_type)
        .in('status', ['scheduled', 'pending'])
        .gte('appointment_date', new Date().toISOString().split('T')[0]);

      if (error) throw error;
      setExistingFutureAppointments(futureAppointments || []);
    } catch (error) {
      console.error('Error loading future appointments:', error);
      setExistingFutureAppointments([]);
    }
  };

  const handleLastDoseDateChange = async (date: string) => {
    setEditForm(prev => ({
      ...prev,
      lastDoseDate: date,
      nextDoseDate: ''
    }));

    // Calculate next dose date asynchronously
    if (selectedAppointment) {
      // Count completed doses for this patient and vaccine
      const { data: completedDoses } = await supabase
        .from('appointments')
        .select('id')
        .eq('patient_id_number', selectedAppointment.patient_id_number)
        .eq('vaccine_type', selectedAppointment.vaccine_type)
        .eq('status', 'completed');

      const currentDoseCount = completedDoses?.length || 0;
      const nextDate = await calculateNextDoseDate(
        selectedAppointment.patient_id_number,
        selectedAppointment.vaccine_type,
        currentDoseCount
      );

      setEditForm(prev => ({
        ...prev,
        nextDoseDate: nextDate
      }));
    }
  };

  const handleDoseNumberChange = async (doseNumber: string) => {
    setEditForm(prev => ({
      ...prev,
      doseNumber,
      nextDoseDate: ''
    }));

    // Calculate next dose date asynchronously
    if (selectedAppointment) {
      const nextDate = await calculateNextDoseDate(
        selectedAppointment.patient_id_number,
        selectedAppointment.vaccine_type,
        parseInt(doseNumber)
      );

      setEditForm(prev => ({
        ...prev,
        nextDoseDate: nextDate
      }));
    }
  };

  const saveChanges = async () => {
    if (!selectedAppointment || !editForm.lastDoseDate) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกวันที่ฉีดเข็มล่าสุด",
        variant: "destructive",
      });
      return;
    }

    // คำนวณ nextDoseDate หากยังไม่มี
    let nextDoseDate = editForm.nextDoseDate;
    if (!nextDoseDate) {
      nextDoseDate = await calculateNextDoseDate(
        selectedAppointment.patient_id_number,
        selectedAppointment.vaccine_type, 
        parseInt(editForm.doseNumber)
      );
      
      if (!nextDoseDate) {
        toast({
          title: "ไม่สามารถคำนวณวันนัดได้",
          description: "ไม่พบข้อมูลวัคซีนหรือช่วงห่างการฉีด",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      // 1. ค้นหาและจัดการนัดเก่าที่มีอยู่แล้ว
      const patientKey = selectedAppointment.patient_id_number;
      const nextDoseNumber = parseInt(editForm.doseNumber) + 1;
      
      // ค้นหานัดเก่าที่ยังไม่เสร็จสิ้นสำหรับผู้ป่วยและวัคซีนนี้
      const { data: existingAppointments, error: searchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id_number', patientKey)
        .eq('vaccine_type', selectedAppointment.vaccine_type)
        .in('status', ['scheduled', 'pending'])
        .gte('appointment_date', new Date().toISOString().split('T')[0]);

      if (searchError) throw searchError;

      console.log('พบนัดเก่า:', existingAppointments?.length || 0, 'รายการ');

      // 2. ยกเลิกหรืออัปเดตนัดเก่า
      if (existingAppointments && existingAppointments.length > 0) {
        for (const oldAppt of existingAppointments) {
          // ยกเลิกนัดเก่า
          const { error: cancelError } = await supabase
            .from('appointments')
            .update({
              status: 'cancelled',
              notes: `${oldAppt.notes || ''} (ยกเลิกเนื่องจากแก้ไขข้อมูลเมื่อ ${new Date().toLocaleDateString('th-TH')})`
            })
            .eq('id', oldAppt.id);

          if (cancelError) throw cancelError;
          console.log('ยกเลิกนัดเก่า ID:', oldAppt.id);
        }
      }

      // 3. อัปเดตข้อมูลการฉีดเข็มที่แล้ว
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          appointment_date: editForm.lastDoseDate,
          notes: `${editForm.notes} (แก้ไขเมื่อ ${new Date().toLocaleDateString('th-TH')})`
        })
        .eq('id', selectedAppointment.id);

      if (updateError) throw updateError;

      // 4. สร้างนัดหมายครั้งถัดไปใหม่
      const schedule = vaccineSchedules.find(s => s.vaccine_type === selectedAppointment.vaccine_type);
      
      if (schedule && nextDoseNumber <= schedule.total_doses) {
        const { error: insertError } = await supabase
          .from('appointments')
          .insert([{
            patient_name: selectedAppointment.patient_name,
            patient_id_number: selectedAppointment.patient_id_number,
            vaccine_type: selectedAppointment.vaccine_type,
            appointment_date: nextDoseDate,
            status: 'scheduled',
            notes: `นัดเข็มที่ ${nextDoseNumber} จาก ${schedule.total_doses} เข็ม (สร้างใหม่จากการแก้ไข ${new Date().toLocaleDateString('th-TH')})`
          }]);

        if (insertError) throw insertError;
        console.log('สร้างนัดใหม่สำเร็จ:', nextDoseDate);
      }

      const cancelledCount = existingAppointments?.length || 0;
      toast({
        title: "บันทึกสำเร็จ",
        description: `แก้ไขข้อมูลของ ${selectedAppointment.patient_name} แล้ว${cancelledCount > 0 ? ` (ยกเลิกนัดเก่า ${cancelledCount} รายการ และสร้างนัดใหม่)` : ' และสร้างนัดครั้งถัดไป'}`,
      });

      // รีเซ็ตฟอร์มและ state
      setSelectedAppointment(null);
      setExistingFutureAppointments([]);
      setEditForm({
        lastDoseDate: '',
        nextDoseDate: '',
        doseNumber: '2',
        notes: '',
        customNextDate: false
      });
      
      // รีเฟรชรายการนัดหมายทันทีหลังบันทึกสำเร็จ
      await loadAppointments();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการเปลี่ยนแปลงได้",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    loadVaccineSchedules();

    // Set up Supabase Realtime subscription for appointments table
    const appointmentsSubscription = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          console.log('📡 Realtime update received:', payload);
          // Reload appointments when any change occurs
          loadAppointments();
        }
      )
      .subscribe();

    // Also set up a periodic refresh every 30 seconds as fallback
    const intervalId = setInterval(() => {
      loadAppointments();
    }, 30000); // 30 seconds

    // Cleanup function
    return () => {
      supabase.removeChannel(appointmentsSubscription);
      clearInterval(intervalId);
    };
  }, []);

  const filteredAppointments = appointments.filter(appt =>
    appt.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appt.patient_id_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appt.vaccine_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Edit className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">แก้ไขข้อมูลนัดหมาย</h1>
            <p className="text-sm text-muted-foreground">
              แก้ไขวันที่ฉีดและคำนวณนัดครั้งถัดไป
              {!loading && (
                <span className="ml-2 text-green-600">
                  🔄 อัปเดตอัตโนมัติทุก 30 วินาที
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* รายการนัดหมาย */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                ค้นหานัดหมายที่ต้องแก้ไข
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={loadAppointments}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="ค้นหาด้วยชื่อผู้ป่วย, ID, หรือประเภทวัคซีน"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  <p>กำลังโหลดข้อมูล...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedAppointment?.id === appointment.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleAppointmentSelect(appointment)}
                      >
                        <div className="font-medium">{appointment.patient_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {appointment.vaccine_type} - {new Date(appointment.appointment_date).toLocaleDateString('th-TH')}
                        </div>
                        <div className="text-xs text-muted-foreground">ID: {appointment.patient_id_number}</div>
                      </div>
                    ))}
                  </div>

                  {filteredAppointments.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'ไม่พบข้อมูลที่ค้นหา' : 'ไม่มีข้อมูลนัดหมาย'}
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ฟอร์มแก้ไข */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              แก้ไขข้อมูลนัดหมาย
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedAppointment ? (
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium">{selectedAppointment.patient_name}</div>
                  <div className="text-sm text-muted-foreground">{selectedAppointment.vaccine_type}</div>
                  <div className="text-xs text-muted-foreground">ID: {selectedAppointment.patient_id_number}</div>
                </div>

                <div>
                  <Label htmlFor="lastDoseDate">วันที่ฉีดเข็มล่าสุด (เข็มที่ {editForm.doseNumber})</Label>
                  <Input
                    id="lastDoseDate"
                    type="date"
                    value={editForm.lastDoseDate}
                    onChange={(e) => handleLastDoseDateChange(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="doseNumber">เข็มที่ฉีดล่าสุด</Label>
                  <Select
                    value={editForm.doseNumber}
                    onValueChange={handleDoseNumberChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">เข็มที่ 1</SelectItem>
                      <SelectItem value="2">เข็มที่ 2</SelectItem>
                      <SelectItem value="3">เข็มที่ 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="nextDoseDate">วันนัดเข็มถัดไป (เข็มที่ {parseInt(editForm.doseNumber) + 1})</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditForm(prev => ({ ...prev, customNextDate: !prev.customNextDate }))}
                    >
                      {editForm.customNextDate ? 'ใช้วันที่อัตโนมัติ' : 'กำหนดวันที่เอง'}
                    </Button>
                  </div>
                  
                  {editForm.customNextDate ? (
                    <Input
                      id="nextDoseDate"
                      type="date"
                      value={editForm.nextDoseDate}
                      onChange={(e) => setEditForm(prev => ({ ...prev, nextDoseDate: e.target.value }))}
                    />
                  ) : (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="font-medium text-lg text-green-800">
                        {editForm.nextDoseDate ? 
                          new Date(editForm.nextDoseDate).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'long'
                          }) : 
                          'กรุณาเลือกวันที่ฉีดเข็มล่าสุด'
                        }
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        📅 คำนวณอัตโนมัติตามช่วงห่างของวัคซีน
                        {editForm.nextDoseDate && editForm.lastDoseDate && (
                          ` (ห่างจากเข็มล่าสุด ${Math.ceil((new Date(editForm.nextDoseDate).getTime() - new Date(editForm.lastDoseDate).getTime()) / (1000 * 60 * 60 * 24))} วัน)`
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="notes">หมายเหตุ</Label>
                  <Input
                    id="notes"
                    value={editForm.notes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="หมายเหตุเพิ่มเติม"
                  />
                </div>

                <div className="space-y-2">
                  {/* แสดงนัดเก่าที่จะได้รับผลกระทบ */}
                  {existingFutureAppointments.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="font-medium text-yellow-800 mb-2">
                        ⚠️ นัดเก่าที่จะถูกยกเลิก ({existingFutureAppointments.length} รายการ):
                      </div>
                      {existingFutureAppointments.map((appt, index) => (
                        <div key={appt.id} className="text-sm text-yellow-700 ml-4">
                          • วันที่ {new Date(appt.appointment_date).toLocaleDateString('th-TH')} ({appt.status})
                        </div>
                      ))}
                    </div>
                  )}

                  {editForm.nextDoseDate && (
                    <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                      ✅ ระบบจะสร้างนัดหมายเข็มที่ {parseInt(editForm.doseNumber) + 1} ในวันที่ {new Date(editForm.nextDoseDate).toLocaleDateString('th-TH')} อัตโนมัติ
                    </div>
                  )}
                  
                  <Button 
                    onClick={saveChanges} 
                    disabled={saving || !editForm.lastDoseDate}
                    className="w-full"
                  >
                    {saving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {saving ? 'กำลังบันทึก...' : 
                      existingFutureAppointments.length > 0 ? 
                        'ยกเลิกนัดเก่าและสร้างนัดใหม่' : 
                        'บันทึกและสร้างนัดอัตโนมัติ'
                    }
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>เลือกนัดหมายที่ต้องการแก้ไขจากรายการด้านซ้าย</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditPatientAppointment;