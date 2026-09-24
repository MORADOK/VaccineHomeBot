-- Harden internal vaccine-system data after desktop registration replaced public LINE registration.
-- Keep the existing enum contract: admin / healthcare_staff / patient.

-- Internal patient registrations must no longer accept anonymous inserts.
ALTER TABLE public.patient_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_registrations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert patient registrations" ON public.patient_registrations;
DROP POLICY IF EXISTS "Healthcare staff can view patient registrations" ON public.patient_registrations;
DROP POLICY IF EXISTS "Healthcare staff can update patient registrations" ON public.patient_registrations;
DROP POLICY IF EXISTS "patient_registrations_staff_select" ON public.patient_registrations;
DROP POLICY IF EXISTS "patient_registrations_staff_insert" ON public.patient_registrations;
DROP POLICY IF EXISTS "patient_registrations_staff_update" ON public.patient_registrations;
DROP POLICY IF EXISTS "patient_registrations_admin_delete" ON public.patient_registrations;
CREATE POLICY "patient_registrations_staff_select" ON public.patient_registrations FOR SELECT TO authenticated USING (public.is_healthcare_staff(auth.uid()));
CREATE POLICY "patient_registrations_staff_insert" ON public.patient_registrations FOR INSERT TO authenticated WITH CHECK (public.is_healthcare_staff(auth.uid()));
CREATE POLICY "patient_registrations_staff_update" ON public.patient_registrations FOR UPDATE TO authenticated USING (public.is_healthcare_staff(auth.uid())) WITH CHECK (public.is_healthcare_staff(auth.uid()));
CREATE POLICY "patient_registrations_admin_delete" ON public.patient_registrations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Medical tracking/reminder tables: authenticated healthcare staff only.
ALTER TABLE public.patient_vaccine_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_vaccine_tracking FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notification_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_schedules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_notifications FORCE ROW LEVEL SECURITY;

-- Vaccine reference data is also internal to the staff application.
ALTER TABLE public.vaccine_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccine_schedules FORCE ROW LEVEL SECURITY;

-- Explicitly revoke direct anonymous table access even if a legacy policy is added later.
REVOKE ALL ON TABLE public.patient_registrations FROM anon;
REVOKE ALL ON TABLE public.patient_vaccine_tracking FROM anon;
REVOKE ALL ON TABLE public.notification_schedules FROM anon;
REVOKE ALL ON TABLE public.appointment_notifications FROM anon;
REVOKE ALL ON TABLE public.appointments FROM anon;

-- SECURITY DEFINER helper functions must not be executable by anonymous users.
REVOKE EXECUTE ON FUNCTION public.calculate_next_dose_date(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_next_dose_date(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.check_contraindications(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_contraindications(uuid, jsonb) TO authenticated;

-- Role helper functions are required by RLS, but anonymous clients do not need direct execution.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_healthcare_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_healthcare_staff(uuid) TO authenticated;
