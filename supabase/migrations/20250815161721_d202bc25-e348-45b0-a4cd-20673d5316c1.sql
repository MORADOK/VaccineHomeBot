-- Create appointments table for vaccine appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id TEXT UNIQUE NOT NULL,
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  patient_id_number TEXT,
  vaccine_type TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  scheduled_by TEXT DEFAULT 'staff',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create vaccine_logs table for tracking vaccine administration
CREATE TABLE public.vaccine_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  vaccine_type TEXT NOT NULL,
  dose_number INTEGER DEFAULT 1,
  administered_date DATE NOT NULL,
  administered_by TEXT NOT NULL,
  batch_number TEXT,
  side_effects TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create appointment_notifications table for tracking notifications
CREATE TABLE public.appointment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('reminder', 'confirmation', 'cancellation', 'rescheduled')),
  sent_to TEXT NOT NULL, -- phone number or LINE ID
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  message_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccine_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for appointments table (public read/write for staff portal)
CREATE POLICY "Anyone can view appointments" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update appointments" ON public.appointments FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete appointments" ON public.appointments FOR DELETE USING (true);

-- Create policies for vaccine_logs table
CREATE POLICY "Anyone can view vaccine logs" ON public.vaccine_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert vaccine logs" ON public.vaccine_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update vaccine logs" ON public.vaccine_logs FOR UPDATE USING (true);

-- Create policies for appointment_notifications table
CREATE POLICY "Anyone can view notifications" ON public.appointment_notifications FOR SELECT USING (true);
CREATE POLICY "Anyone can insert notifications" ON public.appointment_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update notifications" ON public.appointment_notifications FOR UPDATE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vaccine_logs_updated_at
  BEFORE UPDATE ON public.vaccine_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_patient_name ON public.appointments(patient_name);
CREATE INDEX idx_vaccine_logs_date ON public.vaccine_logs(administered_date);
CREATE INDEX idx_notifications_appointment ON public.appointment_notifications(appointment_id);