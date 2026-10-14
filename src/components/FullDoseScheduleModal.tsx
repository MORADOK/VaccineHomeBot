import { useState, useEffect } from 'react';
import { addDaysToDateString, getBangkokDateString } from '@/lib/dateOnlyUtils';
import { printVaccineCard } from '@/lib/printVaccineCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { X, Printer, FileText, Calendar, Syringe, AlertCircle, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface NextAppointment {
  id: string;
  patient_id: string;
  patient_name: string;
  vaccine_name?: string;
  vaccine_type?: string;
  current_dose: number;
  total_doses: number;
  next_dose_due: string;
  last_dose_date: string | null;
  first_dose_date?: string | null;
  completion_status: string;
  line_user_id?: string;
  vaccine_schedule_id?: string;
  is_existing_appointment?: boolean;
}

interface FullDoseSchedule {
  dose_number: number;
  appointment_date: string;
  interval_from_previous: number;
  status: 'completed' | 'scheduled' | 'upcoming';
}

interface FullDoseScheduleModalProps {
  appointment: NextAppointment | null;
  isOpen: boolean;
  onClose: () => void;
}

const FullDoseScheduleModal = ({ appointment, isOpen, onClose }: FullDoseScheduleModalProps) => {
  const [scheduleData, setScheduleData] = useState<FullDoseSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [printHN, setPrintHN] = useState('');

  const calculateFullDoseSchedule = async (appt: NextAppointment): Promise<FullDoseSchedule[]> => {
    try {
      console.log('🔍 เริ่มคำนวณตารางนัดครบทุกโดส สำหรับ:', appt.patient_name);
      
      // Get vaccine schedule details
      const { data: schedule } = await supabase
        .from('vaccine_schedules')
        .select('*')
        .eq('id', appt.vaccine_schedule_id)
        .single();

      if (!schedule) {
        console.log('❌ ไม่พบข้อมูล vaccine schedule');
        return [];
      }

      console.log('📊 ข้อมูลวัคซีน:', {
        vaccine_type: schedule.vaccine_type,
        total_doses: schedule.total_doses,
        dose_intervals: schedule.dose_intervals
      });

      // Get all appointments for this patient and vaccine (completed only for accurate calculation)
      const { data: allAppointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id_number', appt.patient_id)
        .eq('vaccine_type', appt.vaccine_type)
        .order('appointment_date', { ascending: true });

      console.log('📅 นัดทั้งหมด:', allAppointments?.length || 0, 'รายการ');

      // Keep dose numbers explicit. Historical courses must not be mixed with
      // the current series (e.g. an old rabies course + a new dose 1 today).
      const completedAppointments = allAppointments?.filter(a => a.status === 'completed') || [];
      const scheduledAppointments = allAppointments?.filter(a => ['scheduled', 'pending'].includes(a.status)) || [];

      const intervals = Array.isArray(schedule.dose_intervals)
        ? schedule.dose_intervals
        : JSON.parse(schedule.dose_intervals?.toString() || '[]');

      const explicitDose1 = completedAppointments
        .filter(a => a.dose_number === 1)
        .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date))[0];

      const currentSeriesStart = explicitDose1?.appointment_date
        || appt.first_dose_date
        || completedAppointments[0]?.appointment_date
        || getBangkokDateString();

      const seriesCompleted = completedAppointments.filter(a =>
        a.appointment_date >= currentSeriesStart &&
        (a.dose_number == null || a.dose_number >= 1)
      );
      const seriesScheduled = scheduledAppointments.filter(a =>
        a.appointment_date >= currentSeriesStart
      );

      console.log('📅 เข็มแรกของคอร์สปัจจุบัน:', currentSeriesStart);
      console.log('✅ completed ในคอร์สปัจจุบัน:', seriesCompleted.length);
      console.log('📆 scheduled ในคอร์สปัจจุบัน:', seriesScheduled.length);
      console.log('⏱️ dose_intervals:', intervals);

      const fullSchedule: FullDoseSchedule[] = [];

      for (let i = 0; i < schedule.total_doses; i++) {
        const doseNumber = i + 1;

        // Standard storage in this project is absolute offsets from dose 1:
        // [0,3,7,14,28] for rabies means D1, D4, D8, D15, D29.
        const hasLeadingZero = Number(intervals[0]) === 0;
        const absoluteOffset = doseNumber === 1
          ? 0
          : Number(hasLeadingZero ? intervals[i] : intervals[i - 1]) || 0;

        let finalDate = addDaysToDateString(currentSeriesStart, absoluteOffset);
        let status: 'completed' | 'scheduled' | 'upcoming' = 'upcoming';

        // Prefer explicit dose_number. Legacy fallback uses chronological order
        // only inside the current series.
        const completedDose =
          seriesCompleted.find(a => a.dose_number === doseNumber) ||
          seriesCompleted.filter(a => a.dose_number == null)[doseNumber - 1];

        if (completedDose) {
          status = 'completed';
          finalDate = completedDose.appointment_date;
        } else {
          const scheduledDose =
            seriesScheduled.find(a => a.dose_number === doseNumber) ||
            (doseNumber === seriesCompleted.length + 1
              ? seriesScheduled.find(a => a.dose_number == null)
              : undefined);

          if (scheduledDose) {
            status = 'scheduled';
            finalDate = scheduledDose.appointment_date;
          }
        }

        const previousOffset = doseNumber <= 1
          ? 0
          : Number(hasLeadingZero
              ? intervals[i - 1]
              : (doseNumber === 2 ? 0 : intervals[i - 2])) || 0;

        fullSchedule.push({
          dose_number: doseNumber,
          appointment_date: finalDate,
          interval_from_previous: doseNumber === 1 ? 0 : absoluteOffset - previousOffset,
          status
        });
      }

      console.log('✅ คำนวณตารางนัดเสร็จสิ้น:', fullSchedule.length, 'โดส');
      fullSchedule.forEach(dose => {
        console.log(`  - โดสที่ ${dose.dose_number}: ${dose.appointment_date} (${dose.status}), ห่าง ${dose.interval_from_previous} วัน`);
      });

      return fullSchedule;
    } catch (error) {
      console.error('Error calculating full dose schedule:', error);
      return [];
    }
  };

  useEffect(() => {
    if (appointment && isOpen) {
      setPrintHN('');
      setLoading(true);
      calculateFullDoseSchedule(appointment)
        .then(data => {
          setScheduleData(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [appointment, isOpen]);

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div>
          {/* Screen Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-xl no-print">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8" />
                <div>
                  <h2 className="text-2xl font-bold">ตารางนัดฉีดวัคซีนครบทุกโดส</h2>
                  <p className="text-purple-100 text-sm mt-1">สำหรับบันทึกและติดตามการฉีดวัคซีน</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Patient Info */}
          <div className="p-6 border-b-2 border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-gray-600">ชื่อผู้ป่วย:</span>
                <p className="text-lg font-bold text-gray-900">{appointment.patient_name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">วัคซีน:</span>
                <p className="text-lg font-bold text-purple-700">{appointment.vaccine_name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">จำนวนโดสทั้งหมด:</span>
                <p className="text-lg font-bold text-purple-700">{appointment.total_doses} โดส</p>
              </div>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
                <span className="ml-3 text-gray-600">กำลังคำนวณตารางนัด...</span>
              </div>
            ) : (
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-purple-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold">โดสที่</th>
                      <th className="px-4 py-3 text-left font-bold">วันที่นัด</th>
                      <th className="px-4 py-3 text-left font-bold">ระยะห่าง (วัน)</th>
                      <th className="px-4 py-3 text-left font-bold">สถานะ</th>
                      <th className="px-4 py-3 text-left font-bold no-print">บันทึกการฉีด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleData.map((dose, index) => (
                      <tr key={index} className={`border-b ${dose.status === 'completed' ? 'bg-green-50' : dose.status === 'scheduled' ? 'bg-blue-50' : 'bg-white'}`}>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <Syringe className="h-4 w-4 text-purple-600" />
                            โดสที่ {dose.dose_number}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-purple-600" />
                            {new Date(dose.appointment_date).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {dose.interval_from_previous === 0 ? '-' : `${dose.interval_from_previous} วัน`}
                        </td>
                        <td className="px-4 py-3">
                          {dose.status === 'completed' && (
                            <Badge className="bg-green-500 text-white border-0">✓ ฉีดแล้ว</Badge>
                          )}
                          {dose.status === 'scheduled' && (
                            <Badge className="bg-blue-500 text-white border-0">📅 มีนัด</Badge>
                          )}
                          {dose.status === 'upcoming' && (
                            <Badge variant="outline" className="border-purple-300 text-purple-700">⏳ รอฉีด</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 no-print">
                          <div className="h-8 border-l-2 border-dashed border-gray-300"></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Notes Section */}
            <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                หมายเหตุสำหรับบุคลากร:
              </h3>
              <ul className="text-sm text-yellow-900 space-y-1 list-disc list-inside">
                <li>โปรดตรวจสอบวันนัดกับผู้ป่วยอีกครั้งก่อนฉีด</li>
                <li>บันทึกวันที่ฉีดจริงในช่อง "บันทึกการฉีด"</li>
                <li>เก็บเอกสารนี้ไว้ในประวัติผู้ป่วย</li>
                <li>กรณีเลื่อนนัด ให้แจ้งผู้ป่วยล่วงหน้า</li>
              </ul>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="p-6 border-t-2 border-gray-200 bg-gray-50 no-print">
            <div className="mb-3 flex items-center gap-3">
              <label htmlFor="vaccine-print-hn" className="text-sm font-medium whitespace-nowrap">HN ผู้ป่วย</label>
              <input
                id="vaccine-print-hn"
                type="text"
                inputMode="text"
                autoComplete="off"
                maxLength={30}
                value={printHN}
                onChange={(event) => setPrintHN(event.target.value)}
                placeholder="กรอก HN สำหรับพิมพ์บัตรนัด"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            {/* Approved 100 x 62 mm card; uses the same scheduleData as this modal. */}
            <Button
              type="button"
              disabled={loading || scheduleData.length === 0}
              onClick={() => printVaccineCard({
                patientName: appointment.patient_name,
                hn: printHN.trim(),
                vaccineName: appointment.vaccine_name || appointment.vaccine_type || 'วัคซีน',
                vaccineType: appointment.vaccine_type,
                doses: scheduleData,
              })}
              className="w-full mb-3 bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <Printer className="h-4 w-4 mr-2" />
              พิมพ์บัตรนัด รพ.โฮม 10 × 6.2 ซม. (บน A4)
            </Button>
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="border-2 hover:bg-gray-100 h-12 px-6"
              >
                ปิด
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullDoseScheduleModal;
