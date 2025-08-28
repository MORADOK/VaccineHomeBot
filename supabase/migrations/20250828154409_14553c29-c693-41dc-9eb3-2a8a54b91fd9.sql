-- Fix ambiguous column reference in api_next_dose_for_patient function
CREATE OR REPLACE FUNCTION public.api_next_dose_for_patient(_line_user_id text, _vaccine_type text, _as_of date DEFAULT (CURRENT_DATE AT TIME ZONE 'Asia/Bangkok'::text))
 RETURNS TABLE(vaccine_schedule_id uuid, vaccine_name text, vaccine_type text, total_doses integer, doses_received integer, last_dose_date date, next_dose_number integer, recommended_date date, is_booster boolean)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  vs record;
  intervals int[];
  last_date date;
  got int := 0;
  next_num int := null;
  rec_date date := null;
  booster bool := false;
begin
  -- 1) ดึงสเปควัคซีน
  select vs2.id, vs2.vaccine_name, vs2.vaccine_type, vs2.total_doses,
         coalesce(vs2.booster_required,false) as booster_required,
         vs2.booster_interval,
         (
           select array_agg((x)::int order by ord)
           from (
             select ord, (elem)::text::int as x
             from jsonb_array_elements_text(vs2.dose_intervals) with ordinality t(elem, ord)
           ) z
         ) as intervals_arr
  into vs
  from public.vaccine_schedules vs2
  where lower(vs2.vaccine_type) = lower(_vaccine_type) and vs2.active
  limit 1;

  if not found then
    raise exception 'vaccine_type % not found or inactive', _vaccine_type
      using errcode = '22023';
  end if;

  intervals := vs.intervals_arr;

  -- 2) นับเข็มที่ได้รับจาก appointments (done/completed)
  select count(*)::int,
         max(a.appointment_date)::date
  into got, last_date
  from public.appointments a
  where a.line_user_id = _line_user_id
    and lower(a.vaccine_type) = lower(vs.vaccine_type)
    and coalesce(a.status,'') in ('done','completed')
    and a.appointment_date <= _as_of;

  -- 3) คิดเข็มถัดไป
  if got >= coalesce(vs.total_doses,0) then
    -- ครบโดสหลักแล้ว → ดู booster
    if vs.booster_required and vs.booster_interval is not null and last_date is not null then
      next_num := got + 1;
      rec_date := last_date + (vs.booster_interval * interval '1 day');
      booster  := true;
    else
      -- ไม่มีเข็มถัดไปแล้ว
      next_num := null;
      rec_date := null;
      booster  := false;
    end if;
  else
    -- ยังไม่ครบโดสหลัก
    next_num := got + 1;
    if got = 0 then
      -- เข็มแรก: อ้างอิงวันที่ปัจจุบันในโซนเวลาไทย + offset เข็มแรก (มักเป็น 0)
      rec_date := _as_of + coalesce(intervals[1], 0);
    else
      -- เข็มถัดไป = last_date + offset ของเข็มถัดไปจาก intervals
      rec_date := last_date + coalesce(intervals[got+1], 0);
    end if;
    booster := false;
  end if;

  return query
  select
    vs.id::uuid as vaccine_schedule_id,
    vs.vaccine_name,
    vs.vaccine_type,
    vs.total_doses,
    got as doses_received,
    last_date,
    next_num,
    rec_date,
    booster;
end;
$function$