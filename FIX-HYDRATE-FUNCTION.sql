-- Fix: แก้ไข hydrate_appointment_contacts function
-- เปลี่ยน pr.phone → pr.phone_number และ pr.full_name → pr.patient_name
-- รันใน Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.hydrate_appointment_contacts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  r record;
begin
  -- **FIX: ใช้ phone_number และ patient_name แทน phone และ full_name**
  -- พยายามหาโดยเรียงลำดับความเชื่อมั่น: id_number > phone > line_user_id > name
  select pr.phone_number,
         pr.line_user_id,
         pr.patient_name as name
  into r
  from public.patient_registrations pr
  where (NEW.patient_id_number is not null and pr.registration_id = NEW.patient_id_number)
     or (NEW.patient_phone     is not null and pr.phone_number    = NEW.patient_phone)
     or (NEW.line_user_id      is not null and pr.line_user_id    = NEW.line_user_id)
     or (NEW.patient_name      is not null and pr.patient_name ilike NEW.patient_name)
  order by
    (case
       when NEW.patient_id_number is not null and pr.registration_id = NEW.patient_id_number then 4
       when NEW.patient_phone     is not null and pr.phone_number    = NEW.patient_phone     then 3
       when NEW.line_user_id      is not null and pr.line_user_id    = NEW.line_user_id      then 2
       else 1
     end) desc
  limit 1;

  if r is not null then
    NEW.patient_phone := coalesce(NEW.patient_phone, r.phone_number);
    NEW.line_user_id  := coalesce(NEW.line_user_id,  r.line_user_id);
    NEW.patient_name  := coalesce(NEW.patient_name,  r.name);
  end if;

  return NEW;
end $function$;
