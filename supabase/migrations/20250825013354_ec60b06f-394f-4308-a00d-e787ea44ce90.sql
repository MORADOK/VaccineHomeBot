-- Test the trigger by updating an appointment to completed
UPDATE appointments 
SET status = 'completed', updated_at = now() 
WHERE appointment_id = 'HOM-448503-rabies';