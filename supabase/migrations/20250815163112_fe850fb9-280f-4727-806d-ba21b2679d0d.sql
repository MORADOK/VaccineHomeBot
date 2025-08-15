-- Add LINE user ID column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN line_user_id TEXT;

-- Create index for better performance
CREATE INDEX idx_appointments_line_user_id ON public.appointments(line_user_id);

-- Add LINE user ID to notifications table reference
ALTER TABLE public.appointment_notifications 
ADD COLUMN line_user_id TEXT;