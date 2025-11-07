/**
 * Fix Incorrect Appointments Component
 * 
 * Automatically fixes appointments that don't match vaccine_schedules calculations
 * Allows staff to review and approve changes before applying
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Calendar, Wrench } from 'lucide-react';

interface IncorrectAppointment {
  appointment_id: string;
  patient_name: string;
  patient_id: string;
  vaccine_type: string;
  vaccine_name: string;
  current_date: string;
  calculated_date: string;
  days_diff: number;
  dose_number: number;
  total_doses: number;
  first_dose_date: string;
  selected: boolean;
}

export function FixIncorrectAppointments() {
  const [incorrectAppointments, setIncorrectAppointments] = useState<IncorrectAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const { toast } = useToast();

  const scanForIncorrectAppointments = async () => {
    setLoading(true);
    try {
      console.log('🔍 กำลังสแกนหานัดที่ไม่ตรง...');

      // 1. Get vaccine schedules
      const { data: schedules, error: scheduleError } = await supabase
        .from('vaccine_schedules')
        .select('*')
        .eq('active', true);

      if (scheduleError) throw scheduleError;

      // 2. Get all appointments
      const { data: allAppointments, error: apptError } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true });

      if (apptError) throw apptError;

      const completed = allAppointments?.filter(a => a.status === 'completed') || [];
      const scheduled = allAppointments?.filter(a =>
        ['scheduled', 'pending'].includes(a.status) &&
        new Date(a.appointment_date) >= new Date()
      ) || [];

      console.log('✅ การฉีดที่เสร็จสิ้น:', completed.length);
      console.log('📅 นัดที่มีอยู่:', scheduled.length);

      // 3. Group by patient and vaccine
      const patientVaccineMap = new Map();

      for (const appt of completed) {
        const patientKey = appt.patient_id_number || appt.line_user_id;
        const key = `${patientKey}-${appt.vaccine_type}`;

        if (!patientVaccineMap.has(key)) {
          const patientDoses = completed.filter(a => {
            const aPatientKey = a.patient_id_number || a.line_user_id;
            return aPatientKey === patientKey && a.vaccine_type === appt.vaccine_type;
          }).sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());

          patientVaccineMap.set(key, {
            patient_name: appt.patient_name,
            patient_id: patientKey,
            vaccine_type: appt.vaccine_type,
            all_doses: patientDoses
          });
        }
      }

      // 4. Find incorrect appointments
      const incorrect: IncorrectAppointment[] = [];

      for (const [key, patient] of patientVaccineMap) {
        const schedule = schedules?.find(s =>
          s.vaccine_type.toLowerCase() === patient.vaccine_type.toLowerCase()
        );

        if (!schedule) continue;

        const intervals = Array.isArray(schedule.dose_intervals) ?
          schedule.dose_intervals :
          JSON.parse(schedule.dose_intervals?.toString() || '[]');

        const firstDoseDate = patient.all_doses[0].appointment_date;
        const dosesReceived = patient.all_doses.length;

        // Check if patient needs next dose
        if (dosesReceived >= schedule.total_doses) continue;

        // Find existing future appointment
        const futureAppt = scheduled.find(appt => {
          const apptPatientKey = appt.patient_id_number || appt.line_user_id;
          return apptPatientKey === patient.patient_id &&
            appt.vaccine_type.toLowerCase() === patient.vaccine_type.toLowerCase();
        });

        if (!futureAppt) continue;

        // Calculate correct date
        let totalDays = 0;
        for (let i = 0; i < dosesReceived; i++) {
          totalDays += intervals[i] || 0;
        }

        const baseDate = new Date(firstDoseDate);
        const calculatedDate = new Date(baseDate);
        calculatedDate.setDate(calculatedDate.getDate() + totalDays);
        const calculatedDateStr = calculatedDate.toISOString().split('T')[0];

        // Check if dates match
        if (futureAppt.appointment_date !== calculatedDateStr) {
          const currentDate = new Date(futureAppt.appointment_date);
          const daysDiff = Math.round((currentDate.getTime() - calculatedDate.getTime()) / (1000 * 60 * 60 * 24));

          incorrect.push({
            appointment_id: futureAppt.id,
            patient_name: patient.patient_name,
            patient_id: patient.patient_id,
            vaccine_type: patient.vaccine_type,
            vaccine_name: schedule.vaccine_name,
            current_date: futureAppt.appointment_date,
            calculated_date: calculatedDateStr,
            days_diff: daysDiff,
            dose_number: dosesReceived + 1,
            total_doses: schedule.total_doses,
            first_dose_date: firstDoseDate,
            selected: true // Default to selected
          });

          console.log(`⚠️ พบนัดไม่ตรง: ${patient.patient_name} - ${patient.vaccine_type}`);
          console.log(`   นัดในระบบ: ${futureAppt.appointment_date}`);
          console.log(`   ควรเป็น: ${calculatedDateStr}`);
          console.log(`   ต่างกัน: ${daysDiff} วัน`);
        }
      }

      setIncorrectAppointments(incorrect);

      if (incorrect.length === 0) {
        toast({
          title: "ไม่พบนัดที่ไม่ตรง",
          description: "นัดทั้งหมดตรงกับการคำนวณจาก vaccine_schedules แล้ว",
        });
      } else {
        toast({
          title: "พบนัดที่ไม่ตรง",
          description: `พบ ${incorrect.length} นัดที่ต้องแก้ไข`,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Error scanning appointments:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสแกนนัดหมายได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (appointmentId: string) => {
    setIncorrectAppointments(prev =>
      prev.map(appt =>
        appt.appointment_id === appointmentId
          ? { ...appt, selected: !appt.selected }
          : appt
      )
    );
  };

  const toggleAll = () => {
    const allSelected = incorrectAppointments.every(appt => appt.selected);
    setIncorrectAppointments(prev =>
      prev.map(appt => ({ ...appt, selected: !allSelected }))
    );
  };

  const fixSelectedAppointments = async () => {
    const selected = incorrectAppointments.filter(appt => appt.selected);

    if (selected.length === 0) {
      toast({
        title: "ไม่มีนัดที่เลือก",
        description: "กรุณาเลือกนัดที่ต้องการแก้ไข",
        variant: "destructive",
      });
      return;
    }

    setFixing(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const appt of selected) {
        try {
          const { error } = await supabase
            .from('appointments')
            .update({
              appointment_date: appt.calculated_date,
              notes: `แก้ไขวันนัดให้ตรงกับ vaccine_schedules (เดิม: ${appt.current_date})`
            })
            .eq('id', appt.appointment_id);

          if (error) throw error;

          console.log(`✅ แก้ไขนัดสำเร็จ: ${appt.patient_name} - ${appt.vaccine_type}`);
          successCount++;
        } catch (error) {
          console.error(`❌ แก้ไขนัดล้มเหลว: ${appt.patient_name}`, error);
          errorCount++;
        }
      }

      toast({
        title: "แก้ไขเสร็จสิ้น",
        description: `สำเร็จ: ${successCount} นัด, ล้มเหลว: ${errorCount} นัด`,
      });

      // Refresh the list
      await scanForIncorrectAppointments();

    } catch (error: any) {
      console.error('Error fixing appointments:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขนัดหมายได้",
        variant: "destructive",
      });
    } finally {
      setFixing(false);
    }
  };

  const formatThaiDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const selectedCount = incorrectAppointments.filter(appt => appt.selected).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                แก้ไขนัดที่ไม่ตรงกับตาราง
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                สแกนและแก้ไขนัดหมายที่ไม่ตรงกับการคำนวณจาก vaccine_schedules
              </p>
            </div>
            <Button onClick={scanForIncorrectAppointments} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'กำลังสแกน...' : 'สแกนนัดที่ไม่ตรง'}
            </Button>
          </div>
        </CardHeader>

        {incorrectAppointments.length > 0 && (
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>พบ {incorrectAppointments.length} นัดที่ไม่ตรงกับตาราง</strong>
                <br />
                กรุณาตรวจสอบและเลือกนัดที่ต้องการแก้ไข
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={incorrectAppointments.every(appt => appt.selected)}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm font-medium">
                  เลือกทั้งหมด ({selectedCount}/{incorrectAppointments.length})
                </span>
              </div>
              <Button
                onClick={fixSelectedAppointments}
                disabled={fixing || selectedCount === 0}
                variant="default"
              >
                {fixing ? 'กำลังแก้ไข...' : `แก้ไข ${selectedCount} นัด`}
              </Button>
            </div>

            <div className="space-y-3">
              {incorrectAppointments.map((appt) => (
                <Card key={appt.appointment_id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={appt.selected}
                        onCheckedChange={() => toggleSelection(appt.appointment_id)}
                        className="mt-1"
                      />

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{appt.patient_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {appt.vaccine_name} - เข็มที่ {appt.dose_number}/{appt.total_doses}
                            </p>
                          </div>
                          <Badge variant={Math.abs(appt.days_diff) > 7 ? "destructive" : "secondary"}>
                            ต่างกัน {Math.abs(appt.days_diff)} วัน
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div className="p-2 bg-red-50 rounded border border-red-200">
                            <div className="flex items-center gap-1 text-red-600 mb-1">
                              <XCircle className="h-3 w-3" />
                              <span className="font-medium">นัดในระบบ (ผิด)</span>
                            </div>
                            <p className="font-semibold">{formatThaiDate(appt.current_date)}</p>
                            <p className="text-xs text-muted-foreground">{appt.current_date}</p>
                          </div>

                          <div className="p-2 bg-green-50 rounded border border-green-200">
                            <div className="flex items-center gap-1 text-green-600 mb-1">
                              <CheckCircle className="h-3 w-3" />
                              <span className="font-medium">ควรเป็น (ถูก)</span>
                            </div>
                            <p className="font-semibold">{formatThaiDate(appt.calculated_date)}</p>
                            <p className="text-xs text-muted-foreground">{appt.calculated_date}</p>
                          </div>

                          <div className="p-2 bg-blue-50 rounded border border-blue-200">
                            <div className="flex items-center gap-1 text-blue-600 mb-1">
                              <Calendar className="h-3 w-3" />
                              <span className="font-medium">เข็มแรก</span>
                            </div>
                            <p className="font-semibold">{formatThaiDate(appt.first_dose_date)}</p>
                            <p className="text-xs text-muted-foreground">{appt.first_dose_date}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        )}

        {!loading && incorrectAppointments.length === 0 && (
          <CardContent>
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong className="text-green-800">ไม่พบนัดที่ไม่ตรง</strong>
                <br />
                นัดทั้งหมดตรงกับการคำนวณจาก vaccine_schedules แล้ว
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default FixIncorrectAppointments;
