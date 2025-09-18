-- Fix appointment_notifications table structure
-- Add missing columns and update constraints

-- Add line_user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'appointment_notifications' 
                   AND column_name = 'line_user_id') THEN
        ALTER TABLE public.appointment_notifications 
        ADD COLUMN line_user_id TEXT;
    END IF;
END $$;

-- Update notification_type constraint to include 'overdue'
ALTER TABLE public.appointment_notifications 
DROP CONSTRAINT IF EXISTS appointment_notifications_notification_type_check;

ALTER TABLE public.appointment_notifications 
ADD CONSTRAINT appointment_notifications_notification_type_check 
CHECK (notification_type IN ('reminder', 'confirmation', 'cancellation', 'rescheduled', 'overdue'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_appointment_notifications_appointment_id 
ON public.appointment_notifications(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_notifications_sent_at 
ON public.appointment_notifications(sent_at);

CREATE INDEX IF NOT EXISTS idx_appointment_notifications_type_status 
ON public.appointment_notifications(notification_type, status);

-- Create RLS policies for appointment_notifications
DROP POLICY IF EXISTS "Healthcare staff can view notifications" ON public.appointment_notifications;
DROP POLICY IF EXISTS "Healthcare staff can insert notifications" ON public.appointment_notifications;
DROP POLICY IF EXISTS "Healthcare staff can update notifications" ON public.appointment_notifications;

CREATE POLICY "Healthcare staff can view notifications" 
ON public.appointment_notifications 
FOR SELECT 
USING (is_healthcare_staff(auth.uid()));

CREATE POLICY "Healthcare staff can insert notifications" 
ON public.appointment_notifications 
FOR INSERT 
WITH CHECK (is_healthcare_staff(auth.uid()));

CREATE POLICY "Healthcare staff can update notifications" 
ON public.appointment_notifications 
FOR UPDATE 
USING (is_healthcare_staff(auth.uid()));

-- Allow service role to manage notifications (for functions)
CREATE POLICY "Service role can manage notifications" 
ON public.appointment_notifications 
FOR ALL 
USING (auth.role() = 'service_role');