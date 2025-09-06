-- Enable pg_cron extension for scheduling jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the notification processor to run every 15 minutes
SELECT cron.schedule(
  'process-notifications',
  '*/15 * * * *', -- every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://fljyjbrgfzervxofrilo.supabase.co/functions/v1/notification-processor',
        headers:='{"Content-Type": "application/json", "cron-secret": "' || current_setting('app.settings.cron_secret', true) || '"}'::jsonb,
        body:='{"source": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- Also create a manual trigger for testing (can be called by staff)
CREATE OR REPLACE FUNCTION public.process_pending_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  -- This function can be called manually by healthcare staff
  -- It will trigger the notification processor
  
  -- Call the notification processor edge function
  SELECT net.http_post(
    url := 'https://fljyjbrgfzervxofrilo.supabase.co/functions/v1/notification-processor',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"source": "manual", "triggered_by": "' || auth.uid()::text || '"}'::jsonb
  ) INTO result;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Notification processor triggered manually',
    'result', result
  );
END;
$function$;