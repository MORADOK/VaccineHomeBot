import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Bell, CalendarDays, CheckCircle, MessageCircle, Phone, PhoneOff, RefreshCw, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type ReminderChannel = 'phone' | 'line' | 'both' | 'none';
type ReminderStatus = 'pending' | 'phone_done' | 'line_sent' | 'both_done' | 'unreachable' | 'not_required';

type Appointment = {
  id: string; patient_name: string; patient_phone: string | null; line_user_id: string | null;
  vaccine_type: string; vaccine_name: string | null; appointment_date: string; appointment_time: string | null;
  status: string | null; reminder_channel: ReminderChannel; reminder_status: ReminderStatus;
  reminder_contacted_at: string | null; reminder_contacted_by: string | null; reminder_note: string | null;
};

const localISODate = (offset = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const thaiDate = (v: string) => new Date(`${v}T00:00:00`).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'});

const AutoNotificationSystem = () => {
  const [rows,setRows] = useState<Appointment[]>([]); const [loading,setLoading]=useState(false); const {toast}=useToast();
  const today=localISODate(0), tomorrow=localISODate(1);

  const load = useCallback(async()=>{
    setLoading(true);
    const {data,error}=await supabase.from('appointments').select('*').in('appointment_date',[today,tomorrow]).eq('status','scheduled').order('appointment_date').order('appointment_time');
    setLoading(false);
    if(error){ toast({title:'โหลดรายการไม่สำเร็จ',description:error.message,variant:'destructive'}); return; }
    setRows((data||[]) as unknown as Appointment[]);
  },[today,tomorrow,toast]);
  useEffect(()=>{void load();},[load]);

  const todayRows=useMemo(()=>rows.filter(x=>x.appointment_date===today),[rows,today]);
  const tomorrowRows=useMemo(()=>rows.filter(x=>x.appointment_date===tomorrow),[rows,tomorrow]);
  const pendingPhone=tomorrowRows.filter(x=>['phone','both'].includes(x.reminder_channel) && !['phone_done','both_done'].includes(x.reminder_status));

  const updateReminder=async(row:Appointment,status:ReminderStatus)=>{
    const {data:{user}}=await supabase.auth.getUser();
    const {error}=await supabase.from('appointments').update({reminder_status:status,reminder_contacted_at:new Date().toISOString(),reminder_contacted_by:user?.email||user?.id||'staff'} as never).eq('id',row.id);
    if(error) toast({title:'บันทึกไม่สำเร็จ',description:error.message,variant:'destructive'}); else {toast({title:'บันทึกสถานะแล้ว'}); void load();}
  };
  const setChannel=async(row:Appointment,channel:ReminderChannel)=>{
    const status:ReminderStatus=channel==='none'?'not_required':'pending';
    const {error}=await supabase.from('appointments').update({reminder_channel:channel,reminder_status:status} as never).eq('id',row.id);
    if(error) toast({title:'เปลี่ยนช่องทางไม่สำเร็จ',description:error.message,variant:'destructive'}); else void load();
  };
  const sendLine=async(row:Appointment)=>{
    if(!row.line_user_id){toast({title:'ส่ง LINE ไม่ได้',description:'ผู้ป่วยรายนี้ไม่มี LINE User ID',variant:'destructive'});return;}
    setLoading(true);
    try{
      const {error}=await supabase.functions.invoke('manual-notification-trigger',{body:{appointmentId:row.id}}); if(error) throw error;
      await supabase.from('appointments').update({reminder_status:row.reminder_channel==='both'?'both_done':'line_sent',reminder_contacted_at:new Date().toISOString()} as never).eq('id',row.id);
      toast({title:'ส่ง LINE แล้ว',description:row.patient_name}); await load();
    }catch(e:any){toast({title:'ส่ง LINE ไม่สำเร็จ',description:e.message,variant:'destructive'});}finally{setLoading(false);}
  };

  const Row=({row,phoneActions=false}:{row:Appointment;phoneActions?:boolean})=>(
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div><div className="font-medium">{row.patient_name}</div><div className="text-sm text-muted-foreground">{row.vaccine_name||row.vaccine_type} • {row.appointment_time?.slice(0,5)||'ไม่ระบุเวลา'} • {row.patient_phone||'ไม่มีเบอร์โทร'}</div></div>
        <div className="flex flex-wrap gap-2"><Badge variant="outline">{row.reminder_channel==='phone'?'โทรศัพท์':row.reminder_channel==='line'?'LINE':row.reminder_channel==='both'?'โทร + LINE':'ไม่แจ้ง'}</Badge><Badge>{row.reminder_status}</Badge></div>
      </div>
      {phoneActions&&<div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={()=>updateReminder(row,row.reminder_channel==='both'&&row.reminder_status==='line_sent'?'both_done':'phone_done')}><Phone className="h-4 w-4 mr-1"/>โทรแจ้งแล้ว</Button>
        <Button size="sm" variant="outline" onClick={()=>updateReminder(row,'unreachable')}><PhoneOff className="h-4 w-4 mr-1"/>ติดต่อไม่ได้</Button>
        {(row.reminder_channel==='line'||row.reminder_channel==='both')&&<Button size="sm" variant="outline" onClick={()=>sendLine(row)} disabled={loading}><MessageCircle className="h-4 w-4 mr-1"/>ส่ง LINE</Button>}
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={row.reminder_channel} onChange={e=>setChannel(row,e.target.value as ReminderChannel)}><option value="phone">โทรศัพท์</option><option value="line">LINE</option><option value="both">โทร + LINE</option><option value="none">ไม่ต้องแจ้ง</option></select>
      </div>}
    </div>
  );

  return <div className="space-y-6">
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5"/>ศูนย์แจ้งเตือนการนัด</CardTitle></CardHeader><CardContent className="space-y-4">
      <Alert><Phone className="h-4 w-4"/><AlertDescription>ค่าเริ่มต้นเป็นการโทรแจ้งล่วงหน้า 1 วัน ส่วน LINE เป็นตัวเลือกของแต่ละนัด เจ้าหน้าที่สามารถบันทึกว่าโทรแล้วหรือติดต่อไม่ได้ได้จากหน้านี้</AlertDescription></Alert>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border rounded-lg p-3"><div className="text-2xl font-bold">{todayRows.length}</div><div className="text-sm text-muted-foreground">นัดฉีดวันนี้</div></div>
        <div className="border rounded-lg p-3"><div className="text-2xl font-bold">{tomorrowRows.length}</div><div className="text-sm text-muted-foreground">นัดพรุ่งนี้</div></div>
        <div className="border rounded-lg p-3"><div className="text-2xl font-bold">{pendingPhone.length}</div><div className="text-sm text-muted-foreground">ต้องโทรวันนี้</div></div>
        <div className="border rounded-lg p-3"><div className="text-2xl font-bold">{tomorrowRows.filter(x=>['phone_done','line_sent','both_done'].includes(x.reminder_status)).length}</div><div className="text-sm text-muted-foreground">แจ้งแล้ว</div></div>
      </div>
      <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 mr-2 ${loading?'animate-spin':''}`}/>รีเฟรช</Button>
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5"/>ต้องแจ้งวันนี้ — นัดวันที่ {thaiDate(tomorrow)}</CardTitle></CardHeader><CardContent className="space-y-3">{tomorrowRows.length?tomorrowRows.map(r=><Row key={r.id} row={r} phoneActions/>):<div className="text-center py-8 text-muted-foreground"><CheckCircle className="h-10 w-10 mx-auto mb-2"/>ไม่มีนัดที่ต้องแจ้งสำหรับพรุ่งนี้</div>}</CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5"/>ผู้ป่วยนัดฉีดวันนี้ — {thaiDate(today)}</CardTitle></CardHeader><CardContent className="space-y-3">{todayRows.length?todayRows.map(r=><Row key={r.id} row={r}/>):<div className="text-center py-8 text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-2"/>วันนี้ไม่มีผู้ป่วยนัดฉีดวัคซีน</div>}</CardContent></Card>
  </div>;
};
export default AutoNotificationSystem;
