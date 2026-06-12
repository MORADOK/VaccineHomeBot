import { useState, useEffect } from 'react';
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

type PrintSize = 'a4-portrait' | 'a4-landscape' | 'a5-portrait' | 'card-small';

const FullDoseScheduleModal = ({ appointment, isOpen, onClose }: FullDoseScheduleModalProps) => {
  const [scheduleData, setScheduleData] = useState<FullDoseSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  // Load saved print size from localStorage or default to 'a4-portrait'
  const [printSize, setPrintSize] = useState<PrintSize>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vaccine-print-size');
      return (saved as PrintSize) || 'a4-portrait';
    }
    return 'a4-portrait';
  });

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
    console.log('🖨️ เริ่มพิมพ์บัตรนัด - ขนาด:', printSize);

    // Get instruction text based on selected size
    const sizeInstructions = {
      'a4-portrait': 'A4 (แนวตั้ง/Portrait)',
      'a4-landscape': 'A4 (แนวนอน/Landscape)',
      'a5-portrait': 'A5 (แนวตั้ง/Portrait)',
      'card-small': 'กำหนดเอง (100x150mm) หรือใกล้เคียง'
    };

    const instruction = sizeInstructions[printSize];

    // Show instruction alert
    const userConfirmed = window.confirm(
      `📋 คำแนะนำการพิมพ์\n\n` +
      `คุณเลือกขนาดกระดาษ: ${getPrintSizeLabel(printSize)}\n\n` +
      `⚠️ เมื่อเปิด Print Dialog โปรด:\n` +
      `1. เลือก "Paper size" หรือ "ขนาดกระดาษ" เป็น: ${instruction}\n` +
      `2. ตรวจสอบ "Margins" หรือ "ระยะขอบ" ตามที่ระบบแนะนำ\n` +
      `3. สำหรับบัตรนัดขนาดเล็ก: อาจต้องตั้งค่า Custom size\n\n` +
      `กด OK เพื่อเปิด Print Dialog`
    );

    if (!userConfirmed) {
      console.log('❌ ผู้ใช้ยกเลิกการพิมพ์');
      return;
    }

    // Apply print size class to body for CSS targeting
    document.body.setAttribute('data-print-size', printSize);

    console.log('✅ ตั้งค่า data-print-size:', document.body.getAttribute('data-print-size'));

    // Trigger print dialog
    window.print();

    // Clean up after print dialog closes
    setTimeout(() => {
      document.body.removeAttribute('data-print-size');
      console.log('🧹 ล้างค่า data-print-size แล้ว');
    }, 100);
  };

  const getPrintSizeLabel = (size: PrintSize) => {
    switch (size) {
      case 'a4-portrait': return 'A4 แนวตั้ง (210x297mm)';
      case 'a4-landscape': return 'A4 แนวนอน (297x210mm)';
      case 'a5-portrait': return 'A5 แนวตั้ง (148x210mm)';
      case 'card-small': return 'บัตรนัดขนาดเล็ก (100x150mm)';
      default: return 'A4 แนวตั้ง';
    }
  };

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Print-friendly styles */}
        <style>{`
          /* @page rules for print size control */
          @page {
            margin: 0;
          }

          /* A4 Portrait */
          @page a4-portrait {
            size: A4 portrait;
            margin: 15mm;
          }

          /* A4 Landscape */
          @page a4-landscape {
            size: A4 landscape;
            margin: 15mm;
          }

          /* A5 Portrait */
          @page a5-portrait {
            size: A5 portrait;
            margin: 10mm;
          }

          /* Card Small (Custom size) */
          @page card-small {
            size: 100mm 150mm;
            margin: 5mm;
          }

          @media print {
            /* Base print styles */
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

            /* Print-only instruction banner */
            .print-instruction {
              display: block !important;
              background: #fef3c7;
              border: 2px solid #f59e0b;
              padding: 10px;
              margin-bottom: 10px;
              text-align: center;
              font-size: 10pt;
              font-weight: bold;
              color: #92400e;
            }

            /* A4 Portrait (210x297mm) - Default */
            body[data-print-size="a4-portrait"] .print-area {
              page: a4-portrait;
              max-width: 210mm;
              font-size: 11pt;
            }
            body[data-print-size="a4-portrait"] table {
              font-size: 10pt;
            }
            body[data-print-size="a4-portrait"] th,
            body[data-print-size="a4-portrait"] td {
              padding: 8px 12px;
            }

            /* A4 Landscape (297x210mm) */
            body[data-print-size="a4-landscape"] .print-area {
              page: a4-landscape;
              max-width: 297mm;
              font-size: 11pt;
            }
            body[data-print-size="a4-landscape"] table {
              font-size: 10pt;
            }
            body[data-print-size="a4-landscape"] th,
            body[data-print-size="a4-landscape"] td {
              padding: 8px 16px;
            }

            /* A5 Portrait (148x210mm) */
            body[data-print-size="a5-portrait"] .print-area {
              page: a5-portrait;
              max-width: 148mm;
              font-size: 9pt;
            }
            body[data-print-size="a5-portrait"] h2 {
              font-size: 16pt;
            }
            body[data-print-size="a5-portrait"] table {
              font-size: 8pt;
            }
            body[data-print-size="a5-portrait"] th,
            body[data-print-size="a5-portrait"] td {
              padding: 6px 8px;
            }
            body[data-print-size="a5-portrait"] .lucide {
              width: 14px;
              height: 14px;
            }

            /* Card Small (100x150mm) - Compact */
            body[data-print-size="card-small"] .print-area {
              page: card-small;
              max-width: 100mm;
              font-size: 7pt;
            }
            body[data-print-size="card-small"] h2 {
              font-size: 12pt;
              margin-bottom: 8px;
            }
            body[data-print-size="card-small"] table {
              font-size: 6.5pt;
            }
            body[data-print-size="card-small"] th,
            body[data-print-size="card-small"] td {
              padding: 4px 6px;
            }
            body[data-print-size="card-small"] .lucide {
              width: 10px;
              height: 10px;
            }
            body[data-print-size="card-small"] .text-sm {
              font-size: 6pt;
            }

            /* Default fallback (if no size specified) - use A4 Portrait */
            body:not([data-print-size]) .print-area {
              page: a4-portrait;
              max-width: 210mm;
            }

            /* Print-only elements visibility */
            .print\\:block {
              display: block !important;
            }

            /* Adjust header sizes for different print sizes */
            body[data-print-size="card-small"] .print-area h1 {
              font-size: 10pt;
              margin-bottom: 4px;
            }
            body[data-print-size="card-small"] .print-area .text-sm,
            body[data-print-size="card-small"] .print-area p.text-sm {
              font-size: 5.5pt;
            }
            body[data-print-size="a5-portrait"] .print-area h1 {
              font-size: 14pt;
            }
          }
        `}</style>

        <div className="print-area">
          {/* Print-only Instruction Banner */}
          <div className="hidden print-instruction">
            ⚠️ คำแนะนำ: โปรดเลือกขนาดกระดาษใน Print Dialog เป็น "{getPrintSizeLabel(printSize)}"
          </div>

          {/* Print-only Header */}
          <div className="hidden print:block border-b-4 border-purple-600 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-purple-900 text-center mb-2">
              ตารางนัดฉีดวัคซีนครบทุกโดส
            </h1>
            <p className="text-center text-gray-600 text-sm">โรงพยาบาลโฮม - VCHome Vaccine Management System</p>
          </div>

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
            {/* Print Size Selector */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Printer className="h-5 w-5 text-purple-600" />
                เลือกขนาดกระดาษสำหรับพิมพ์:
              </label>

              <Select
                value={printSize}
                onValueChange={(value) => {
                  const newSize = value as PrintSize;
                  setPrintSize(newSize);
                  // Save to localStorage for next time
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('vaccine-print-size', newSize);
                  }
                  console.log('📝 เปลี่ยนขนาดกระดาษเป็น:', newSize, '(บันทึกค่าแล้ว)');
                }}
              >
                <SelectTrigger className="w-full bg-white border-2 border-purple-300 hover:border-purple-500 focus:ring-2 focus:ring-purple-500 h-12">
                  <SelectValue placeholder="เลือกขนาดกระดาษ" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="a4-portrait" className="cursor-pointer hover:bg-purple-50">
                    <div className="flex items-center gap-3 py-1">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-semibold">A4 แนวตั้ง</div>
                        <div className="text-xs text-gray-500">210 x 297 mm - มาตรฐาน (แนะนำ)</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="a4-landscape" className="cursor-pointer hover:bg-purple-50">
                    <div className="flex items-center gap-3 py-1">
                      <FileText className="h-5 w-5 rotate-90 text-blue-600" />
                      <div>
                        <div className="font-semibold">A4 แนวนอน</div>
                        <div className="text-xs text-gray-500">297 x 210 mm - ตารางกว้าง</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="a5-portrait" className="cursor-pointer hover:bg-purple-50">
                    <div className="flex items-center gap-3 py-1">
                      <FileText className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-semibold">A5 แนวตั้ง</div>
                        <div className="text-xs text-gray-500">148 x 210 mm - ขนาดกลาง</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="card-small" className="cursor-pointer hover:bg-purple-50">
                    <div className="flex items-center gap-3 py-1">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      <div>
                        <div className="font-semibold">บัตรนัดขนาดเล็ก</div>
                        <div className="text-xs text-gray-500">100 x 150 mm - พกพาสะดวก</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Current Selection Display with Preview */}
              <div className="mt-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <div className="font-semibold text-purple-900">ขนาดที่เลือก:</div>
                      <div className="text-purple-700 font-medium">{getPrintSizeLabel(printSize)}</div>
                    </div>
                    <div className="text-xs text-purple-600">
                      {printSize === 'a4-portrait' && '📄 เหมาะสำหรับพิมพ์เอกสารทั่วไป - แนะนำสำหรับการเก็บในแฟ้ม'}
                      {printSize === 'a4-landscape' && '📐 เหมาะสำหรับตารางกว้างที่มีข้อมูลเยอะ'}
                      {printSize === 'a5-portrait' && '📋 เหมาะสำหรับบันทึกในสมุดหรือแฟ้มขนาดเล็ก'}
                      {printSize === 'card-small' && '🎫 เหมาะสำหรับพกพา แนบสมุดสุขภาพ หรือใส่กระเป๋า'}
                    </div>
                  </div>

                  {/* Visual Size Preview */}
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500">ตัวอย่าง:</div>
                    {printSize === 'a4-portrait' && (
                      <div className="w-12 h-16 bg-white border-2 border-purple-400 rounded shadow-sm"></div>
                    )}
                    {printSize === 'a4-landscape' && (
                      <div className="w-16 h-12 bg-white border-2 border-blue-400 rounded shadow-sm"></div>
                    )}
                    {printSize === 'a5-portrait' && (
                      <div className="w-10 h-14 bg-white border-2 border-green-400 rounded shadow-sm"></div>
                    )}
                    {printSize === 'card-small' && (
                      <div className="w-8 h-12 bg-white border-2 border-orange-400 rounded shadow-sm"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={printSchedule}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all h-12 text-base font-semibold"
              >
                <Printer className="h-5 w-5 mr-2" />
                พิมพ์ตารางนัด ({getPrintSizeLabel(printSize).split(' ')[0]})
              </Button>
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
