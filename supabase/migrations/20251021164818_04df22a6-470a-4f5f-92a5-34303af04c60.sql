
-- ลบ cron jobs เก่าที่มีปัญหา
SELECT cron.unschedule(2);
SELECT cron.unschedule(4);

-- สร้าง cron job ใหม่สำหรับ notification processor (ทุก 5 นาที)
SELECT cron.schedule(
  'process-notifications',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fljyjbrgfzervxofrilo.supabase.co/functions/v1/notification-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := jsonb_build_object('source', 'cron')
  );
  $$
);

-- อัปเดต job 6 ให้รันบ่อยขึ้น (ทุก 2 นาที แทน 5)
SELECT cron.unschedule(6);
SELECT cron.schedule(
  'notification-processor-main',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://fljyjbrgfzervxofrilo.supabase.co/functions/v1/notification-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsanlqYnJnZnplcnZ4b2ZyaWxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMDE1MDUsImV4cCI6MjA2OTY3NzUwNX0.2_rGfy-3UA4cPnRsg8Lm8uvj9KBCOoz5IhwCbSWYIq4'
    ),
    body := jsonb_build_object('source', 'cron')
  );
  $$
);

-- Grant permissions for notification processing
GRANT ALL ON TABLE notification_jobs TO authenticated;
GRANT ALL ON TABLE notification_jobs TO anon;
GRANT ALL ON TABLE appointment_notifications TO authenticated;
GRANT ALL ON TABLE appointment_notifications TO anon;
