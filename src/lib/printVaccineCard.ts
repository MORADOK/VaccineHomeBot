/** Dedicated 100 x 62 mm vaccine card on an A4 sheet.
 * Dates come from the existing full-dose schedule; this module never calculates appointments.
 */
export interface PrintableDose {
  dose_number: number;
  appointment_date: string;
  status: 'completed' | 'scheduled' | 'upcoming';
}
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
const formatThaiDate = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const [year, month, day] = date.split('-').map(Number);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year + 543}`;
};
export function printVaccineCard(input: {
  patientName: string;
  vaccineName: string;
  vaccineType?: string;
  hn?: string;
  doses: PrintableDose[];
}) {
  if (!input.doses.length) {
    window.alert('ไม่พบตารางนัดสำหรับพิมพ์ โปรดตรวจสอบข้อมูลวัคซีน');
    return;
  }
  // Dose counts and dates come from the existing patient-specific schedule.
  if (input.doses.length > 7) {
    window.alert('ตารางนัดมีมากกว่า 7 เข็ม ไม่สามารถพิมพ์ลงบัตรขนาดนี้ได้ครบ โปรดใช้ตารางนัด A4');
    return;
  }
  const rows = input.doses.map((dose) => `<tr>
    <td>ครั้งที่ ${escapeHtml(dose.dose_number)}</td>
    <td>${escapeHtml(formatThaiDate(dose.appointment_date))}</td>
    <td></td>
  </tr>`).join('');
  const base = new URL(import.meta.env.BASE_URL || '/', window.location.href);
  const logo = new URL('images/11570.jpg', base).href;
  const fallbackLogo = new URL('images/home-hospital-logo.svg', base).href;
  const popup = window.open('', '_blank', 'width=850,height=650');
  if (!popup) {
    window.alert('เบราว์เซอร์ปิดกั้นหน้าต่างพิมพ์ โปรดอนุญาต Pop-up แล้วลองอีกครั้ง');
    return;
  }
  popup.document.open();
  popup.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>บัตรนัดฉีดวัคซีน</title>
<style>
@page { size: A4 portrait; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; background: #eef5ef; font-family: Tahoma, "Noto Sans Thai", sans-serif; color: #164a35; }
.sheet { width: 210mm; min-height: 297mm; background: white; padding: 8mm; margin: 0 auto; }
.card { width: 100mm; height: 62mm; border: .3mm solid #a9cdb6; border-radius: 2mm; padding: 2.3mm 3mm;
 position: relative; overflow: hidden; background: linear-gradient(135deg,#fff 76%,#f0faf3); }
.head { display: flex; align-items: center; gap: 2mm; height: 15mm; position: relative; z-index: 1; }
.logo { width: 22mm; height: 13mm; object-fit: contain; }
.titles { display: flex; flex-direction: column; align-items: flex-start; gap: .8mm; }
.title { font-size: 10.5pt; font-weight: bold; background: #087347; color: white; padding: .7mm 4mm; border-radius: 5mm; }
.vaccine { font-size: 7pt; background: #e1f4e8; padding: .5mm 3mm; border-radius: 4mm; font-weight: bold; }
.watermark { position: absolute; right: 4mm; top: 2mm; font-size: 30pt; color: #e9f4ed; opacity: .25; z-index: 0; }
.patient { display: flex; justify-content: space-between; gap: 2mm; font-size: 7.5pt; padding: 2mm 0 1.5mm; white-space: nowrap; }
.patient span:first-child { max-width: 72mm; overflow: hidden; text-overflow: ellipsis; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7.2pt; }
th { background: #d6ecdf; font-weight: bold; }
td, th { border: .2mm solid #c1d9c9; text-align: center; padding: .4mm .8mm; height: 6mm; }
th:first-child { width: 34%; } th:nth-child(2) { width: 33%; } th:last-child { width: 33%; }
.note { position: absolute; bottom: 2mm; left: 3mm; right: 3mm; background: #eaf6ed; border-radius: 2mm;
 font-size: 5.6pt; padding: 1mm 2mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* Reference design: full-width branded header, bold patient band and mint grid. */
.card { border: .35mm solid #087347; border-radius: 1.6mm; padding: 0; background: #fff; }
.head { height: 17mm; padding: 1mm 2mm; gap: 1mm; border-bottom: .25mm solid #087347; background: linear-gradient(110deg,#fff 67%,#e5f7ec); }
.logo { width: 32mm; height: 16mm; }
.titles { flex: 1; align-items: stretch; text-align: center; gap: 1mm; margin-right: 7mm; }
.title { font-size: 11pt; background: #006c43; padding: .8mm 1mm; line-height: 1.25; }
.vaccine { font-size: 8pt; background: #d9f5e6; padding: .6mm 1mm; color: #143d2c; }
.watermark { right: 2mm; top: 1mm; font-size: 29pt; color: #b4dcca; opacity: .55; }
.patient { height: 8mm; align-items: center; padding: 1mm 2mm; font-size: 8pt; font-weight: bold; color: #172d25; }
.patient span:first-child { max-width: 72mm; }
table { font-size: 8pt; color: #1d3027; }
th { background: #d1f2e2; font-size: 8.5pt; color: #064a31; }
td, th { border-color: #77a998; height: 5.5mm; padding: .3mm .7mm; }
.note { bottom: 1.5mm; left: 1.5mm; right: 1.5mm; height: 7mm; display: flex; align-items: center; background: #e6f7ee; border-radius: 1.5mm; font-size: 6.6pt; font-weight: bold; padding: 1mm 2mm; }
.head { height: 19mm; background: linear-gradient(120deg,#fff 55%,#e3f5eb); }
.logo { width: 35mm; height: 17mm; object-fit: contain; }
.titles { margin-right: 13mm; }
.title { font-size: 12pt; font-weight: 900; background: #00643e; }
.vaccine { font-size: 9pt; font-weight: 800; color: #172c22; background: #cceedd; }
.watermark { right: 2mm; top: 1mm; font-size: 32pt; opacity: .45; }
.patient { border-bottom: .2mm solid #087347; font-size: 8.5pt; }
.patient span:last-child { border-left: .2mm solid #087347; padding-left: 2mm; min-width: 23mm; }
th { font-size: 9pt; }
/* Final reference styling: prominent hospital identity, illustrated medical header and clear dose grid. */
.head { height: 19.5mm; padding: .6mm 1.5mm; gap: 1.5mm; background: linear-gradient(150deg,#fff 54%,#d7f2e3); }
.brand { width: 32mm; height: 18mm; flex: 0 0 32mm; overflow: hidden; display: flex; align-items: center; justify-content: flex-start; }
.logo { width: 31mm; max-width: 100%; height: 17mm; flex: 0 0 31mm; object-fit: contain; object-position: center; transform: none; image-rendering: auto; }
.titles { margin: 0 2mm 0 0; gap: .8mm; }
.title { font-size: 12pt; border-radius: 6mm; padding: .8mm .5mm; background: #00683f; }
.vaccine { font-size: 8.8pt; border-radius: 5mm; padding: .7mm .5mm; background: #c7efdb; }
.watermark { display: block; position: absolute; inset: 21mm 5mm 8mm; width: calc(100% - 10mm); height: 31mm; object-fit: contain; opacity: .075; pointer-events: none; z-index: 0; }
.head, .patient, table, .note { position: relative; z-index: 1; }
.note { position: absolute; }
.medical-art { position: absolute; right: .8mm; top: 1mm; width: 17mm; height: 17mm; opacity: .62; }
.patient { height: 8mm; font-size: 8.2pt; }
table { font-size: 8.2pt; }
th { background: #c7efda; font-size: 8.7pt; }
td, th { border-color: #176c4b; }
.note { justify-content: space-between; font-size: 6.6pt; }
.note svg { width: 5mm; height: 5mm; flex: 0 0 5mm; }
.screen-note { margin: 8mm 0; font-size: 11pt; color: #355c46; }
@media print {
  html, body { width: 210mm; min-height: 297mm; margin: 0; background: white !important; }
  .sheet { margin: 0; padding: 8mm; }
  .screen-note { display: none !important; }
  .card, .head, .title, .vaccine, th, .note {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .title { background: #087347 !important; color: #fff !important; }
  .vaccine { background: #e1f4e8 !important; color: #164a35 !important; }
  th { background: #d6ecdf !important; color: #164a35 !important; }
  .note { background: #eaf6ed !important; }
}

</style></head><body><div class="sheet">
<div class="card"><img class="watermark" src="${escapeHtml(logo)}" alt="" aria-hidden="true">
<div class="head"><div class="brand"><img class="logo" src="${escapeHtml(logo)}" onerror="this.onerror=null;this.src=\'${escapeHtml(fallbackLogo)}\'" alt="โรงพยาบาลโฮม"></div>
<div class="titles"><div class="title">บัตรนัดฉีดวัคซีน</div>
<div class="vaccine">${escapeHtml(input.vaccineName || input.vaccineType || 'วัคซีน')}</div></div></div>
<div class="patient"><span>ชื่อ-นามสกุล ${escapeHtml(input.patientName)}</span><span>HN ${escapeHtml(input.hn || '____________')}</span></div>
<table><thead><tr><th>กำหนดการฉีด</th><th>วันที่ฉีด / วันนัด</th><th>ผู้ฉีดวัคซีน</th></tr></thead><tbody>${rows}</tbody></table>
<div class="note"><span><strong>หมายเหตุ :</strong> โปรดมารับวัคซีนตามกำหนด และตรวจสอบวันนัดกับเจ้าหน้าที่</span><svg viewBox="0 0 24 24" fill="none" stroke="#087347" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="17" height="16" rx="2"/><path d="M7 2v6M16 2v6M3 10h17M7 14h3M7 18h3"/><circle cx="18" cy="18" r="5" fill="#e6f7ee"/><path d="M18 15v3l2 1"/></svg></div></div>
<p class="screen-note">ตัวอย่างบัตรนัดด้านบน — ตรวจสอบชื่อ HN และวันนัดก่อนพิมพ์<br><button type="button" id="vaccine-print-button" style="margin-top:12px;padding:10px 20px;background:#087347;color:white;border:0;border-radius:6px;cursor:pointer;font-size:14px">พิมพ์บัตรนัด / บันทึก PDF</button><br>ตั้งค่ากระดาษ A4, Scale 100% (Actual size), ปิด Headers/Footers แล้วพิมพ์หรือตัดตามขอบบัตร 100 × 62 มม.</p>
</div></body></html>`);
  popup.document.close();
  popup.document.getElementById('vaccine-print-button')?.addEventListener('click', () => popup.print());
  popup.focus();
  // Show the actual card in the preview window first. Electron's native Windows
  // print dialog may not provide a thumbnail preview; printing is user-initiated.
  // The visible preview lets staff verify HN and appointment dates beforehand.
}
