import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, Phone, Syringe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Appointment = { id:string; patient_name:string; patient_phone:string|null; vaccine_name:string|null; vaccine_type:string; appointment_date:string; appointment_time:string|null; status:string; reminder_status:string|null };
const localDate=(offset=0)=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};

export default function AppointmentAlertPopup({ onOpenAppointments }:{ onOpenAppointments?:()=>void }) {
 const [rows,setRows]=useState<Appointment[]>([]); const [open,setOpen]=useState(false); const [loading,setLoading]=useState(false);
 const today=useMemo(()=>localDate(),[]), tomorrow=useMemo(()=>localDate(1),[]);
 const load=useCallback(async()=>{setLoading(true);const {data,error}=await supabase.from('appointments').select('id,patient_name,patient_phone,vaccine_name,vaccine_type,appointment_date,appointment_time,status,reminder_status').in('appointment_date',[today,tomorrow]).in('status',['scheduled','pending']).order('appointment_date').order('appointment_time');setLoading(false);if(!error){const list=(data||[]) as unknown as Appointment[];setRows(list);const key=`appointment-alert-${today}`;if(list.length && sessionStorage.getItem(key)!=='seen') setOpen(true);}},[today,tomorrow]);
 useEffect(()=>{void load();},[load]);
 const todayRows=rows.filter(r=>r.appointment_date===today), tomorrowRows=rows.filter(r=>r.appointment_date===tomorrow);
 const close=()=>{sessionStorage.setItem(`appointment-alert-${today}`,'seen');setOpen(false)};
 return <>
  {rows.length>0&&<div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3"><div className="flex items-start gap-2"><AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5"/><div><div className="font-semibold">แจ้งเตือนนัดวัคซีน</div><div className="text-sm text-muted-foreground">วันนี้ {todayRows.length} คน • พรุ่งนี้ {tomorrowRows.length} คน{tomorrowRows.length?' — กรุณาตรวจรายการโทรแจ้งล่วงหน้า':''}</div></div></div><Button size="sm" variant="outline" onClick={()=>setOpen(true)} disabled={loading}><CalendarDays className="h-4 w-4 mr-1"/>ดูรายชื่อ</Button></div>}
  <AlertDialog open={open} onOpenChange={setOpen}><AlertDialogContent className="max-w-2xl"><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><Syringe className="h-5 w-5"/>แจ้งเตือนนัดฉีดวัคซีน</AlertDialogTitle><AlertDialogDescription>ตรวจสอบผู้ป่วยที่มีนัดวันนี้และพรุ่งนี้ก่อนเริ่มงาน</AlertDialogDescription></AlertDialogHeader><div className="max-h-[55vh] overflow-y-auto space-y-4">
   {[['วันนี้',todayRows],['พรุ่งนี้ — ควรโทรแจ้งล่วงหน้า',tomorrowRows]].map(([label,list])=><div key={label as string}><div className="font-semibold mb-2 flex items-center gap-2">{label as string}<Badge variant="secondary">{(list as Appointment[]).length} คน</Badge></div><div className="space-y-2">{(list as Appointment[]).map(r=><div key={r.id} className="border rounded-lg p-3"><div className="font-medium">{r.patient_name}</div><div className="text-sm text-muted-foreground">{r.appointment_time?.slice(0,5)||'ไม่ระบุเวลา'} • {r.vaccine_name||r.vaccine_type}</div><div className="text-sm flex items-center gap-1 mt-1"><Phone className="h-3.5 w-3.5"/>{r.patient_phone||'ไม่มีเบอร์โทร'}{r.appointment_date===tomorrow&&<Badge variant="outline" className="ml-2">{r.reminder_status||'รอโทรแจ้ง'}</Badge>}</div></div>)}{!(list as Appointment[]).length&&<div className="text-sm text-muted-foreground">ไม่มีนัด</div>}</div></div>)}
  </div><AlertDialogFooter><Button variant="outline" onClick={()=>{close();onOpenAppointments?.()}}>ไปหน้าเช็คนัด</Button><AlertDialogAction onClick={close}>รับทราบ</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </>;
}
