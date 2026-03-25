-- ดู source code ของ function send_line_notification
-- รันใน Supabase SQL Editor

SELECT pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'send_line_notification';
