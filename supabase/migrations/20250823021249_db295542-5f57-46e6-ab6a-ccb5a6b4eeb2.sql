-- Fix Security Issues: Remove SECURITY DEFINER view and fix function search paths

-- 1. Drop the unused vaccine_schedules_rows view that has SECURITY DEFINER
-- This view is not used in the codebase and poses a security risk
DROP VIEW IF EXISTS public.vaccine_schedules_rows;

-- 2. Fix search_path for functions that don't have it set
-- This prevents search path manipulation attacks

ALTER FUNCTION public.api_next_appointments(_line_user_id text, _limit integer)
SET search_path = 'public';

ALTER FUNCTION public.api_next_dose_for_patient(_line_user_id text, _vaccine_type text, _as_of date)
SET search_path = 'public';

ALTER FUNCTION public.api_plan_notifications_for_appt(_appointment_id text, _tz text)
SET search_path = 'public';

ALTER FUNCTION public.api_upsert_appointment(_vaccine_type text, _appointment_id text, _line_user_id text, _patient_name text, _patient_phone text, _appointment_date date, _appointment_time time, _status text)
SET search_path = 'public';

ALTER FUNCTION public.api_upsert_patient_registration(p_full_name text, p_phone text, p_source text, p_line_user_id text)
SET search_path = 'public';

ALTER FUNCTION public.claim_notification_jobs(_limit integer)
SET search_path = 'public';

ALTER FUNCTION public.enqueue_appointment_notifications()
SET search_path = 'public';

ALTER FUNCTION public.mk_bkk_ts(_date date, _time time)
SET search_path = 'public';

ALTER FUNCTION public.set_updated_at()
SET search_path = 'public';