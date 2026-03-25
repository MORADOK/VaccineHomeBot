import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { X, Printer, FileText, Calendar, Syringe, AlertCircle, RefreshCw } from 'lucide-react';

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

      // Get only completed appointments for calculation
      const completedAppointments = allAppointments?.filter(a => a.status === 'completed') || [];
      const scheduledAppointments = allAppointments?.filter(a => ['scheduled', 'pending'].includes(a.status)) || [];

      console.log('✅ นัดที่ฉีดแล้ว:', completedAppointments.length, 'รายการ');
      console.log('📆 นัดที่กำหนดไว้:', scheduledAppointments.length, 'รายการ');

      const intervals = Array.isArray(schedule.dose_intervals)
        ? schedule.dose_intervals
        : JSON.parse(schedule.dose_intervals?.toString() || '[]');

      console.log('⏱️ dose_intervals จากฐานข้อมูล:', intervals);
      console.log('⏱️ ประเภทข้อมูล:', typeof intervals, 'เป็น Array:', Array.isArray(intervals));
      console.log('⏱️ ค่าแต่ละตัว:', intervals.map((v, i) => `intervals[${i}] = ${v}`).join(', '));

      const fullSchedule: FullDoseSchedule[] = [];

      // Get first dose date from completed appointments
      const firstDoseDate = appt.first_dose_date ||
        completedAppointments[0]?.appointment_date ||
        new Date().toISOString().split('T')[0];

      console.log('📅 วันที่ฉีดเข็มแรก (first_dose_date):', firstDoseDate);
      console.log('📅 จำนวนโดสทั้งหมด (total_doses):', schedule.total_doses);

      // Calculate each dose date from FIRST dose + individual interval
      const baseFirstDoseDate = new Date(firstDoseDate);

      for (let i = 0; i < schedule.total_doses; i++) {
        const doseNumber = i + 1;
        // ✅ FIX: dose_intervals is CUMULATIVE from first dose
        // intervals[0] = days from first dose to dose 2
        // intervals[1] = days from first dose to dose 3
        // So for dose N, we use intervals[N-2] (not N-1)
        // Dose 1 (i=0) -> 0 days
        // Dose 2 (i=1) -> intervals[0] (e.g. 3 days)
        // Dose 3 (i=2) -> intervals[1] (e.g. 7 days)
        const intervalDays = i === 0 ? 0 : (intervals[i - 1] || 0);

        // Calculate date from first dose + cumulative interval
        const calculatedDate = new Date(baseFirstDoseDate.getTime());
        calculatedDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
        calculatedDate.setDate(baseFirstDoseDate.getDate() + intervalDays);
        
        let finalDate = calculatedDate.toISOString().split('T')[0];
        let status: 'completed' | 'scheduled' | 'upcoming' = 'upcoming';

        // Check if this dose has been completed
        const completedDose = completedAppointments[i];
        if (completedDose) {
          status = 'completed';
          finalDate = completedDose.appointment_date;
          console.log(`✅ โดสที่ ${doseNumber}: ฉีดแล้ว วันที่ ${finalDate}`);
        } else {
          // Check if this dose has a scheduled appointment
          const scheduledDose = scheduledAppointments.find(a => {
            // Find scheduled appointment for this specific dose number
            const dosesSoFar = completedAppointments.length;
            return dosesSoFar + 1 === doseNumber;
          });

          if (scheduledDose) {
            status = 'scheduled';
            finalDate = scheduledDose.appointment_date;
            console.log(`📆 โดสที่ ${doseNumber}: มีนัดแล้ว วันที่ ${finalDate}`);
          } else {
            console.log(`⏳ โดสที่ ${doseNumber}: คำนวณจากเข็มแรก (${firstDoseDate}) + ${intervalDays} วัน = ${finalDate}`);
            console.log(`   🔍 Debug: i=${i}, intervals[${i - 1}]=${intervals[i - 1]}, intervalDays=${intervalDays}`);
          }
        }

        fullSchedule.push({
          dose_number: doseNumber,
          appointment_date: finalDate,
          interval_from_previous: intervalDays,
          status
        });

        console.log(`📌 เพิ่ม โดสที่ ${doseNumber} เข้าตาราง: วันที่ ${finalDate}, ห่าง ${intervalDays} วัน, สถานะ: ${status}`);
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
      setLoading(true);
      calculateFullDoseSchedule(appointment)
        .then(data => {
          setScheduleData(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [appointment, isOpen]);

  const printSchedule = () => {
    window.print();
  };

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Print-friendly styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-area, .print-area * {
              visibility: visible;
            }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        <div className="print-area">
          {/* Header */}
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
          <div className="p-6 border-t-2 border-gray-200 bg-gray-50 flex gap-3 no-print">
            <Button
              onClick={printSchedule}
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-md"
            >
              <Printer className="h-5 w-5 mr-2" />
              พิมพ์ตารางนัด
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="border-2"
            >
              ปิด
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullDoseScheduleModal;
