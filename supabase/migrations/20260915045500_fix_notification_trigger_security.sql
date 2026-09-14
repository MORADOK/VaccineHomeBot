-- Fix appointment creation rollback caused by notification trigger RLS
-- and remove duplicate enqueue trigger.

ALTER FUNCTION public.send_line_notification()
  SECURITY DEFINER;

ALTER FUNCTION public.send_line_notification()
  SET search_path = 'public';

DROP TRIGGER IF EXISTS enqueue_appointment_notifications_trigger
  ON public.appointments;

-- Keep the canonical trigger only.
DROP TRIGGER IF EXISTS tr_enqueue_appointment_notifications
  ON public.appointments;

CREATE TRIGGER tr_enqueue_appointment_notifications
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_appointment_notifications();
