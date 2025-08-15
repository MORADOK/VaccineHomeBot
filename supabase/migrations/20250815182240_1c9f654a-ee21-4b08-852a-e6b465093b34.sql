-- Security fixes for SECURITY DEFINER functions and privilege escalation

-- 1. Fix all SECURITY DEFINER functions to have fixed search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_healthcare_staff(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'healthcare_staff')
  )
$function$;

CREATE OR REPLACE FUNCTION public.calculate_next_dose_date(_patient_tracking_id uuid)
 RETURNS date
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  tracking_record RECORD;
  schedule_record RECORD;
  next_date date;
  interval_days integer;
BEGIN
  -- Get patient tracking record
  SELECT * INTO tracking_record 
  FROM public.patient_vaccine_tracking 
  WHERE id = _patient_tracking_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Get vaccine schedule
  SELECT * INTO schedule_record 
  FROM public.vaccine_schedules 
  WHERE id = tracking_record.vaccine_schedule_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- If completed, no next dose
  IF tracking_record.current_dose >= tracking_record.total_doses THEN
    RETURN NULL;
  END IF;
  
  -- Calculate next dose date
  IF tracking_record.last_dose_date IS NOT NULL THEN
    -- Get interval for current dose
    interval_days := (schedule_record.dose_intervals->>(tracking_record.current_dose - 1))::integer;
    next_date := tracking_record.last_dose_date + interval_days;
  ELSE
    -- First dose can be scheduled immediately
    next_date := CURRENT_DATE;
  END IF;
  
  RETURN next_date;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_contraindications(_vaccine_schedule_id uuid, _patient_conditions jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  schedule_record RECORD;
  contraindications jsonb;
  found_contraindications jsonb := '[]'::jsonb;
  condition text;
BEGIN
  -- Get vaccine schedule
  SELECT * INTO schedule_record 
  FROM public.vaccine_schedules 
  WHERE id = _vaccine_schedule_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "Vaccine schedule not found"}'::jsonb;
  END IF;
  
  contraindications := schedule_record.contraindications;
  
  -- Check each contraindication against patient conditions
  FOR condition IN SELECT jsonb_array_elements_text(contraindications)
  LOOP
    IF _patient_conditions ? condition THEN
      found_contraindications := found_contraindications || jsonb_build_array(condition);
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'has_contraindications', jsonb_array_length(found_contraindications) > 0,
    'contraindications', found_contraindications,
    'vaccine_contraindications', contraindications
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. Remove privilege escalation path - revoke public access to make_user_admin
REVOKE EXECUTE ON FUNCTION public.make_user_admin(uuid) FROM PUBLIC, anon, authenticated;

-- 3. Create a secure admin-only version
CREATE OR REPLACE FUNCTION public.admin_make_user_admin(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Only admins can grant admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Only administrators can grant admin role';
  END IF;

  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (_user_id, 'admin', auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$function$;

-- Grant execute only to authenticated users (will be further restricted by the function logic)
GRANT EXECUTE ON FUNCTION public.admin_make_user_admin(uuid) TO authenticated;

-- 4. Add updated_at triggers to important tables
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patient_vaccine_tracking_updated_at
    BEFORE UPDATE ON public.patient_vaccine_tracking
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vaccine_schedules_updated_at
    BEFORE UPDATE ON public.vaccine_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vaccine_logs_updated_at
    BEFORE UPDATE ON public.vaccine_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();