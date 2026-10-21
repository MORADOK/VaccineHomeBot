-- Hospital number is optional for existing and newly registered patients.
ALTER TABLE public.patient_registrations
  ADD COLUMN IF NOT EXISTS hn text;

COMMENT ON COLUMN public.patient_registrations.hn IS 'Optional hospital number (HN) assigned by the hospital';
