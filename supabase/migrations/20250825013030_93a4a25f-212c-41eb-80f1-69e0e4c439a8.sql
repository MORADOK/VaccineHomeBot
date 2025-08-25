-- Backfill existing completed appointments to create tracking records
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT DISTINCT
      COALESCE(a.patient_id_number, a.line_user_id) as patient_id,
      a.patient_name,
      lower(a.vaccine_type) as vaccine_type,
      COUNT(*) as dose_count,
      MAX(a.appointment_date) as last_dose_date
    FROM public.appointments a
    WHERE a.status = 'completed'
    GROUP BY COALESCE(a.patient_id_number, a.line_user_id), a.patient_name, lower(a.vaccine_type)
  LOOP
    -- Insert tracking record for each patient-vaccine combination
    INSERT INTO public.patient_vaccine_tracking (
      patient_id,
      patient_name,
      vaccine_schedule_id,
      current_dose,
      total_doses,
      last_dose_date,
      next_dose_due,
      completion_status
    )
    SELECT 
      r.patient_id,
      r.patient_name,
      vs.id,
      r.dose_count,
      vs.total_doses,
      r.last_dose_date,
      CASE 
        WHEN r.dose_count >= vs.total_doses THEN NULL
        ELSE r.last_dose_date + COALESCE(
          (vs.dose_intervals->>LEAST(r.dose_count::text, (jsonb_array_length(vs.dose_intervals) - 1)::text))::integer, 
          30
        )
      END as next_dose_due,
      CASE 
        WHEN r.dose_count >= vs.total_doses THEN 'completed'
        ELSE 'in_progress'
      END as completion_status
    FROM public.vaccine_schedules vs
    WHERE lower(vs.vaccine_type) = r.vaccine_type AND vs.active = true
    ON CONFLICT (patient_id, vaccine_schedule_id) DO UPDATE SET
      current_dose = EXCLUDED.current_dose,
      last_dose_date = EXCLUDED.last_dose_date,
      next_dose_due = EXCLUDED.next_dose_due,
      completion_status = EXCLUDED.completion_status,
      updated_at = now();
  END LOOP;
END $$;