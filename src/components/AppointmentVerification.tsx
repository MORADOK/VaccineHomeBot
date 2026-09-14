/**
 * Appointment Verification Component
 * Verifies if appointments match vaccine_schedules calculations
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Calendar, Syringe } from 'lucide-react';

interface VerificationResult {
  patient_name: string;
  patient_id: string;
  vaccine_type: string;
  vaccine_name: string;
  doses_received: number;
  total_doses: number;
  first_dose_date: string;
  all_doses: Array<{ date: string; calculated_date: string; matches: boolean; days_diff: number }>;
  next_dose_calculated: string | null;
  next_dose_in_system: string | null;
  next_dose_matches: boolean;
  is_completed: boolean;
}

export function AppointmentVerification() {
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const verifyAppointments = async () => {
    setLoading(true);
    try {
      console.log('🔍 เริ่มตรวจสอบวันนัดในระบบ...');

      // 1. Get vaccine schedules
      const { data: schedules, error: scheduleError } = await supabase
        .from('vaccine_schedules')
        .select('*')
        .eq('active', true);

      if (scheduleError) throw scheduleError;

      console.log('💉 ตารางวัคซีน:', schedules?.length);

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

      // 4. Verify each patient
      const verificationResults: VerificationResult[] = [];

      for (const [key, patient] of patientVaccineMap) {
        const schedule = schedules?.find(s =>
          s.vaccine_type.toLowerCase() === patient.vaccine_type.toLowerCase()
        );

        if (!schedule) continue;

        const intervals = Array.isArray(schedule.dose_intervals) ?
          schedule.dose_intervals :
          JSON.parse(schedule.dose_intervals);

        const firstDoseDate = new Date(patient.all_doses[0].appointment_date);
        const doseVerifications = [];

        // Verify each dose
        for (let i = 0; i < patient.all_doses.length; i++) {
          let calculatedDate;

          if (i === 0) {
            calculatedDate = firstDoseDate;
          } else {
            // dose_intervals stores absolute day offsets from the first dose.
            const daysFromFirstDose = intervals[i - 1] || 0;
            calculatedDate = new Date(firstDoseDate);
            calculatedDate.setDate(calculatedDate.getDate() + daysFromFirstDose);
          }

          const actualDate = new Date(patient.all_doses[i].appointment_date);
          const calculatedDateStr = calculatedDate.toISOString().split('T')[0];
          const actualDateStr = patient.all_doses[i].appointment_date;

          const daysDiff = Math.round((actualDate.getTime() - calculatedDate.getTime()) / (1000 * 60 * 60 * 24));
          const matches = actualDateStr === calculatedDateStr;

          doseVerifications.push({
            date: actualDateStr,
            calculated_date: calculatedDateStr,
            matches,
            days_diff: daysDiff
          });
        }

        // Calculate next dose
        let nextDoseCalculated = null;
        let nextDoseInSystem = null;
        let nextDoseMatches = false;

        if (patient.all_doses.length < schedule.total_doses) {
          // After N completed doses, dose N+1 uses offset index N-1.
          const daysFromFirstDose = intervals[patient.all_doses.length - 1] || 0;

          const nextDate = new Date(firstDoseDate);
          nextDate.setDate(nextDate.getDate() + daysFromFirstDose);
          nextDoseCalculated = nextDate.toISOString().split('T')[0];

          // Check existing appointment
          const existingAppt = scheduled.find(a => {
            const aPatientKey = a.patient_id_number || a.line_user_id;
            return aPatientKey === patient.patient_id &&
                   a.vaccine_type === patient.vaccine_type;
          });

          if (existingAppt) {
            nextDoseInSystem = existingAppt.appointment_date;
            nextDoseMatches = nextDoseInSystem === nextDoseCalculated;
          }
        }

        verificationResults.push({
          patient_name: patient.patient_name,
          patient_id: patient.patient_id,
          vaccine_type: patient.vaccine_type,
          vaccine_name: schedule.vaccine_name,
          doses_received: patient.all_doses.length,
          total_doses: schedule.total_doses,
          first_dose_date: patient.all_doses[0].appointment_date,
          all_doses: doseVerifications,
          next_dose_calculated: nextDoseCalculated,
          next_dose_in_system: nextDoseInSystem,
          next_dose_matches: nextDoseMatches,
          is_completed: patient.all_doses.length >= schedule.total_doses
        });
      }

      setResults(verificationResults);

      toast({
        title: "ตรวจสอบเสร็จสิ้น",
        description: `ตรวจสอบ ${verificationResults.length} ผู้ป่วยแล้ว`,
      });

    } catch (error) {
      console.error('Error verifying appointments:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถตรวจสอบข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyAppointments();
  }, []);

  const allMatches = results.every(r =>
    r.all_doses.every(d => d.matches) &&
    (r.is_completed || r.next_dose_matches || r.next_dose_in_system === null)
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ตรวจสอบความถูกต้องของวันนัด</h1>
          <p className="text-sm text-muted-foreground">
            เปรียบเทียบวันนัดจริงกับการคำนวนจาก vaccine_schedules
          </p>
        </div>
        <Button onClick={verifyAppointments} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </Button>
      </div>

      {results.length > 0 && (
        <Alert className={allMatches ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
          <AlertDescription>
            <div className="flex items-center gap-2">
              {allMatches ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    ✅ ทุกนัดตรงกับการคำนวนจาก vaccine_schedules
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">
                    ⚠️ พบความไม่ตรงกันบางรายการ
                  </span>
                </>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {results.map((result, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {result.patient_name} - {result.vaccine_name}
                </CardTitle>
                {result.is_completed ? (
                  <Badge className="bg-green-500">ครบแล้ว</Badge>
                ) : (
                  <Badge className="bg-blue-500">
                    {result.doses_received}/{result.total_doses} เข็ม
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                ID: {result.patient_id} • เข็มแรก: {new Date(result.first_dose_date).toLocaleDateString('th-TH')}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dose History */}
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Syringe className="h-4 w-4" />
                  ประวัติการฉีด
                </h3>
                <div className="space-y-2">
                  {result.all_doses.map((dose, doseIndex) => (
                    <div
                      key={doseIndex}
                      className={`p-3 rounded-lg border ${
                        dose.matches ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {dose.matches ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-yellow-600" />
                          )}
                          <span className="font-medium">เข็มที่ {doseIndex + 1}</span>
                        </div>
                        <div className="text-sm">
                          <span className={dose.matches ? 'text-green-700' : 'text-yellow-700'}>
                            {dose.matches ? '✅ ตรง' : `⚠️ ห่าง ${dose.days_diff > 0 ? '+' : ''}${dose.days_diff} วัน`}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-sm grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">ฉีดจริง:</span>{' '}
                          {new Date(dose.date).toLocaleDateString('th-TH')}
                        </div>
                        <div>
                          <span className="text-muted-foreground">คำนวน:</span>{' '}
                          {new Date(dose.calculated_date).toLocaleDateString('th-TH')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Appointment */}
              {!result.is_completed && (
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    นัดครั้งถัดไป (เข็มที่ {result.doses_received + 1})
                  </h3>
                  <div
                    className={`p-3 rounded-lg border ${
                      result.next_dose_in_system
                        ? result.next_dose_matches
                          ? 'bg-green-50 border-green-200'
                          : 'bg-yellow-50 border-yellow-200'
                        : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">คำนวนจาก vaccine_schedules:</span>{' '}
                        <span className="font-medium">
                          {result.next_dose_calculated ?
                            new Date(result.next_dose_calculated).toLocaleDateString('th-TH') :
                            'N/A'
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">นัดในระบบ:</span>{' '}
                        <span className="font-medium">
                          {result.next_dose_in_system ?
                            new Date(result.next_dose_in_system).toLocaleDateString('th-TH') :
                            'ยังไม่มีนัด'
                          }
                        </span>
                      </div>
                      {result.next_dose_in_system && !result.next_dose_matches && (
                        <div className="pt-2 border-t">
                          <span className="text-yellow-700 font-medium">
                            ⚠️ นัดไม่ตรงกับการคำนวน ควรแก้ไขเป็น {new Date(result.next_dose_calculated!).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                      )}
                      {!result.next_dose_in_system && (
                        <div className="pt-2 border-t">
                          <span className="text-orange-700 font-medium">
                            ⚠️ ควรสร้างนัดในวันที่ {new Date(result.next_dose_calculated!).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {results.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>ไม่มีข้อมูลการฉีดในระบบ</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default AppointmentVerification;
