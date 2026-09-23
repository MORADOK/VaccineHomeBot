-- Reminder Center: LINE becomes optional; staff can manage phone reminders in-app.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_channel text NOT NULL DEFAULT 'phone',
  ADD COLUMN IF NOT EXISTS reminder_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reminder_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_contacted_by text,
  ADD COLUMN IF NOT EXISTS reminder_note text;

DO $$ BEGIN
  ALTER TABLE public.appointments ADD CONSTRAINT appointments_reminder_channel_check
    CHECK (reminder_channel IN ('phone','line','both','none'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.appointments ADD CONSTRAINT appointments_reminder_status_check
    CHECK (reminder_status IN ('pending','phone_done','line_sent','both_done','unreachable','not_required'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_reminder_center
  ON public.appointments (appointment_date, status, reminder_status);

-- Existing future appointments default to phone workflow unless a LINE reminder was already sent.
UPDATE public.appointments a
SET reminder_channel = CASE
      WHEN EXISTS (SELECT 1 FROM public.appointment_notifications n
                   WHERE n.appointment_id = a.id AND n.status='sent' AND n.line_user_id IS NOT NULL)
        THEN 'line'
      ELSE 'phone'
    END,
    reminder_status = CASE
      WHEN EXISTS (SELECT 1 FROM public.appointment_notifications n
                   WHERE n.appointment_id = a.id AND n.status='sent' AND n.line_user_id IS NOT NULL)
        THEN 'line_sent'
      ELSE 'pending'
    END
WHERE a.status='scheduled'
  AND a.appointment_date >= current_date;
