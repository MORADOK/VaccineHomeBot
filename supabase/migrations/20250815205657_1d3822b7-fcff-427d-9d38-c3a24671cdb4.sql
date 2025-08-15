-- Create patient_registrations table for storing patient registration data
CREATE TABLE public.patient_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  hospital TEXT NOT NULL DEFAULT 'โรงพยาบาลโฮม',
  registration_id TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'web_portal',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_registrations ENABLE ROW LEVEL SECURITY;

-- Create policies - allow public to insert their own registrations
CREATE POLICY "Anyone can insert patient registrations" 
ON public.patient_registrations 
FOR INSERT 
WITH CHECK (true);

-- Healthcare staff can view all registrations
CREATE POLICY "Healthcare staff can view patient registrations" 
ON public.patient_registrations 
FOR SELECT 
USING (is_healthcare_staff(auth.uid()));

-- Healthcare staff can update registrations
CREATE POLICY "Healthcare staff can update patient registrations" 
ON public.patient_registrations 
FOR UPDATE 
USING (is_healthcare_staff(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_patient_registrations_updated_at
BEFORE UPDATE ON public.patient_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();