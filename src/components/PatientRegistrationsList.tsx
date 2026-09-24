import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, Phone, Calendar, CheckCircle, RefreshCw, UserPlus, Save } from 'lucide-react';

type Registration = { id:string; full_name:string; phone:string; hospital:string; registration_id:string; source:string; status:string; notes?:string|null; line_user_id?:string|null; created_at:string; updated_at:string };
const normalizePhone=(v:string)=>{const d=v.replace(/\D/g,'');return d.startsWith('66')?`0${d.slice(2)}`:d;};
const makeRegistrationId=()=>`REG-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

export default function PatientRegistrationsList(){
 const [rows,setRows]=useState<Registration[]>([]); const [search,setSearch]=useState(''); const [loading,setLoading]=useState(false); const [saving,setSaving]=useState(false);
 const [name,setName]=useState(''); const [phone,setPhone]=useState(''); const [notes,setNotes]=useState(''); const {toast}=useToast();
 const load=async()=>{setLoading(true);const {data,error}=await supabase.from('patient_registrations').select('*').order('created_at',{ascending:false});setLoading(false);if(error){toast({title:'โหลดข้อมูลไม่สำเร็จ',description:error.message,variant:'destructive'});return;}setRows((data||[]) as unknown as Registration[]);};
 useEffect(()=>{void load();},[]);
 const filtered=useMemo(()=>rows.filter(r=>`${r.full_name} ${r.phone} ${r.registration_id}`.toLowerCase().includes(search.toLowerCase())),[rows,search]);
 const register=async()=>{
  const fullName=name.trim(), normalized=normalizePhone(phone); if(fullName.length<2){toast({title:'กรุณากรอกชื่อ-นามสกุล',variant:'destructive'});return;} if(!/^0[689]\d{8}$/.test(normalized)){toast({title:'เบอร์โทรไม่ถูกต้อง',description:'กรุณากรอกเบอร์มือถือไทย 10 หลัก',variant:'destructive'});return;}
  setSaving(true); try{
   const {data:dup,error:dupErr}=await supabase.from('patient_registrations').select('id,full_name,phone').eq('phone',normalized).limit(1); if(dupErr) throw dupErr;
   if(dup?.length){toast({title:'พบผู้ป่วยที่ใช้เบอร์นี้แล้ว',description:`${dup[0].full_name} • ${dup[0].phone}`,variant:'destructive'});return;}
   const {error}=await supabase.from('patient_registrations').insert({registration_id:makeRegistrationId(),full_name:fullName,phone:normalized,hospital:'โรงพยาบาลโฮม',source:'desktop_staff',status:'confirmed',notes:notes.trim()||null,line_user_id:null} as never); if(error) throw error;
   setName('');setPhone('');setNotes('');toast({title:'ลงทะเบียนผู้ป่วยสำเร็จ',description:'บันทึกเข้าระบบวัคซีนแล้ว'});await load();
  }catch(e:any){toast({title:'ลงทะเบียนไม่สำเร็จ',description:e.message,variant:'destructive'});}finally{setSaving(false);}
 };
 const confirm=async(id:string)=>{const {error}=await supabase.from('patient_registrations').update({status:'confirmed',updated_at:new Date().toISOString()} as never).eq('id',id);if(error)toast({title:'อัปเดตไม่สำเร็จ',description:error.message,variant:'destructive'});else void load();};
 return <div className="space-y-6">
  <Card className="border-green-200"><CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-green-700"/>ลงทะเบียนผู้ป่วยใหม่</CardTitle></CardHeader><CardContent className="space-y-4">
   <div className="grid md:grid-cols-2 gap-4"><div><label className="text-sm font-medium">ชื่อ-นามสกุล *</label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="ชื่อ-นามสกุลผู้ป่วย"/></div><div><label className="text-sm font-medium">เบอร์โทรศัพท์ *</label><Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="08xxxxxxxx" inputMode="tel"/></div></div>
   <div><label className="text-sm font-medium">หมายเหตุ</label><Input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="ข้อมูลเพิ่มเติม (ถ้ามี)"/></div>
   <div className="text-xs text-muted-foreground">ลงทะเบียนผ่านโปรแกรม • ไม่จำเป็นต้องมี LINE • ระบบตรวจเบอร์โทรซ้ำก่อนบันทึก</div>
   <Button onClick={register} disabled={saving}><Save className="h-4 w-4 mr-2"/>{saving?'กำลังบันทึก...':'บันทึกผู้ป่วยใหม่'}</Button>
  </CardContent></Card>
  <Card><CardHeader><div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/>ทะเบียนผู้ป่วย</CardTitle><div className="flex gap-2"><Badge variant="secondary">ทั้งหมด {filtered.length} คน</Badge><Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 mr-1 ${loading?'animate-spin':''}`}/>รีเฟรช</Button></div></div></CardHeader><CardContent>
   <div className="relative mb-4"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} placeholder="ค้นหาชื่อ เบอร์โทร หรือรหัสลงทะเบียน"/></div>
   <div className="space-y-3">{filtered.map(r=><div key={r.id} className="border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{r.full_name}</span><Badge variant="outline">{r.source==='desktop_staff'?'ลงทะเบียนในโปรแกรม':r.source}</Badge><Badge>{r.status}</Badge></div><div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground"><span className="flex items-center gap-1"><Phone className="h-4 w-4"/>{r.phone}</span><span>ID: {r.registration_id}</span><span className="flex items-center gap-1"><Calendar className="h-4 w-4"/>{new Date(r.created_at).toLocaleDateString('th-TH')}</span></div>{r.notes&&<div className="text-sm mt-2">หมายเหตุ: {r.notes}</div>}</div>{r.status==='pending'&&<Button size="sm" onClick={()=>confirm(r.id)}><CheckCircle className="h-4 w-4 mr-1"/>ยืนยัน</Button>}</div>)}</div>
   {!filtered.length&&<div className="py-10 text-center text-muted-foreground">ไม่พบข้อมูลผู้ป่วย</div>}
  </CardContent></Card>
 </div>;
}
